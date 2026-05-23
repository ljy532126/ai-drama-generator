/**
 * 短剧数据模型
 * 定义MongoDB中短剧文档的结构和字段
 */

const mongoose = require('mongoose');

/**
 * 短剧Schema定义
 */
const dramaSchema = new mongoose.Schema({
  // 任务唯一ID
  taskId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // 任务状态: pending(等待), processing(处理中), completed(完成), failed(失败)
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'continue_processing'],
    default: 'pending',
    index: true
  },

  // 用户输入信息
  userInput: {
    theme: String,        // 短剧题材
    keywords: String,     // 关键词
    genre: String,        // 类型(悬疑/爱情/科幻等)
    style: String,        // 风格
    provider: String      // LLM厂商
  },

  // 生成内容
  generatedContent: {
    // 第一步:故事大纲
    outline: {
      content: String,
      timestamp: Date
    },

    // 第二步:人物角色设定
    characters: {
      content: String,
      timestamp: Date
    },

    // 第三步:三幕式剧情结构
    structure: {
      content: String,
      timestamp: Date
    },

    // 第四步:完整第一集剧本
    script: {
      content: String,
      timestamp: Date
    },

    // 第五步:分镜表+AI绘图提示词
    storyboard: {
      content: String,
      timestamp: Date
    }
  },

  // 多集支持：续写产生的后续集数
  episodes: [{
    episodeNumber: { type: Number, required: true },
    script: { type: String, default: '' },
    storyboard: { type: String, default: '' },
    prompt: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
  }],

  // 当前执行进度(1-5,对应五个Agent)
  currentStep: {
    type: Number,
    default: 0,
    min: 0,
    max: 6
  },

  // 错误信息
  error: {
    message: String,
    stack: String,
    timestamp: Date
  },

  // 执行耗时(毫秒)
  executionTime: {
    type: Number,
    default: 0
  },

  // 用户信息(预留字段,后续扩展登录功能)
  userId: {
    type: String,
    index: true
  },

  // IP地址
  ipAddress: String,

  // 用户代理
  userAgent: String,

  // 解析后的用户设备信息
  parsedUA: {
    browser: String,
    browserVersion: String,
    os: String,
    osVersion: String,
    device: String
  },

  // 地理位置信息
  geo: {
    country: String,
    region: String,
    city: String
  }

}, {
  // 自动添加createdAt和updatedAt时间戳
  timestamps: true
});

/**
 * 索引优化
 */
dramaSchema.index({ createdAt: -1 }); // 按创建时间倒序查询
dramaSchema.index({ status: 1, createdAt: -1 }); // 按状态和时间查询

/**
 * 实例方法:更新任务状态
 */
dramaSchema.methods.updateStatus = function(status) {
  this.status = status;
  return this.save();
};

/**
 * 实例方法:更新步骤进度
 */
dramaSchema.methods.updateStep = function(step, content) {
  this.currentStep = step;
  
  const stepNames = ['outline', 'characters', 'structure', 'script', 'storyboard'];
  const stepName = stepNames[step - 1];
  
  if (stepName) {
    this.generatedContent[stepName] = {
      content: content,
      timestamp: new Date()
    };
  }
  
  return this.save();
};

/**
 * 实例方法:标记任务失败
 */
dramaSchema.methods.markFailed = function(error) {
  this.status = 'failed';
  this.error = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date()
  };
  return this.save();
};

/**
 * 实例方法:标记任务完成
 */
dramaSchema.methods.markCompleted = function(executionTime) {
  this.status = 'completed';
  this.executionTime = executionTime;
  this.currentStep = 5;
  return this.save();
};

/**
 * 静态方法:根据任务ID查询
 */
dramaSchema.statics.findByTaskId = function(taskId) {
  return this.findOne({ taskId });
};

/**
 * 静态方法:获取历史记录列表
 */
dramaSchema.statics.getHistory = function(limit = 20, skip = 0) {
  return this.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .select('-__v'); // 排除版本字段
};

/**
 * 静态方法:统计数据
 */
dramaSchema.statics.getStats = async function() {
  const total = await this.countDocuments();
  const completed = await this.countDocuments({ status: 'completed' });
  const failed = await this.countDocuments({ status: 'failed' });
  const processing = await this.countDocuments({ status: 'processing' });
  
  return {
    total,
    completed,
    failed,
    processing,
    successRate: total > 0 ? ((completed / total) * 100).toFixed(2) : 0
  };
};

// 创建并导出模型
const Drama = mongoose.model('Drama', dramaSchema);

module.exports = Drama;
