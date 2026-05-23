/**
 * API Key 管理路由
 * 支持文本/图片/视频三类模型Key
 */

const express = require('express');
const ApiKey = require('../models/ApiKey');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { asyncHandler, AppError, ErrorTypes } = require('../middleware/errorHandler');

const router = express.Router();

// 各类型可用厂商定义
const PROVIDERS = {
  text: [
    { key: 'openai', label: 'OpenAI', icon: '🤖', models: 'GPT-4o, GPT-4.1, o4-mini', baseURL: 'https://api.openai.com/v1', keyUrl: 'https://platform.openai.com/api-keys', modelList: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'o4-mini', 'o3-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
    { key: 'anthropic', label: 'Anthropic Claude', icon: '🧠', models: 'Claude 4, Claude 3.5', baseURL: 'https://api.anthropic.com', keyUrl: 'https://console.anthropic.com/settings/keys', modelList: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'] },
    { key: 'deepseek', label: 'DeepSeek', icon: '🔍', models: 'DeepSeek-V3, DeepSeek-R1', baseURL: 'https://api.deepseek.com', keyUrl: 'https://platform.deepseek.com/api_keys', modelList: ['deepseek-chat', 'deepseek-reasoner'] },
    { key: 'qwen', label: '阿里通义千问', icon: '☁️', models: 'Qwen3, Qwen-Max, Qwen-Plus', baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1', keyUrl: 'https://dashscope.console.aliyun.com/apiKey', modelList: ['qwen-max', 'qwen-plus', 'qwen-turbo', 'qwen3-235b-a22b', 'qwen3-max', 'qwen3-plus', 'qwen3-flash', 'qwq-32b'] },
    { key: 'gemini', label: 'Google Gemini', icon: '💎', models: 'Gemini 2.5 Pro, Gemini 2.0', baseURL: 'https://generativelanguage.googleapis.com', keyUrl: 'https://aistudio.google.com/app/apikey', modelList: ['gemini-2.5-pro-preview', 'gemini-2.5-flash-preview', 'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'] },
    { key: 'kimi', label: '月之暗面 Kimi', icon: '🌙', models: 'Kimi-K2, Moonshot-v1', baseURL: 'https://api.moonshot.cn/v1', keyUrl: 'https://platform.moonshot.cn/console/api-keys', modelList: ['kimi-k2', 'moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'] },
    { key: 'bytedance', label: '字节跳动豆包', icon: '⚡', models: 'Doubao-Pro, Doubao-Lite', baseURL: 'https://ark.cn-beijing.volces.com/api/v3', keyUrl: 'https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey', modelList: ['doubao-pro-32k', 'doubao-lite-32k', 'doubao-pro-256k', 'deepseek-r1-250120', 'deepseek-v3-241226'] },
    { key: 'zhipu', label: '智谱 GLM', icon: '📐', models: 'GLM-4-Plus, GLM-4-Flash', baseURL: 'https://open.bigmodel.cn/api/paas/v4', keyUrl: 'https://open.bigmodel.cn/usercenter/apikeys', modelList: ['glm-4-plus', 'glm-4-flash', 'glm-4-air', 'glm-4-long', 'glm-4-airx', 'glm-zero-preview'] },
    { key: 'custom', label: '自定义厂商', icon: '🔧', models: '自定义模型', baseURL: '', keyUrl: '', modelList: [] },
  ],
  image: [
    { key: 'bytedance-image', label: '字节即梦', icon: '⚡', models: '即梦 Jimeng', baseURL: 'https://ark.cn-beijing.volces.com/api/v3', keyUrl: 'https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey', modelList: ['jimeng-t2i-v2', 'jimeng-i2i-v2', 'seedream-2.1'] },
    { key: 'qwen-image', label: '阿里通义万相', icon: '☁️', models: 'Qwen-Image 2.0 Pro/Edit + Wanx', baseURL: 'https://dashscope.aliyuncs.com/api/v1', keyUrl: 'https://dashscope.console.aliyun.com/apiKey', modelList: ['qwen-image-2.0-pro', 'qwen-image-2.0', 'qwen-image-edit-max', 'qwen-image-edit-plus', 'qwen-image-edit', 'wanx2.1-t2i-turbo', 'wanx2.1-t2i-plus'] },
    { key: 'custom', label: '自定义厂商', icon: '🔧', models: '自定义模型', baseURL: '', keyUrl: '', modelList: [] },
  ],
  video: [
    { key: 'bytedance-seedance', label: '字节 Seedance', icon: '⚡', models: 'Seedance 2.0, 即梦', baseURL: 'https://ark.cn-beijing.volces.com/api/v3', keyUrl: 'https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey', modelList: ['seedance-2.0', 'jimeng-t2v-v2', 'jimeng-i2v-v2'] },
    { key: 'custom', label: '自定义厂商', icon: '🔧', models: '自定义模型', baseURL: '', keyUrl: '', modelList: [] },
  ]
};

/**
 * GET /api/keys
 * 获取当前用户的Key列表(按类型分组)
 */
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const userKeys = await ApiKey.find({ userId: req.user._id });
  const globalKeys = await ApiKey.find({ isGlobal: true, userId: null, isActive: true });

  const result = {};
  for (const [type, providers] of Object.entries(PROVIDERS)) {
    result[type] = providers.map(p => {
      const userKey = userKeys.find(k => k.provider === p.key && k.type === type);
      const globalKey = globalKeys.find(k => k.provider === p.key && k.type === type);
      return {
        provider: p.key,
        label: p.label,
        icon: p.icon || '',
        models: p.models,
        modelList: p.modelList || [],
        type,
        baseURL: p.baseURL || '',
        keyUrl: p.keyUrl || '',
        isCustom: p.key === 'custom',
        hasUserKey: !!userKey,
        hasGlobalKey: !!globalKey,
        userKey: userKey ? { _id: userKey._id, model: userKey.model, baseURL: userKey.baseURL, isActive: userKey.isActive } : null,
        globalKey: globalKey ? { model: globalKey.model, baseURL: globalKey.baseURL } : null,
        available: !!userKey || !!globalKey
      };
    });
  }

  res.json({ success: true, data: result });
}));

/**
 * POST /api/keys
 * 添加/更新自己的Key
 */
router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { provider, type, apiKey, model, baseURL } = req.body;

  if (!provider || !apiKey) {
    throw new AppError('厂商和API Key不能为空', 400, ErrorTypes.VALIDATION);
  }

  const keyType = type || 'text';

  const key = await ApiKey.findOneAndUpdate(
    { userId: req.user._id, provider, type: keyType },
    { apiKey, model: model || '', baseURL: baseURL || '', type: keyType, isActive: true },
    { upsert: true, new: true }
  );

  res.json({
    success: true,
    data: {
      _id: key._id,
      provider: key.provider,
      type: key.type,
      model: key.model,
      baseURL: key.baseURL,
      isActive: key.isActive
    }
  });
}));

/**
 * DELETE /api/keys/:keyId
 * 删除自己的Key
 */
router.delete('/:keyId', requireAuth, asyncHandler(async (req, res) => {
  const key = await ApiKey.findOne({ _id: req.params.keyId, userId: req.user._id });
  if (!key) {
    throw new AppError('Key不存在', 404, ErrorTypes.NOT_FOUND);
  }
  await ApiKey.deleteOne({ _id: key._id });
  res.json({ success: true, message: 'Key已删除' });
}));

// ============================================
// 管理员全局Key管理
// ============================================

/**
 * GET /api/admin/keys
 * 管理员查看所有全局Key(按类型分组)
 */
router.get('/keys', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const keys = await ApiKey.find({ isGlobal: true });

  const result = {};
  for (const [type, providers] of Object.entries(PROVIDERS)) {
    result[type] = providers.map(p => {
      const key = keys.find(k => k.provider === p.key && k.type === type);
      return {
        provider: p.key,
        label: p.label,
        icon: p.icon || '',
        models: p.models,
        modelList: p.modelList || [],
        type,
        baseURL: p.baseURL || '',
        keyUrl: p.keyUrl || '',
        isCustom: p.key === 'custom',
        configured: !!key,
        key: key ? { _id: key._id, model: key.model, baseURL: key.baseURL, isActive: key.isActive } : null
      };
    });
  }

  res.json({ success: true, data: result });
}));

/**
 * POST /api/admin/keys
 * 管理员设置全局Key
 */
router.post('/keys', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { provider, type, apiKey, model, baseURL } = req.body;

  if (!provider || !apiKey) {
    throw new AppError('厂商和API Key不能为空', 400, ErrorTypes.VALIDATION);
  }

  const keyType = type || 'text';

  const key = await ApiKey.findOneAndUpdate(
    { isGlobal: true, userId: null, provider, type: keyType },
    { apiKey, model: model || '', baseURL: baseURL || '', type: keyType, isActive: true, isGlobal: true },
    { upsert: true, new: true }
  );

  res.json({
    success: true,
    data: {
      _id: key._id,
      provider: key.provider,
      type: key.type,
      model: key.model,
      baseURL: key.baseURL,
      isActive: key.isActive
    }
  });
}));

/**
 * DELETE /api/admin/keys/:keyId
 * 管理员删除全局Key
 */
router.delete('/keys/:keyId', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const key = await ApiKey.findOne({ _id: req.params.keyId, isGlobal: true });
  if (!key) {
    throw new AppError('Key不存在', 404, ErrorTypes.NOT_FOUND);
  }
  await ApiKey.deleteOne({ _id: key._id });
  res.json({ success: true, message: '全局Key已删除' });
}));

/**
 * POST /api/keys/test
 * 测试Key连通性 — 调用 /models 接口验证
 */
router.post('/test', requireAuth, asyncHandler(async (req, res) => {
  const { apiKey, baseURL, model } = req.body;

  if (!apiKey) {
    throw new AppError('请先输入API Key', 400, ErrorTypes.VALIDATION);
  }

  const testURL = (baseURL || 'https://api.openai.com/v1').replace(/\/+$/, '') + '/models';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  const startTime = Date.now();
  try {
    const resp = await fetch(testURL, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });
    clearTimeout(timeout);

    const elapsed = Date.now() - startTime;
    const body = await resp.text().catch(() => '');
    let modelCount = 0;
    try {
      const json = JSON.parse(body);
      modelCount = json.data?.length || 0;
    } catch {}

    if (resp.ok) {
      res.json({
        success: true,
        data: {
          connected: true,
          statusCode: resp.status,
          modelCount,
          latency: elapsed + 'ms',
          message: `连接成功 (${resp.status}), 可用模型 ${modelCount} 个, 延迟 ${elapsed}ms`
        }
      });
    } else {
      res.json({
        success: false,
        data: {
          connected: false,
          statusCode: resp.status,
          latency: elapsed + 'ms',
          message: `认证失败 (HTTP ${resp.status}), 请检查 API Key`
        }
      });
    }
  } catch (e) {
    clearTimeout(timeout);
    const elapsed = Date.now() - startTime;
    const errMsg = e.name === 'AbortError' ? '连接超时(10s)，请检查 Base URL 是否正确' : `连接失败: ${e.message}`;
    res.json({
      success: false,
      data: {
        connected: false,
        latency: elapsed + 'ms',
        message: errMsg
      }
    });
  }
}));

/**
 * POST /api/keys/fetch-models
 * 拉取厂商可用模型列表
 * - 传入 apiKey: 使用提供的Key直接请求
 * - 不传 apiKey: 从数据库查找用户/全局Key
 */
router.post('/fetch-models', requireAuth, asyncHandler(async (req, res) => {
  let { apiKey, baseURL, provider, type } = req.body;
  const keyType = type || 'text';

  // 未提供apiKey时，尝试从数据库查找
  if (!apiKey) {
    if (!provider) {
      throw new AppError('请提供厂商标识或API Key', 400, ErrorTypes.VALIDATION);
    }
    // 查找用户Key或全局Key
    const keyDoc = await ApiKey.findForUser(req.user._id, provider, keyType);
    if (!keyDoc) {
      throw new AppError(`未配置 ${provider} 的API Key，请先输入Key`, 400, ErrorTypes.VALIDATION);
    }
    apiKey = keyDoc.apiKey;
    if (!baseURL) baseURL = keyDoc.baseURL;
  }

  // 根据厂商选择正确的base URL
  let fetchBaseURL = baseURL;
  if (!fetchBaseURL) {
    for (const providers of Object.values(PROVIDERS)) {
      const found = providers.find(p => p.key === provider);
      if (found?.baseURL) { fetchBaseURL = found.baseURL; break; }
    }
  }
  if (!fetchBaseURL) {
    fetchBaseURL = 'https://api.openai.com/v1';
  }

  const modelsURL = fetchBaseURL.replace(/\/+$/, '') + '/models';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const resp = await fetch(modelsURL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new AppError(`获取模型列表失败 (${resp.status}): ${errText}`, resp.status, ErrorTypes.EXTERNAL_API);
    }

    const result = await resp.json().catch(() => ({}));
    const models = (result.data || []).map(m => ({
      id: m.id,
      owned_by: m.owned_by || ''
    }));

    res.json({
      success: true,
      data: { models, total: models.length }
    });
  } catch (e) {
    clearTimeout(timeout);
    if (e instanceof AppError) throw e;
    if (e.name === 'AbortError') {
      throw new AppError('获取模型列表超时(10s)，请检查Base URL', 504, ErrorTypes.EXTERNAL_API);
    }
    throw new AppError(`获取模型列表失败: ${e.message}`, 500, ErrorTypes.EXTERNAL_API);
  }
}));

/**
 * POST /api/keys/batch-test
 * 一键检测当前type下所有厂商的Key连通性
 */
router.post('/batch-test', requireAuth, asyncHandler(async (req, res) => {
  const { type } = req.body;
  const keyType = type || 'text';
  const providers = PROVIDERS[keyType] || [];

  const results = await Promise.allSettled(
    providers.map(async (provider) => {
      const base = { provider: provider.key, label: provider.label, icon: provider.icon };

      // 跳过自定义厂商（没有固定baseURL无法检测）
      if (provider.key === 'custom') {
        return { ...base, hasKey: false, connected: false, skipped: true, message: '自定义厂商，需手动测试' };
      }

      // 查找Key
      const keyDoc = await ApiKey.findForUser(req.user._id, provider.key, keyType);
      if (!keyDoc || !keyDoc.apiKey) {
        return { ...base, hasKey: false, connected: false, message: '未配置Key' };
      }

      // 测试连通性
      const testURL = (keyDoc.baseURL || provider.baseURL || 'https://api.openai.com/v1').replace(/\/+$/, '') + '/models';
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const startTime = Date.now();

      try {
        const resp = await fetch(testURL, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${keyDoc.apiKey}`, 'Content-Type': 'application/json' },
          signal: controller.signal
        });
        clearTimeout(timeout);
        const elapsed = Date.now() - startTime;
        let modelCount = 0;
        try {
          const json = await resp.json();
          modelCount = json.data?.length || 0;
        } catch {}

        if (resp.ok) {
          return { ...base, hasKey: true, connected: true, latency: elapsed, modelCount, message: `连接成功, ${modelCount} 个模型, ${elapsed}ms` };
        } else {
          return { ...base, hasKey: true, connected: false, latency: elapsed, message: `认证失败 (HTTP ${resp.status})` };
        }
      } catch (e) {
        clearTimeout(timeout);
        const elapsed = Date.now() - startTime;
        const errMsg = e.name === 'AbortError' ? '连接超时(10s)' : `连接失败: ${e.message}`;
        return { ...base, hasKey: true, connected: false, latency: elapsed, message: errMsg };
      }
    })
  );

  const resultList = results.map((r, i) => r.status === 'fulfilled' ? r.value : { provider: providers[i]?.key, label: providers[i]?.label, icon: providers[i]?.icon, hasKey: false, connected: false, message: '检测异常: ' + (r.reason?.message || '未知错误') });
  const tested = resultList.filter(r => r.hasKey);
  const connected = resultList.filter(r => r.connected);

  res.json({
    success: true,
    data: {
      type: keyType,
      results: resultList,
      summary: {
        total: resultList.length,
        tested: tested.length,
        connected: connected.length,
        failed: tested.length - connected.length
      }
    }
  });
}));

module.exports = router;
