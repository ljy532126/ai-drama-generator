/**
 * 全局错误处理中间件
 * 统一处理和格式化所有错误响应
 */

const logger = require('../config/logger');

/**
 * 错误类型枚举
 */
const ErrorTypes = {
  VALIDATION: 'ValidationError',
  DATABASE: 'DatabaseError',
  AUTHENTICATION: 'AuthenticationError',
  AUTHORIZATION: 'AuthorizationError',
  NOT_FOUND: 'NotFoundError',
  CONFLICT: 'ConflictError',
  INTERNAL: 'InternalServerError'
};

/**
 * 自定义应用错误类
 */
class AppError extends Error {
  constructor(message, statusCode = 500, type = ErrorTypes.INTERNAL) {
    super(message);
    this.statusCode = statusCode;
    this.type = type;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 404错误处理
 */
function notFoundHandler(req, res, next) {
  const error = new AppError(
    `未找到路由: ${req.method} ${req.originalUrl}`,
    404,
    ErrorTypes.NOT_FOUND
  );
  next(error);
}

/**
 * 全局错误处理中间件
 */
function errorHandler(err, req, res, next) {
  // 默认错误信息
  let error = {
    success: false,
    message: err.message || '服务器内部错误',
    type: err.type || ErrorTypes.INTERNAL,
    statusCode: err.statusCode || 500
  };

  // 开发环境返回详细错误信息
  if (process.env.NODE_ENV === 'development') {
    error.stack = err.stack;
    error.details = err;
  }

  // 记录错误日志
  logger.error('请求处理错误', {
    method: req.method,
    path: req.path,
    error: err.message,
    stack: err.stack,
    statusCode: error.statusCode,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  // MongoDB错误处理
  if (err.name === 'MongoError' || err.name === 'MongooseError') {
    error.type = ErrorTypes.DATABASE;
    error.statusCode = 503;
    
    if (err.code === 11000) {
      error.message = '数据重复,该记录已存在';
      error.statusCode = 409;
    }
  }

  // 验证错误处理
  if (err.name === 'ValidationError') {
    error.type = ErrorTypes.VALIDATION;
    error.statusCode = 400;
    
    if (err.errors) {
      const messages = Object.values(err.errors).map(e => e.message);
      error.message = messages.join('; ');
    }
  }

  // JWT错误处理
  if (err.name === 'JsonWebTokenError') {
    error.type = ErrorTypes.AUTHENTICATION;
    error.statusCode = 401;
    error.message = '身份验证失败';
  }

  if (err.name === 'TokenExpiredError') {
    error.type = ErrorTypes.AUTHENTICATION;
    error.statusCode = 401;
    error.message = '登录已过期,请重新登录';
  }

  // 发送错误响应
  res.status(error.statusCode).json(error);
}

/**
 * 异步路由错误包装器
 * 自动捕获异步函数中的错误
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  AppError,
  ErrorTypes,
  notFoundHandler,
  errorHandler,
  asyncHandler
};
