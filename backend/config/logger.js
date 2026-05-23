/**
 * 日志工具封装
 * 使用Winston实现分级日志记录
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');
const EventEmitter = require('events');
const { config } = require('./env');

// 日志事件发射器，用于实时推送到前端
const logEmitter = new EventEmitter();
logEmitter.setMaxListeners(50);

// 确保日志目录存在
const logDir = path.resolve(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 自定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    
    // 添加元数据
    if (Object.keys(meta).length > 0) {
      log += `\n元数据: ${JSON.stringify(meta, null, 2)}`;
    }
    
    // 添加错误堆栈
    if (stack) {
      log += `\n堆栈: ${stack}`;
    }
    
    return log;
  })
);

// 创建Logger实例
const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports: [
    // 控制台输出(彩色)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    }),
    
    // 所有日志写入combined.log
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5
    }),
    
    // 错误日志单独记录
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 10485760,
      maxFiles: 5
    })
  ]
});

// 添加实时推送Transport（将日志事件发送到SSE客户端）
const RealtimeTransport = class extends winston.Transport {
  log(info, callback) {
    logEmitter.emit('log', {
      timestamp: info.timestamp || new Date().toISOString(),
      level: info.level,
      message: info.message,
      meta: info[Symbol.for('splat')] ? info[Symbol.for('splat')][0] : undefined
    });
    callback();
  }
};
logger.add(new RealtimeTransport({ level: 'info' }));

/**
 * 记录请求日志
 * @param {Object} req - Express请求对象
 * @param {string} taskId - 任务ID
 */
logger.logRequest = function(req, taskId) {
  this.info('收到新请求', {
    method: req.method,
    path: req.path,
    taskId: taskId,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
};

/**
 * 记录任务开始
 * @param {string} taskId - 任务ID
 * @param {Object} params - 任务参数
 */
logger.logTaskStart = function(taskId, params) {
  this.info('任务开始执行', {
    taskId,
    params
  });
};

/**
 * 记录任务完成
 * @param {string} taskId - 任务ID
 * @param {number} duration - 执行耗时(毫秒)
 */
logger.logTaskComplete = function(taskId, duration) {
  this.info('任务执行完成', {
    taskId,
    duration: `${duration}ms`,
    durationSeconds: `${(duration / 1000).toFixed(2)}s`
  });
};

/**
 * 记录任务失败
 * @param {string} taskId - 任务ID
 * @param {Error} error - 错误对象
 */
logger.logTaskError = function(taskId, error) {
  this.error('任务执行失败', {
    taskId,
    error: error.message,
    stack: error.stack
  });
};

/**
 * 记录Agent执行
 * @param {string} taskId - 任务ID
 * @param {string} agentName - Agent名称
 * @param {string} status - 状态
 */
logger.logAgent = function(taskId, agentName, status) {
  this.info(`Agent执行 - ${agentName}`, {
    taskId,
    agent: agentName,
    status
  });
};

/**
 * 记录数据库操作
 * @param {string} operation - 操作类型
 * @param {Object} details - 操作详情
 */
logger.logDatabase = function(operation, details) {
  this.info(`数据库操作 - ${operation}`, details);
};

module.exports = logger;
module.exports.emitter = logEmitter;
