/**
 * MongoDB数据库连接配置
 * 负责数据库连接、断开和状态监听
 */

const mongoose = require('mongoose');
const { config } = require('./env');
const logger = require('./logger');

let mongoServer = null;

/**
 * 连接MongoDB数据库
 * @returns {Promise<void>}
 */
async function connectDatabase() {
  try {
    logger.info('正在连接MongoDB数据库...', {
      uri: config.database.uri.replace(/\/\/.*@/, '//*****@')
    });

    await mongoose.connect(config.database.uri, config.database.options);

    logger.info('MongoDB数据库连接成功', {
      database: mongoose.connection.name,
      host: mongoose.connection.host,
      port: mongoose.connection.port
    });

    setupEventListeners();

  } catch (error) {
    logger.warn('外部MongoDB连接失败, 尝试启动嵌入式MongoDB...');

    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongoServer = await MongoMemoryServer.create();
      const uri = mongoServer.getUri();

      await mongoose.connect(uri, config.database.options);

      logger.info('嵌入式MongoDB启动成功', {
        uri: uri.replace(/\/\/.*@/, '//*****@'),
        database: mongoose.connection.name
      });

      setupEventListeners();
    } catch (embeddedError) {
      logger.error('嵌入式MongoDB启动也失败', {
        error: embeddedError.message,
        stack: embeddedError.stack
      });
      process.exit(1);
    }
  }
}

/**
 * 断开数据库连接
 * @returns {Promise<void>}
 */
async function disconnectDatabase() {
  try {
    await mongoose.connection.close();
    if (mongoServer) {
      await mongoServer.stop();
      mongoServer = null;
    }
    logger.info('MongoDB数据库已断开连接');
  } catch (error) {
    logger.error('断开数据库连接失败', {
      error: error.message
    });
  }
}

/**
 * 设置数据库事件监听器
 */
function setupEventListeners() {
  // 连接断开
  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB数据库连接已断开');
  });

  // 连接错误
  mongoose.connection.on('error', (error) => {
    logger.error('MongoDB数据库连接错误', {
      error: error.message
    });
  });

  // 重新连接
  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB数据库已重新连接');
  });

  // 进程退出时关闭连接
  process.on('SIGINT', async () => {
    await disconnectDatabase();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await disconnectDatabase();
    process.exit(0);
  });
}

/**
 * 获取数据库连接状态
 * @returns {string} - 连接状态
 */
function getDatabaseStatus() {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  return states[mongoose.connection.readyState] || 'unknown';
}

module.exports = {
  connectDatabase,
  disconnectDatabase,
  getDatabaseStatus,
  mongoose
};
