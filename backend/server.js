/**
 * AI短剧生成平台 - 主服务入口
 * Express服务器配置和启动
 */

const express = require('express');
const path = require('path');
const { config, validateConfig } = require('./config/env');
const { connectDatabase, getDatabaseStatus } = require('./config/database');
const logger = require('./config/logger');
const corsMiddleware = require('./middleware/cors');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

// 导入路由
const dramaRoutes = require('./routes/dramaRoutes');
const historyRoutes = require('./routes/historyRoutes');
const logRoutes = require('./routes/logRoutes');

/**
 * 初始化Express应用
 */
const app = express();

/**
 * 中间件配置
 */
// 跨域配置
app.use(corsMiddleware);

// JSON解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务(前端页面)
const frontendDist = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDist));
app.use(express.static(path.join(__dirname, '../frontend/public')));

// 上传文件静态服务
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 请求日志中间件
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('HTTP请求', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });
  });
  
  next();
});

/**
 * API路由
 */
// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'AI短剧生成平台运行正常',
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: getDatabaseStatus(),
      environment: config.server.env,
      llmProvider: config.llm.provider,
      version: require('../package.json').version
    }
  });
});

// LLM连通性测试
app.get('/api/llm-test', async (req, res) => {
  const { testLLMConnection } = require('./services/llmFactory');
  const provider = req.query.provider || config.llm.provider;
  try {
    const ok = await testLLMConnection(provider);
    res.json({ success: true, data: { provider, connected: ok } });
  } catch (error) {
    res.json({ success: true, data: { provider, connected: false, error: error.message } });
  }
});

// 短剧生成相关路由
app.use('/api/drama', dramaRoutes);

// 用户认证路由
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

// 管理员路由
const adminRoutes = require('./routes/adminRoutes');
app.use('/api/admin', adminRoutes);

// Key管理路由 (用户 + 管理员)
const keyRoutes = require('./routes/keyRoutes');
app.use('/api/keys', keyRoutes);
app.use('/api/admin', keyRoutes);

// 数据分析路由
const analyticsRoutes = require('./routes/analyticsRoutes');
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', analyticsRoutes);

// AI聊天路由
const chatRoutes = require('./routes/chatRoutes');
app.use('/api/chat', chatRoutes);

// 图片生成路由
const imageRoutes = require('./routes/imageRoutes');
app.use('/api/image', imageRoutes);

// 视频生成路由
const videoRoutes = require('./routes/videoRoutes');
app.use('/api/video', videoRoutes);

// 历史记录相关路由
app.use('/api/history', historyRoutes);

// 日志实时流路由
app.use('/api/logs', logRoutes);

// SPA fallback — 非API路由返回Vue入口（生产模式）
// 本地开发时 frontend/dist 不存在，请通过 Vite dev server (3011端口) 访问
app.get(/^(?!\/api\/).*/, (req, res) => {
  const indexPath = path.join(__dirname, '../frontend/dist/index.html');
  const fs = require('fs');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({
      success: false,
      message: '前端文件未构建。本地开发请访问 http://localhost:3011（Vite dev server），或执行 cd frontend && npm run build 构建前端。'
    });
  }
});

/**
 * 错误处理
 */
// 404处理
app.use(notFoundHandler);

// 全局错误处理
app.use(errorHandler);

/**
 * 启动服务器
 */
async function startServer() {
  try {
    // 验证环境配置
    logger.info('正在验证环境配置...');
    validateConfig();
    logger.info('环境配置验证通过');

    // 连接数据库
    await connectDatabase();

    // 启动HTTP服务
    const PORT = config.server.port;
   app.listen(PORT, () => {
    console.log(`
#  /$$$$$$$$ /$$        /$$$$$$  /$$$$$$$  /$$$$$$ /$$$$$$$$ /$$   /$$ /$$$$$$$$
# | $$_____/| $$       /$$__  $$| $$__  $$|_  $$_/| $$_____/| $$$ | $$|__  $$__/
# | $$      | $$      | $$  \\ $$| $$  \\ $$  | $$  | $$      | $$$$| $$   | $$   
# | $$$$$   | $$      | $$  | $$| $$$$$$$/  | $$  | $$$$$   | $$ $$ $$   | $$   
# | $$__/   | $$      | $$  | $$| $$__  $$  | $$  | $$__/   | $$  $$$$   | $$   
# | $$      | $$      | $$  | $$| $$  \\ $$  | $$  | $$      | $$\\  $$$   | $$   
# | $$      | $$$$$$$$|  $$$$$$/| $$  | $$ /$$$$$$| $$$$$$$$| $$ \\  $$   | $$   
# |__/      |________/ \\______/ |__/  |__/|______/|________/|__/  \\__/   |__/   
    `);
    logger.info('========================================');
    logger.info('🚀 Florient - AI短剧生成平台已启动');
    logger.info('========================================');
    logger.info(`📡 服务地址: http://localhost:${PORT}`);
    logger.info(`🌍 环境模式: ${config.server.env}`);
    logger.info(`🤖 LLM提供商: ${config.llm.provider}`);
    logger.info(`📊 数据库: ${getDatabaseStatus()}`);
    logger.info('========================================');
});

  } catch (error) {
    logger.error('服务器启动失败', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

/**
 * 优雅关闭
 */
process.on('SIGTERM', () => {
  logger.info('收到SIGTERM信号,正在优雅关闭...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('收到SIGINT信号,正在优雅关闭...');
  process.exit(0);
});

/**
 * 未捕获异常处理
 */
process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的Promise拒绝', {
    reason: reason,
    promise: promise
  });
});

// 启动服务器
const { seedAdmin } = require('./scripts/seedAdmin');
startServer().then(() => seedAdmin());

module.exports = app;
