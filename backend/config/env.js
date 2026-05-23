/**
 * 环境变量统一管理模块
 * 负责加载和验证所有环境配置
 */

const dotenv = require('dotenv');
const path = require('path');

// 加载.env文件
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * 环境配置对象
 */
const config = {
  // 服务配置
  server: {
    port: parseInt(process.env.PORT || '3011', 10),
    env: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN || '*'
  },

  // 数据库配置
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_drama',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    }
  },

  // LLM模型配置
  llm: {
    provider: process.env.LLM_PROVIDER || 'openai',
    temperature: parseFloat(process.env.MODEL_TEMPERATURE || '0.7'),
    maxTokens: parseInt(process.env.MODEL_MAX_TOKENS || '4000', 10),
    
    // OpenAI配置
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
    },
    
    // Anthropic配置
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229'
    },
    
    // DeepSeek配置
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY,
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'
    },
    
    // 千问配置
    qwen: {
      apiKey: process.env.QWEN_API_KEY,
      model: process.env.QWEN_MODEL || 'qwen-turbo'
    },
    
    // Gemini配置
    gemini: {
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || 'gemini-pro'
    }
  },

  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || './logs'
  },

  // JWT认证配置
  jwt: {
    secret: process.env.JWT_SECRET || 'ai-drama-generator-default-secret-change-in-production'
  },

  // 任务队列配置
  task: {
    maxConcurrent: parseInt(process.env.MAX_CONCURRENT_TASKS || '5', 10),
    timeout: parseInt(process.env.TASK_TIMEOUT || '300000', 10)
  }
};

/**
 * 验证必要的环境变量
 */
function validateConfig() {
  const errors = [];

  // 验证数据库URI
  if (!config.database.uri) {
    errors.push('MONGODB_URI is required');
  }

  // 验证LLM配置
  const provider = config.llm.provider;
  if (!['openai', 'anthropic', 'deepseek', 'qwen', 'gemini'].includes(provider)) {
    errors.push(`Invalid LLM_PROVIDER: ${provider}`);
  }

  // 验证对应provider的API Key
  const providerConfig = config.llm[provider];
  if (!providerConfig || !providerConfig.apiKey) {
    errors.push(`${provider.toUpperCase()}_API_KEY is required for provider: ${provider}`);
  }

  if (errors.length > 0) {
    throw new Error(`配置验证失败:\n${errors.join('\n')}`);
  }

  return true;
}

// 导出配置和验证函数
module.exports = {
  config,
  validateConfig
};
