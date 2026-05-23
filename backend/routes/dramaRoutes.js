/**
 * 短剧生成路由
 * 处理短剧创作相关的API请求
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Drama = require('../models/Drama');
const { executeDramaWorkflow, executeEpisodeContinuation } = require('../services/agentWorkflow');
const taskQueue = require('../services/taskQueue');
const geoLookup = require('../services/geoLookup');
const logger = require('../config/logger');
const ApiKey = require('../models/ApiKey');
const { asyncHandler, AppError, ErrorTypes } = require('../middleware/errorHandler');
const { requireAuth } = require('../middleware/auth');
const { config } = require('../config/env');
const UAParser = require('ua-parser-js');

const router = express.Router();

/**
 * POST /api/drama/generate
 * 创建新的短剧生成任务
 */
router.post('/generate', requireAuth, asyncHandler(async (req, res) => {
  const { theme, keywords, genre, style, provider } = req.body;

  // 参数验证
  if (!theme || !keywords) {
    throw new AppError('缺少必要参数:题材和关键词不能为空', 400, ErrorTypes.VALIDATION);
  }

  // 确定使用的厂商和Key
  const llmProvider = provider || config.llm.provider;
  let llmOptions = {};
  try {
    const keyDoc = await ApiKey.findForUser(req.user._id, llmProvider);
    if (keyDoc) {
      llmOptions = {
        apiKey: keyDoc.apiKey,
        model: keyDoc.model || undefined,
        baseURL: keyDoc.baseURL || undefined
      };
    }
  } catch (e) {
    // Key查找失败使用默认配置
  }

  // 解析User-Agent
  const ua = req.get('user-agent') || '';
  const parser = new UAParser(ua);
  const uaResult = parser.getResult();

  // 生成唯一任务ID
  const taskId = uuidv4();

  logger.logRequest(req, taskId);

  // IP geo lookup
  const geo = await geoLookup.lookup(req.ip);

  // 创建数据库记录
  const drama = new Drama({
    taskId,
    status: 'pending',
    userId: req.user._id.toString(),
    userInput: {
      theme: theme.trim(),
      keywords: keywords.trim(),
      genre: genre?.trim() || '不限',
      style: style?.trim() || '不限',
      provider: llmProvider
    },
    ipAddress: req.ip,
    userAgent: ua,
    parsedUA: {
      browser: uaResult.browser.name || '',
      browserVersion: uaResult.browser.version || '',
      os: uaResult.os.name || '',
      osVersion: uaResult.os.version || '',
      device: uaResult.device.type || 'desktop'
    },
    geo
  });

  await drama.save();
  logger.logDatabase('create', { taskId, collection: 'dramas' });

  // 异步执行生成任务
  taskQueue.addTask(taskId, async () => {
    try {
      // 更新状态为处理中
      drama.status = 'processing';
      await drama.save();

      logger.logTaskStart(taskId, drama.userInput);
      const startTime = Date.now();

      // 执行LangGraph工作流
      const result = await executeDramaWorkflow(
        taskId,
        drama.userInput,
        async (step, content) => {
          await drama.updateStep(step, content);
        },
        llmProvider,
        llmOptions
      );

      const executionTime = Date.now() - startTime;

      if (result.success) {
        // 更新生成内容
        drama.generatedContent = {
          outline: {
            content: result.result.outline,
            timestamp: new Date()
          },
          characters: {
            content: result.result.characters,
            timestamp: new Date()
          },
          structure: {
            content: result.result.structure,
            timestamp: new Date()
          },
          script: {
            content: result.result.script,
            timestamp: new Date()
          },
          storyboard: {
            content: result.result.storyboard,
            timestamp: new Date()
          }
        };

        await drama.markCompleted(executionTime);
        logger.logTaskComplete(taskId, executionTime);
      } else {
        await drama.markFailed(new Error(result.error));
        logger.logTaskError(taskId, new Error(result.error));
      }

    } catch (error) {
      await drama.markFailed(error);
      logger.logTaskError(taskId, error);
    }
  }).catch(error => {
    // 任务队列添加失败(如重复任务)
    logger.error('任务添加失败', { taskId, error: error.message });
  });

  // 立即返回任务ID给前端
  res.status(202).json({
    success: true,
    message: '任务已创建,正在后台处理',
    data: {
      taskId,
      status: 'pending'
    }
  });
}));

/**
 * POST /api/drama/continue
 * 续写下一集 — 基于已有剧情生成后续集数
 */
router.post('/continue', requireAuth, asyncHandler(async (req, res) => {
  const { taskId, instruction, provider: reqProvider } = req.body;

  if (!taskId) {
    throw new AppError('缺少必要参数: taskId', 400, ErrorTypes.VALIDATION);
  }

  // 加载原始 drama
  const drama = await Drama.findByTaskId(taskId);
  if (!drama) {
    throw new AppError('原剧集不存在', 404, ErrorTypes.NOT_FOUND);
  }
  if (drama.userId && drama.userId !== req.user._id.toString()) {
    throw new AppError('无权操作该任务', 403, ErrorTypes.AUTHORIZATION);
  }
  if (drama.status !== 'completed') {
    throw new AppError('只能续写已完成的剧集', 400, ErrorTypes.VALIDATION);
  }

  const episodeNumber = (drama.episodes || []).length + 2;

  // 确定厂商和Key
  const llmProvider = reqProvider || drama.userInput?.provider || config.llm.provider;
  let llmOptions = {};
  try {
    const keyDoc = await ApiKey.findForUser(req.user._id, llmProvider);
    if (keyDoc) {
      llmOptions = {
        apiKey: keyDoc.apiKey,
        model: keyDoc.model || undefined,
        baseURL: keyDoc.baseURL || undefined
      };
    }
  } catch (e) { /* fallback to defaults */ }

  // 构建上下文
  const context = {
    outline: drama.generatedContent?.outline?.content || '',
    characters: drama.generatedContent?.characters?.content || '',
    structure: drama.generatedContent?.structure?.content || '',
    previousScripts: []
  };

  // 第一集
  if (drama.generatedContent?.script?.content) {
    context.previousScripts.push({ episodeNumber: 1, script: drama.generatedContent.script.content });
  }
  // 后续集数
  for (const ep of (drama.episodes || [])) {
    context.previousScripts.push({ episodeNumber: ep.episodeNumber, script: ep.script });
  }

  // 设置续写中状态
  drama.status = 'continue_processing';
  drama.currentStep = 6; // 续写中
  await drama.save();

  // 异步执行续写
  taskQueue.addTask(`continue-${taskId}-ep${episodeNumber}`, async () => {
    try {
      const result = await executeEpisodeContinuation(
        taskId,
        context,
        episodeNumber,
        instruction || '',
        llmProvider,
        llmOptions
      );

      // 重新加载 drama（可能已被其他请求修改）
      const freshDrama = await Drama.findByTaskId(taskId);
      if (!freshDrama) return;

      if (result.success) {
        freshDrama.episodes = freshDrama.episodes || [];
        freshDrama.episodes.push({
          episodeNumber,
          script: result.result.script,
          storyboard: result.result.storyboard,
          prompt: instruction || '',
          createdAt: new Date()
        });
        freshDrama.status = 'completed';
        freshDrama.currentStep = 5;
        await freshDrama.save();
        logger.logTaskComplete(taskId, 0);
      } else {
        freshDrama.status = 'completed';
        freshDrama.currentStep = 5;
        freshDrama.error = { message: result.error, timestamp: new Date() };
        await freshDrama.save();
        logger.logTaskError(taskId, new Error(result.error));
      }
    } catch (error) {
      const freshDrama = await Drama.findByTaskId(taskId);
      if (freshDrama) {
        freshDrama.status = 'completed';
        freshDrama.currentStep = 5;
        freshDrama.error = { message: error.message, timestamp: new Date() };
        await freshDrama.save();
      }
      logger.logTaskError(taskId, error);
    }
  }).catch(error => {
    logger.error('续写任务添加失败', { taskId, error: error.message });
  });

  res.status(202).json({
    success: true,
    message: `第${episodeNumber}集续写任务已创建，正在后台处理`,
    data: {
      originalTaskId: taskId,
      episodeNumber,
      status: 'continue_processing'
    }
  });
}));

/**
 * GET /api/drama/status/:taskId
 * 查询任务状态和结果
 */
router.get('/status/:taskId', requireAuth, asyncHandler(async (req, res) => {
  const { taskId } = req.params;

  // 从数据库查询
  const drama = await Drama.findByTaskId(taskId);

  if (!drama) {
    throw new AppError('任务不存在', 404, ErrorTypes.NOT_FOUND);
  }

  if (drama.userId && drama.userId !== req.user._id.toString()) {
    throw new AppError('无权访问该任务', 403, ErrorTypes.AUTHORIZATION);
  }

  // 构建响应数据
  const response = {
    success: true,
    data: {
      taskId: drama.taskId,
      status: drama.status === 'continue_processing' ? 'processing' : drama.status,
      currentStep: drama.status === 'continue_processing' ? 6 : drama.currentStep,
      continueStatus: drama.status === 'continue_processing' ? '续写中...' : '',
      userInput: drama.userInput,
      createdAt: drama.createdAt,
      updatedAt: drama.updatedAt
    }
  };

  // 如果任务完成,返回生成内容
  if (drama.status === 'completed') {
    response.data.result = {
      outline: drama.generatedContent.outline?.content || '',
      characters: drama.generatedContent.characters?.content || '',
      structure: drama.generatedContent.structure?.content || '',
      script: drama.generatedContent.script?.content || '',
      storyboard: drama.generatedContent.storyboard?.content || ''
    };
    response.data.episodes = (drama.episodes || []).map(ep => ({
      episodeNumber: ep.episodeNumber,
      script: ep.script,
      storyboard: ep.storyboard,
      createdAt: ep.createdAt
    }));
    response.data.executionTime = drama.executionTime;
  }

  // 如果任务失败,返回错误信息
  if (drama.status === 'failed' && drama.error) {
    response.data.error = {
      message: drama.error.message,
      timestamp: drama.error.timestamp
    };
  }

  res.json(response);
}));

/**
 * GET /api/drama/status/:taskId/download/:section
 * 下载指定任务的指定章节内容
 */
router.get('/status/:taskId/download/:section', requireAuth, asyncHandler(async (req, res) => {
  const { taskId, section } = req.params;
  const format = req.query.format || 'md';

  const validSections = ['outline', 'characters', 'structure', 'script', 'storyboard'];
  if (!validSections.includes(section)) {
    throw new AppError('无效的章节名称', 400, ErrorTypes.VALIDATION);
  }

  const drama = await Drama.findByTaskId(taskId);
  if (!drama) {
    throw new AppError('任务不存在', 404, ErrorTypes.NOT_FOUND);
  }
  if (drama.userId && drama.userId !== req.user._id.toString()) {
    throw new AppError('无权访问该任务', 403, ErrorTypes.AUTHORIZATION);
  }

  const content = drama.generatedContent?.[section]?.content || '';
  const title = section.charAt(0).toUpperCase() + section.slice(1);
  const filename = `${title}_${taskId.slice(0, 8)}.${format}`;

  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(content);
}));

/**
 * GET /api/drama/active-tasks
 * 获取当前用户活跃任务(等待中+处理中)
 */
router.get('/active-tasks', requireAuth, asyncHandler(async (req, res) => {
  const tasks = await Drama.find({
    userId: req.user._id.toString(),
    status: { $in: ['pending', 'processing', 'continue_processing'] }
  }).sort({ createdAt: -1 }).select('taskId status userInput currentStep createdAt');

  res.json({
    success: true,
    data: tasks
  });
}));

/**
 * GET /api/drama/queue-stats
 * 获取任务队列统计信息
 */
router.get('/queue-stats', asyncHandler(async (req, res) => {
  const queueStats = taskQueue.getStats();
  const dbStats = await Drama.getStats();

  res.json({
    success: true,
    data: {
      queue: queueStats,
      database: dbStats
    }
  });
}));

/**
 * DELETE /api/drama/:taskId
 * 删除指定任务记录
 */
router.delete('/:taskId', requireAuth, asyncHandler(async (req, res) => {
  const { taskId } = req.params;

  const drama = await Drama.findByTaskId(taskId);

  if (!drama) {
    throw new AppError('任务不存在', 404, ErrorTypes.NOT_FOUND);
  }

  if (drama.userId && drama.userId !== req.user._id.toString()) {
    throw new AppError('无权删除该任务', 403, ErrorTypes.AUTHORIZATION);
  }

  await Drama.deleteOne({ taskId });
  logger.logDatabase('delete', { taskId, collection: 'dramas' });

  res.json({
    success: true,
    message: '任务已删除',
    data: { taskId }
  });
}));

module.exports = router;
