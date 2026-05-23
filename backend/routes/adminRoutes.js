/**
 * 管理员路由
 * 用户管理、系统统计
 */

const express = require('express');
const User = require('../models/User');
const Drama = require('../models/Drama');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { asyncHandler, AppError, ErrorTypes } = require('../middleware/errorHandler');

const router = express.Router();

// 所有管理员路由需要认证 + 管理员权限
router.use(requireAuth, requireAdmin);

/**
 * GET /api/admin/users
 * 用户列表 (分页, 搜索)
 */
router.get('/users', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  const search = req.query.search || '';

  const query = {};
  if (search) {
    query.$or = [
      { username: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const [users, total] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).select('-passwordHash -__v'),
    User.countDocuments(query)
  ]);

  res.json({
    success: true,
    data: {
      list: users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    }
  });
}));

/**
 * PUT /api/admin/users/:userId
 * 更新用户 (角色, 状态)
 */
router.put('/users/:userId', asyncHandler(async (req, res) => {
  const { role, isActive } = req.body;
  const user = await User.findById(req.params.userId);

  if (!user) {
    throw new AppError('用户不存在', 404, ErrorTypes.NOT_FOUND);
  }

  if (role) user.role = role;
  if (typeof isActive === 'boolean') user.isActive = isActive;
  await user.save();

  res.json({
    success: true,
    data: { user: user.toJSON() }
  });
}));

/**
 * DELETE /api/admin/users/:userId
 * 删除用户及其所有任务
 */
router.delete('/users/:userId', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user) {
    throw new AppError('用户不存在', 404, ErrorTypes.NOT_FOUND);
  }

  // 删除用户的所有任务
  await Drama.deleteMany({ userId: user._id.toString() });
  await User.deleteOne({ _id: user._id });

  res.json({
    success: true,
    message: '用户及关联数据已删除'
  });
}));

/**
 * GET /api/admin/stats
 * 系统统计概览
 */
router.get('/stats', asyncHandler(async (req, res) => {
  const [totalUsers, adminCount, totalDramas, completedDramas, todayDramas, recentUsers] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'admin' }),
    Drama.countDocuments(),
    Drama.countDocuments({ status: 'completed' }),
    Drama.countDocuments({ createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
    User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } })
  ]);

  res.json({
    success: true,
    data: {
      totalUsers,
      adminCount,
      userCount: totalUsers - adminCount,
      totalDramas,
      completedDramas,
      todayDramas,
      recentUsers,
      successRate: totalDramas > 0 ? ((completedDramas / totalDramas) * 100).toFixed(1) : 0
    }
  });
}));

module.exports = router;
