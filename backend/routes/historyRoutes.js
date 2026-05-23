/**
 * 历史记录路由
 * 处理历史任务查询相关的API请求
 */

const express = require('express');
const Drama = require('../models/Drama');
const logger = require('../config/logger');
const { asyncHandler, AppError, ErrorTypes } = require('../middleware/errorHandler');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/history
 * 获取历史记录列表(分页)
 */
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  // 查询条件 — 自动按当前用户过滤
  const query = { userId: req.user._id.toString() };

  // 按状态筛选
  if (req.query.status) {
    query.status = req.query.status;
  } else {
    // 默认不显示 continue_processing (内部状态)
    query.status = { $ne: 'continue_processing' };
  }

  // 查询总数
  const total = await Drama.countDocuments(query);

  // 查询列表
  const dramas = await Drama.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .select('taskId status userInput currentStep episodes createdAt updatedAt executionTime');

  logger.info('历史记录查询', {
    page,
    limit,
    total,
    returned: dramas.length
  });

  res.json({
    success: true,
    data: {
      list: dramas,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  });
}));

/**
 * GET /api/history/:taskId
 * 获取单个历史记录详情
 */
router.get('/:taskId', requireAuth, asyncHandler(async (req, res) => {
  const { taskId } = req.params;

  const drama = await Drama.findByTaskId(taskId);

  if (!drama) {
    throw new AppError('记录不存在', 404, ErrorTypes.NOT_FOUND);
  }

  if (drama.userId && drama.userId !== req.user._id.toString()) {
    throw new AppError('无权访问该记录', 403, ErrorTypes.AUTHORIZATION);
  }

  // 构建完整响应
  const response = {
    success: true,
    data: {
      taskId: drama.taskId,
      status: drama.status,
      currentStep: drama.currentStep,
      userInput: drama.userInput,
      generatedContent: {},
      executionTime: drama.executionTime,
      createdAt: drama.createdAt,
      updatedAt: drama.updatedAt
    }
  };

  // 添加生成内容
  if (drama.generatedContent) {
    response.data.generatedContent = {
      outline: drama.generatedContent.outline?.content || null,
      characters: drama.generatedContent.characters?.content || null,
      structure: drama.generatedContent.structure?.content || null,
      script: drama.generatedContent.script?.content || null,
      storyboard: drama.generatedContent.storyboard?.content || null
    };
  }

  // 添加错误信息
  if (drama.error) {
    response.data.error = drama.error;
  }

  // 添加续集
  response.data.episodes = (drama.episodes || []).map(ep => ({
    episodeNumber: ep.episodeNumber,
    script: ep.script,
    storyboard: ep.storyboard,
    createdAt: ep.createdAt
  }));

  res.json(response);
}));

/**
 * GET /api/history/stats/summary
 * 获取统计概览
 */
router.get('/stats/summary', requireAuth, asyncHandler(async (req, res) => {
  const stats = await Drama.getStats();

  // 最近24小时统计
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentCount = await Drama.countDocuments({
    createdAt: { $gte: oneDayAgo }
  });

  // 平均执行时间
  const completedDramas = await Drama.find({ 
    status: 'completed',
    executionTime: { $exists: true, $gt: 0 }
  }).select('executionTime');

  const avgExecutionTime = completedDramas.length > 0
    ? Math.round(
        completedDramas.reduce((sum, d) => sum + d.executionTime, 0) / completedDramas.length
      )
    : 0;

  res.json({
    success: true,
    data: {
      ...stats,
      recentCount,
      avgExecutionTime,
      avgExecutionSeconds: (avgExecutionTime / 1000).toFixed(2)
    }
  });
}));

/**
 * DELETE /api/history/clear-old
 * 清理旧记录(超过30天的已完成任务)
 */
router.delete('/clear-old', asyncHandler(async (req, res) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const result = await Drama.deleteMany({
    status: { $in: ['completed', 'failed'] },
    createdAt: { $lt: thirtyDaysAgo }
  });

  logger.info('清理旧记录', {
    deletedCount: result.deletedCount
  });

  res.json({
    success: true,
    message: `已清理${result.deletedCount}条旧记录`,
    data: {
      deletedCount: result.deletedCount
    }
  });
}));

module.exports = router;
