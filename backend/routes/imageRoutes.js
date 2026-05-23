/**
 * 图片生成路由
 * 对接火山方舟 Ark API + 阿里千问 DashScope API — 同步返回结果
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ApiKey = require('../models/ApiKey');
const ImageTask = require('../models/ImageTask');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler, AppError, ErrorTypes } = require('../middleware/errorHandler');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads', 'image');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.bmp'];
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('不支持的文件格式'));
  }
});

const uploadFields = upload.fields([{ name: 'images', maxCount: 10 }]);

function fileToBase64(filePath) {
  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.bmp': 'image/bmp' };
  const mime = mimeMap[ext] || 'image/png';
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

/** 将HTTP(S)图片URL下载并转为base64，避免DashScope无法访问外部URL */
async function urlToBase64(imageUrl) {
  // 已经是base64 data URI，直接返回
  if (/^data:image\/[^;]+;base64,/.test(imageUrl)) return imageUrl;

  // 验证是HTTP(S) URL
  if (!/^https?:\/\//.test(imageUrl)) {
    throw new AppError(`不支持的图片URL格式: ${imageUrl.slice(0, 100)}`, 400, ErrorTypes.VALIDATION);
  }

  let resp;
  try {
    resp = await fetch(imageUrl, { signal: AbortSignal.timeout(30000) });
  } catch (e) {
    throw new AppError(`无法访问图片URL (${e.message}): ${imageUrl.slice(0, 80)}`, 400, ErrorTypes.VALIDATION);
  }

  if (!resp.ok) {
    throw new AppError(`图片URL返回${resp.status}: ${imageUrl.slice(0, 80)}`, 400, ErrorTypes.VALIDATION);
  }

  const contentType = resp.headers.get('content-type') || 'image/png';
  if (!contentType.startsWith('image/')) {
    throw new AppError(`URL返回的不是图片 (${contentType}): ${imageUrl.slice(0, 80)}`, 400, ErrorTypes.VALIDATION);
  }

  const buffer = Buffer.from(await resp.arrayBuffer());
  return `data:${contentType};base64,${buffer.toString('base64')}`;
}

/** 预处理图片列表：将HTTP URL下载转base64，本地文件转base64 */
async function prepareImagesForQwen(imageUrlsParam, uploadedFiles) {
  const images = [];

  // 处理URL入参
  if (imageUrlsParam) {
    const urls = typeof imageUrlsParam === 'string' ? JSON.parse(imageUrlsParam) : imageUrlsParam;
    if (Array.isArray(urls)) {
      for (const url of urls.filter(Boolean)) {
        images.push(await urlToBase64(url));
      }
    }
  }

  // 处理本地文件
  if (uploadedFiles.images) {
    for (const f of uploadedFiles.images) {
      images.push(fileToBase64(f.path));
    }
  }

  return images;
}

function translateError(msg) {
  const patterns = [
    [/sensitive.*content|InputImage|InputText|OutputImage/i, '图片或提示词包含敏感内容，未通过安全审核，请更换后重试'],
    [/copyright/i, '生成结果可能涉及版权保护内容，请修改提示词或更换素材后重试'],
    [/quota|limit.*reached/i, 'API额度已用完或排队任务超限，请稍后重试'],
    [/invalid.*model/i, '模型名称无效，请确认填写的模型/端点ID正确'],
    [/unauthorized|auth/i, 'API Key 无效或未授权，请检查Key配置'],
    [/invalid.*parameter/i, '请求参数有误，请检查各项设置'],
    [/real person|face/i, '图片中包含真实人脸，出于安全考虑暂不支持，请更换图片'],
    [/server.*error|internal/i, '上游服务暂时异常，请稍后重试'],
  ];
  for (const [re, text] of patterns) {
    if (re.test(msg)) return text;
  }
  return msg;
}

/** 判断是否为千问 DashScope API */
function isQwenProvider(provider, baseURL) {
  return provider && (provider.startsWith('qwen') || provider.includes('qwen') || (baseURL && baseURL.includes('dashscope')));
}

/**
 * POST /api/image/generate
 * 提交图片生成任务（同步接口，直接返回结果）
 * 支持 Ark API 和千问 DashScope API 两种格式
 */
router.post('/generate', requireAuth, uploadFields, asyncHandler(async (req, res) => {
  const { provider, model, prompt, size, seed, watermark, responseFormat, outputFormat, guidanceScale, maxImages, optimizePrompt, negativePrompt, promptExtend } = req.body;

  if (!provider) {
    throw new AppError('请选择图片厂商', 400, ErrorTypes.VALIDATION);
  }
  if (!prompt) {
    throw new AppError('请输入描述词', 400, ErrorTypes.VALIDATION);
  }

  const keyDoc = await ApiKey.findForUser(req.user._id, provider, 'image');
  if (!keyDoc) {
    throw new AppError(`未配置 ${provider} 的图片API Key`, 400, ErrorTypes.VALIDATION);
  }

  const apiKey = keyDoc.apiKey;
  const apiBaseURL = (keyDoc.baseURL || 'https://ark.cn-beijing.volces.com/api/v3').replace(/\/+$/, '');
  const apiModel = model || keyDoc.model || 'doubao-seedream-5-0-260128';

  const uploadedFiles = req.files || {};

  // 收集参考图片：body中的URL + 上传文件转base64
  const images = [];
  let imageUrlsParam = req.body.imageUrls;
  if (imageUrlsParam) {
    const urls = typeof imageUrlsParam === 'string' ? JSON.parse(imageUrlsParam) : imageUrlsParam;
    if (Array.isArray(urls)) images.push(...urls.filter(Boolean));
  }
  if (uploadedFiles.images) {
    uploadedFiles.images.forEach(f => images.push(fileToBase64(f.path)));
  }

  // ===== 千问 DashScope API =====
  if (isQwenProvider(provider, apiBaseURL)) {
    const n = parseInt(maxImages) || 1;
    const qwenSize = (size && size.includes('*')) ? size : '1024*1024';

    // Qwen: 所有图片统一转base64，避免外部URL不可达导致 "url error"
    const qwenImages = await prepareImagesForQwen(req.body.imageUrls, uploadedFiles);
    const refImages = qwenImages.slice(0, 3);
    const hasRefImages = refImages.length > 0;

    const params = {
      n: Math.min(n, 6),
      watermark: watermark === 'true' || watermark === true,
      prompt_extend: promptExtend !== 'false' && promptExtend !== false,
      size: qwenSize
    };
    if (negativePrompt) params.negative_prompt = negativePrompt;
    if (seed !== undefined && seed !== null && seed !== '' && parseInt(seed) >= 0) params.seed = parseInt(seed);

    // 无参考图 → 文生图 (text2image, wanx模型)
    //   有参考图 → 图像编辑 (multimodal-generation, qwen-image模型)
    //   两种端点互不兼容，模型不可混用
    let endpoint, qwenModel, qwenBody;
    if (hasRefImages) {
      endpoint = '/services/aigc/multimodal-generation/generation';
      qwenModel = apiModel;
      const content = [];
      for (const img of refImages) content.push({ image: img });
      content.push({ text: prompt });
      qwenBody = {
        model: qwenModel,
        input: { messages: [{ role: 'user', content }] },
        parameters: params
      };
    } else {
      endpoint = '/services/aigc/text2image/image-synthesis';
      // 文生图端点仅支持 wanx 模型；若用户选了 qwen-image-edit 模型则自动切换
      qwenModel = apiModel.startsWith('wanx') ? apiModel : 'wanx2.1-t2i-turbo';
      // 文生图端点最大n=4，不是6
      if (params.n > 4) params.n = 4;
      // 文生图端点尺寸限制 512-1440
      if (params.size) {
        const [w, h] = params.size.split('*').map(Number);
        if (w && h) {
          const cw = Math.min(1440, Math.max(512, w));
          const ch = Math.min(1440, Math.max(512, h));
          params.size = `${cw}*${ch}`;
        }
      }
      qwenBody = {
        model: qwenModel,
        input: { prompt },
        parameters: params
      };
    }

    try {
      // DashScope 一律使用异步模式 (X-DashScope-Async: enable)
      const submitResp = await fetch(`${apiBaseURL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'X-DashScope-Async': 'enable'
        },
        body: JSON.stringify(qwenBody),
        signal: AbortSignal.timeout(60000)
      });

      const submitResult = await submitResp.json().catch(() => ({}));

      if (!submitResp.ok) {
        const errMsg = submitResult.message || submitResult.code || JSON.stringify(submitResult).slice(0, 500);
        throw new AppError(translateError(errMsg), 502, ErrorTypes.EXTERNAL_API);
      }

      // 异步模式返回: { output: { task_id, task_status: "PENDING" } }
      const taskId = submitResult.output?.task_id;
      if (!taskId) {
        throw new AppError('DashScope未返回task_id: ' + JSON.stringify(submitResult).slice(0, 300), 502, ErrorTypes.EXTERNAL_API);
      }

      // 轮询等待任务完成（最长5分钟）
      const pollStart = Date.now();
      let taskResult;
      while (Date.now() - pollStart < 300000) {
        await new Promise(r => setTimeout(r, 2000));
        const pollResp = await fetch(`${apiBaseURL}/tasks/${taskId}`, {
          headers: { 'Authorization': `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(10000)
        });
        taskResult = await pollResp.json().catch(() => ({}));
        const ts = taskResult.output?.task_status;
        if (ts === 'SUCCEEDED') break;
        if (ts === 'FAILED') {
          const errMsg = taskResult.output?.message || taskResult.message || '任务失败';
          throw new AppError(translateError(errMsg), 502, ErrorTypes.EXTERNAL_API);
        }
      }

      if (!taskResult || taskResult.output?.task_status !== 'SUCCEEDED') {
        throw new AppError('图片生成超时(300s)，请稍后重试', 504, ErrorTypes.EXTERNAL_API);
      }

      // 文生图: output.results[{ url }]; 图像编辑: output.choices[0].message.content[{ image }]
      let imageResults;
      if (hasRefImages) {
        const contents = taskResult.output?.choices?.[0]?.message?.content || [];
        imageResults = contents
          .filter(c => c.image && /^https?:\/\//.test(c.image))
          .map(c => ({ url: c.image, b64Json: '', size: `${taskResult.usage?.width || 0}x${taskResult.usage?.height || 0}` }));
      } else {
        const results = taskResult.output?.results || [];
        imageResults = results
          .filter(r => r.url && /^https?:\/\//.test(r.url))
          .map(r => ({ url: r.url, b64Json: r.b64_json || '', size: `${taskResult.usage?.image_width || 0}x${taskResult.usage?.image_height || 0}` }));
      }

      if (!imageResults.length) {
        throw new AppError('千问API未返回图片: ' + JSON.stringify(taskResult).slice(0, 300), 502, ErrorTypes.EXTERNAL_API);
      }

      await ImageTask.create({
        userId: req.user._id,
        provider,
        model: qwenModel,
        prompt,
        status: 'completed',
        imageUrls: imageResults.map(img => img.url).filter(Boolean),
        params: { size: qwenSize, outputFormat: 'png', watermark: params.watermark, seed: seed || '', maxImages: n, negativePrompt: negativePrompt || '', promptExtend: params.prompt_extend, referenceImages: refImages.length }
      });

      return res.json({
        success: true,
        data: {
          status: 'completed',
          images: imageResults,
          usage: taskResult.usage || {}
        }
      });
    } catch (e) {
      if (e instanceof AppError) {
        await ImageTask.create({
          userId: req.user._id,
          provider,
          model: qwenModel,
          prompt,
          status: 'failed',
          error: e.message,
          params: { size: qwenSize, outputFormat: 'png', watermark: params.watermark, seed: seed || '', maxImages: n, referenceImages: refImages.length }
        });
        throw e;
      }
      if (e.name === 'AbortError' || e.name === 'TimeoutError') {
        throw new AppError('图片生成超时，请稍后重试', 504, ErrorTypes.EXTERNAL_API);
      }
      throw new AppError(`图片生成失败: ${e.message}`, 500, ErrorTypes.EXTERNAL_API);
    } finally {
      if (uploadedFiles.images) {
        uploadedFiles.images.forEach(f => fs.unlink(f.path, () => {}));
      }
    }
  }

  // ===== 火山方舟 Ark API =====
  const seqMaxImages = parseInt(maxImages) || 1;
  const body = {
    model: apiModel,
    prompt,
    sequential_image_generation: seqMaxImages > 1 ? 'enabled' : 'auto',
    size: size || '2K',
    watermark: watermark === 'true' || watermark === true,
    response_format: responseFormat || 'url',
    output_format: outputFormat || 'png'
  };
  if (seqMaxImages > 1) {
    body.sequential_image_generation_options = { max_images: Math.min(seqMaxImages, 16) };
  }
  if (optimizePrompt === 'true' || optimizePrompt === true) {
    body.optimize_prompt_options = { enable: true };
  }
  if (images.length) body.image = images;
  if (seed !== undefined && seed !== null && seed !== '' && parseInt(seed) >= 0) body.seed = parseInt(seed);
  if (guidanceScale && parseFloat(guidanceScale) >= 1) body.guidance_scale = parseFloat(guidanceScale);

  const arkCtrl = new AbortController();
  const arkTimeout = setTimeout(() => arkCtrl.abort(), 120000);

  try {
    const resp = await fetch(`${apiBaseURL}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body),
      signal: arkCtrl.signal
    });
    clearTimeout(arkTimeout);

    const result = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      const errMsg = result.error?.message || result.message || JSON.stringify(result).slice(0, 500);
      throw new AppError(translateError(errMsg), 502, ErrorTypes.EXTERNAL_API);
    }

    const imageResults = (result.data || [])
      .filter(img => img.url && /^https?:\/\//.test(img.url))
      .map(img => ({
        url: img.url,
        b64Json: img.b64_json || '',
        size: img.size || ''
      }));

    await ImageTask.create({
      userId: req.user._id,
      provider,
      model: apiModel,
      prompt,
      status: 'completed',
      imageUrls: imageResults.map(img => img.url).filter(Boolean),
      params: { size: size || '2K', outputFormat: outputFormat || 'png', watermark: body.watermark, seed: seed || '', guidanceScale: guidanceScale || '', maxImages: seqMaxImages, referenceImages: images.length }
    });

    res.json({
      success: true,
      data: {
        status: 'completed',
        images: imageResults,
        usage: result.usage || {}
      }
    });
  } catch (e) {
    clearTimeout(arkTimeout);
    if (e instanceof AppError) {
      await ImageTask.create({
        userId: req.user._id,
        provider,
        model: apiModel,
        prompt,
        status: 'failed',
        error: e.message,
        params: { size: size || '2K', outputFormat: outputFormat || 'png', watermark: body.watermark, seed: seed || '', guidanceScale: guidanceScale || '', maxImages: seqMaxImages, referenceImages: images.length }
      });
      throw e;
    }
    if (e.name === 'AbortError') {
      throw new AppError('图片生成超时(120s)，请稍后重试', 504, ErrorTypes.EXTERNAL_API);
    }
    throw new AppError(`图片生成失败: ${e.message}`, 500, ErrorTypes.EXTERNAL_API);
  } finally {
    if (uploadedFiles.images) {
      uploadedFiles.images.forEach(f => fs.unlink(f.path, () => {}));
    }
  }
}));

/**
 * GET /api/image/history
 * 获取用户的图片生成历史
 */
router.get('/history', requireAuth, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const query = { userId: req.user._id };
  if (req.query.status) query.status = req.query.status;

  const total = await ImageTask.countDocuments(query);
  const tasks = await ImageTask.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .select('provider model prompt status imageUrls error params createdAt updatedAt');

  res.json({
    success: true,
    data: { list: tasks, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }
  });
}));

/**
 * DELETE /api/image/task/:id
 * 删除图片任务记录
 */
router.delete('/task/:id', requireAuth, asyncHandler(async (req, res) => {
  const task = await ImageTask.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!task) {
    throw new AppError('任务不存在', 404, ErrorTypes.NOT_FOUND);
  }
  res.json({ success: true, message: '已删除' });
}));

module.exports = router;
