/**
 * CORS跨域配置中间件
 * 处理前后端分离的跨域请求
 */

const cors = require('cors');
const { config } = require('../config/env');

/**
 * CORS配置选项
 */
const corsOptions = {
  origin: function (origin, callback) {
    // 允许的来源
    const allowedOrigins = config.server.corsOrigin === '*' 
      ? true 
      : config.server.corsOrigin.split(',');

    if (allowedOrigins === true) {
      // 允许所有来源
      callback(null, true);
    } else if (!origin || allowedOrigins.includes(origin)) {
      // 允许特定来源
      callback(null, true);
    } else {
      // 拒绝来源
      callback(new Error('不允许的CORS来源'));
    }
  },
  
  // 允许的HTTP方法
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  
  // 允许的请求头
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Task-Id'
  ],
  
  // 允许携带凭证
  credentials: true,
  
  // 预检请求缓存时间(秒)
  maxAge: 86400,
  
  // 暴露的响应头
  exposedHeaders: ['X-Task-Id', 'X-Total-Count']
};

/**
 * 创建CORS中间件
 */
const corsMiddleware = cors(corsOptions);

module.exports = corsMiddleware;
