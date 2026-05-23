/**
 * AI 聊天路由
 * 支持多厂商模型切换，自动使用用户配置的Key
 */

const express = require('express');
const ApiKey = require('../models/ApiKey');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler, AppError, ErrorTypes } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * POST /api/chat/send
 * 发送聊天消息，返回AI回复
 */
router.post('/send', requireAuth, asyncHandler(async (req, res) => {
  const { messages, provider, model, baseURL } = req.body;

  if (!messages || !messages.length) {
    throw new AppError('消息不能为空', 400, ErrorTypes.VALIDATION);
  }

  const llmProvider = provider || 'deepseek';

  // 查找用户Key或全局Key
  const keyDoc = await ApiKey.findForUser(req.user._id, llmProvider, 'text');
  if (!keyDoc) {
    throw new AppError(`未配置 ${llmProvider} 的API Key`, 400, ErrorTypes.VALIDATION);
  }

  const apiKey = keyDoc.apiKey;
  const apiBaseURL = baseURL || keyDoc.baseURL || 'https://api.deepseek.com';
  const apiModel = model || keyDoc.model || 'deepseek-chat';

  // 构建OpenAI兼容的请求体（temperature/max_tokens 可选，不传则用厂商默认）
  const body = {
    model: apiModel,
    messages
  };
  if (req.body.temperature !== undefined) body.temperature = req.body.temperature;
  if (req.body.max_tokens !== undefined) body.max_tokens = req.body.max_tokens;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const resp = await fetch(`${apiBaseURL.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new AppError(`AI接口返回错误 (${resp.status}): ${errText}`, resp.status, ErrorTypes.EXTERNAL_API);
    }

    const result = await resp.json();
    const reply = result.choices?.[0]?.message?.content || '';

    res.json({
      success: true,
      data: {
        message: { role: 'assistant', content: reply },
        model: result.model || apiModel,
        usage: result.usage || null
      }
    });
  } catch (e) {
    clearTimeout(timeout);
    if (e instanceof AppError) throw e;
    if (e.name === 'AbortError') {
      throw new AppError('AI响应超时(60s)', 504, ErrorTypes.EXTERNAL_API);
    }
    throw new AppError(`请求AI失败: ${e.message}`, 500, ErrorTypes.EXTERNAL_API);
  }
}));

/**
 * POST /api/chat/models
 * 获取指定厂商的可用模型列表
 */
router.post('/models', requireAuth, asyncHandler(async (req, res) => {
  const { provider, baseURL } = req.body;
  const llmProvider = provider || 'deepseek';

  // 查找Key
  const keyDoc = await ApiKey.findForUser(req.user._id, llmProvider, 'text');
  if (!keyDoc) {
    throw new AppError(`未配置 ${llmProvider} 的API Key`, 400, ErrorTypes.VALIDATION);
  }

  const apiKey = keyDoc.apiKey;
  const apiBaseURL = baseURL || keyDoc.baseURL || 'https://api.deepseek.com';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const resp = await fetch(`${apiBaseURL.replace(/\/+$/, '')}/models`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      throw new AppError(`获取模型列表失败 (${resp.status})`, resp.status, ErrorTypes.EXTERNAL_API);
    }

    const result = await resp.json();
    const models = (result.data || []).map(m => ({
      id: m.id,
      owned_by: m.owned_by || '',
      created: m.created || 0
    }));

    res.json({
      success: true,
      data: {
        models,
        total: models.length
      }
    });
  } catch (e) {
    clearTimeout(timeout);
    if (e instanceof AppError) throw e;
    throw new AppError(`获取模型列表失败: ${e.message}`, 500, ErrorTypes.EXTERNAL_API);
  }
}));

module.exports = router;
