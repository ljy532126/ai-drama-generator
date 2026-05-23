/**
 * 用户认证路由
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
const multer = require('multer');
const User = require('../models/User');
const { config } = require('../config/env');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler, AppError, ErrorTypes } = require('../middleware/errorHandler');

const router = express.Router();

const avatarStorage = multer.diskStorage({
  destination: path.join(__dirname, '../uploads/avatars'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${req.user._id}-${Date.now()}${ext}`);
  }
});
const upload = multer({ storage: avatarStorage, limits: { fileSize: 2 * 1024 * 1024 }, fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith('image/')) });

function generateToken(userId) {
  return jwt.sign({ userId }, config.jwt.secret, { expiresIn: '7d' });
}

router.post('/register', asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    throw new AppError('用户名、邮箱和密码不能为空', 400, ErrorTypes.VALIDATION);
  }

  if (password.length < 6) {
    throw new AppError('密码至少6个字符', 400, ErrorTypes.VALIDATION);
  }

  const existing = await User.findOne({ $or: [{ email }, { username }] });
  if (existing) {
    const field = existing.email === email ? '邮箱' : '用户名';
    throw new AppError(`该${field}已被注册`, 409, ErrorTypes.VALIDATION);
  }

  const user = new User({
    username,
    email,
    passwordHash: password
  });
  await user.save();

  const token = generateToken(user._id);

  res.status(201).json({
    success: true,
    data: { token, user: user.toJSON() }
  });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const { account, password } = req.body;

  if (!account || !password) {
    throw new AppError('账号和密码不能为空', 400, ErrorTypes.VALIDATION);
  }

  // 支持用户名或邮箱登录
  const user = await User.findOne({
    $or: [{ email: account }, { username: account }]
  });
  if (!user) {
    throw new AppError('账号或密码错误', 401, ErrorTypes.AUTHENTICATION);
  }

  // 检查账号是否被封禁
  if (!user.isActive) {
    throw new AppError('账号已被禁用，请联系管理员', 403, ErrorTypes.AUTHORIZATION);
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new AppError('账号或密码错误', 401, ErrorTypes.AUTHENTICATION);
  }

  const token = generateToken(user._id);

  res.json({
    success: true,
    data: { token, user: user.toJSON() }
  });
}));

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: { user: req.user.toJSON() }
  });
}));

router.put('/change-password', requireAuth, asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw new AppError('当前密码和新密码不能为空', 400, ErrorTypes.VALIDATION);
  }
  if (newPassword.length < 6) {
    throw new AppError('新密码至少6个字符', 400, ErrorTypes.VALIDATION);
  }

  const isMatch = await req.user.comparePassword(oldPassword);
  if (!isMatch) {
    throw new AppError('当前密码错误', 400, ErrorTypes.VALIDATION);
  }

  req.user.passwordHash = newPassword;
  await req.user.save();

  res.json({ success: true, message: '密码修改成功' });
}));

router.put('/profile', requireAuth, asyncHandler(async (req, res) => {
  const { nickname } = req.body;
  if (nickname !== undefined) {
    if (nickname.length > 30) {
      throw new AppError('昵称不能超过30个字符', 400, ErrorTypes.VALIDATION);
    }
    req.user.nickname = nickname.trim();
  }
  await req.user.save();
  res.json({ success: true, data: { user: req.user.toJSON() } });
}));

router.post('/avatar', requireAuth, upload.single('avatar'), asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('请选择图片文件', 400, ErrorTypes.VALIDATION);
  }
  const filename = req.file.filename;
  req.user.avatar = '/uploads/avatars/' + filename;
  await req.user.save();
  res.json({ success: true, data: { avatar: req.user.avatar } });
}));

module.exports = router;
