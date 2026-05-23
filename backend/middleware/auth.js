/**
 * JWT认证中间件
 */

const jwt = require('jsonwebtoken');
const { config } = require('../config/env');
const User = require('../models/User');
const { AppError, ErrorTypes } = require('./errorHandler');

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('请先登录', 401, ErrorTypes.AUTHENTICATION);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    User.findById(decoded.userId)
      .then(user => {
        if (!user) {
          throw new AppError('用户不存在', 401, ErrorTypes.AUTHENTICATION);
        }
        req.user = user;
        next();
      })
      .catch(next);
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw new AppError('无效的登录凭证', 401, ErrorTypes.AUTHENTICATION);
    }
    if (error.name === 'TokenExpiredError') {
      throw new AppError('登录已过期，请重新登录', 401, ErrorTypes.AUTHENTICATION);
    }
    throw error;
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    throw new AppError('需要管理员权限', 403, ErrorTypes.AUTHORIZATION);
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
