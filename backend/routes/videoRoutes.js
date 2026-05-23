/**
 * 视频生成路由
 * 适配字节Seedance Ark API — 支持URL + 本地上传(base64)
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ApiKey = require('../models/ApiKey');
const VideoTask = require('../models/VideoTask');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler, AppError, ErrorTypes } = require('../middleware/errorHandler');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads', 'video');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.mp4';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.mp4', '.mov', '.avi', '.webm', '.mkv', '.mp3', '.wav', '.ogg', '.m4a'];
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('不支持的文件格式'));
  }
});

const uploadFields = upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'referenceAudio', maxCount: 1 },
  { name: 'referenceVideo', maxCount: 1 }
]);

/** 文件转 base64 data URI */
function fileToBase64(filePath) {
  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.bmp': 'image/bmp', '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.avi': 'video/x-msvideo', '.webm': 'video/webm', '.mkv': 'video/x-matroska', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4' };
  const mime = mimeMap[ext] || 'application/octet-stream';
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

/** 翻译上游API错误为用户可读的中文 */
function translateError(msg) {
  const patterns = [
    [/real person/i, '上传的图片中包含真实人脸，出于安全考虑暂不支持真人照片生成视频，请更换图片'],
    [/copyright/i, '生成结果可能涉及版权保护内容，请修改提示词或更换素材后重试'],
    [/limit reached|quota|insufficient|balance/i, 'API额度已用完或已达平台调用上限，请前往火山引擎控制台充值或关闭「安全体验模式」'],
    [/invalid.*model/i, '模型名称无效，请确认填写的模型/端点ID正确'],
    [/invalid.*api.?key|unauthorized|auth/i, 'API Key 无效或未授权，请检查Key配置'],
    [/invalid.*parameter|invalid.*argument/i, '请求参数有误，请检查各项设置是否正确'],
    [/timeout|timed out/i, '视频生成超时，请稍后重试'],
    [/content.*filter|safety|block/i, '内容未通过安全审核，请修改提示词或更换素材后重试'],
    [/server.*error|internal/i, '上游服务暂时异常，请稍后重试'],
  ];
  for (const [re, text] of patterns) {
    if (re.test(msg)) return text;
  }
  return msg;
}

/**
 * 解析 prompt 中的 @引用，匹配上传文件，构建 Ark content 数组
 * @param {string} prompt - 原始 prompt（含 @图像1 等引用）
 * @param {object} fileLabels - { "图像1": { type, field, index } | { type, url }, ... }
 * @param {object} uploadedFiles - multer req.files
 * @returns {{ content: Array, cleanPrompt: string }}
 */
function parseReferencesAndBuildContent(prompt, fileLabels, uploadedFiles) {
  const content = [];

  // 1. 解析 fileLabels → resolved[label] = { type, dataUrl }
  const resolved = {};
  if (fileLabels && typeof fileLabels === 'object') {
    for (const [label, info] of Object.entries(fileLabels)) {
      if (info.url) {
        resolved[label] = { type: info.type, dataUrl: info.url };
      } else if (info.field && info.index !== undefined) {
        const fileArray = uploadedFiles[info.field];
        if (fileArray && fileArray[info.index]) {
          const file = fileArray[info.index];
          if (info.type === 'image' || info.type === 'audio' || info.type === 'video') {
            resolved[label] = { type: info.type, dataUrl: fileToBase64(file.path) };
          }
        }
      }
    }
  }

  // 2. 扫描 prompt 中的 @引用，按出现顺序
  const refRegex = /@(\S+)/g;
  const orderedRefs = [];
  let match;
  while ((match = refRegex.exec(prompt)) !== null) {
    const label = match[1];
    if (resolved[label]) {
      orderedRefs.push({ label, type: resolved[label].type, dataUrl: resolved[label].dataUrl });
    }
  }

  // 3. 清理 prompt（去掉 @引用），保留其他文本
  const cleanPrompt = prompt.replace(/@\S+/g, '').replace(/\s+/g, ' ').trim();

  // 4. 构建 content 数组：text 在前，然后按首次出现顺序添加 media
  if (cleanPrompt) {
    content.push({ type: 'text', text: cleanPrompt });
  }

  const seen = new Set();
  for (const ref of orderedRefs) {
    if (seen.has(ref.label)) continue;
    seen.add(ref.label);

    switch (ref.type) {
      case 'image':
        content.push({
          type: 'image_url',
          image_url: { url: ref.dataUrl },
          role: 'reference_image'
        });
        break;
      case 'video':
        content.push({
          type: 'video_url',
          video_url: { url: ref.dataUrl },
          role: 'reference_video'
        });
        break;
      case 'audio':
        content.push({
          type: 'audio_url',
          audio_url: { url: ref.dataUrl },
          role: 'reference_audio'
        });
        break;
    }
  }

  return { content, cleanPrompt };
}

/**
 * POST /api/video/generate
 */
router.post('/generate', requireAuth, uploadFields, asyncHandler(async (req, res) => {
  const {
    provider, model, mode, prompt, duration, ratio, resolution,
    generateAudio, watermark, negativePrompt,
    imageUrls, videoUrl, audioUrl, seed, priority, serviceTier
  } = req.body;

  if (!provider || !mode) {
    throw new AppError('缺少必要参数 provider / mode', 400, ErrorTypes.VALIDATION);
  }

  const keyDoc = await ApiKey.findForUser(req.user._id, provider, 'video');
  if (!keyDoc) {
    throw new AppError(`未配置 ${provider} 的视频API Key`, 400, ErrorTypes.VALIDATION);
  }

  const apiKey = keyDoc.apiKey;
  const apiBaseURL = (keyDoc.baseURL || 'https://ark.cn-beijing.volces.com/api/v3').replace(/\/+$/, '');
  const apiModel = model || keyDoc.model || 'doubao-seedance-2-0-260128';

  const uploadedFiles = req.files || {};

  // 收集图片：URL + 上传文件转base64
  let allImageUrls = [];
  if (imageUrls) {
    allImageUrls = Array.isArray(imageUrls) ? imageUrls
      : (typeof imageUrls === 'string' ? (imageUrls.startsWith('[') ? JSON.parse(imageUrls) : imageUrls.split(',').map(s => s.trim()).filter(Boolean))
      : []);
  }
  if (uploadedFiles.images) {
    uploadedFiles.images.forEach(f => {
      allImageUrls.push(fileToBase64(f.path));
    });
  }

  // 音频：上传文件转base64，或使用URL
  let resolvedAudioUrl = audioUrl || '';
  if (uploadedFiles.referenceAudio?.[0] && !resolvedAudioUrl) {
    resolvedAudioUrl = fileToBase64(uploadedFiles.referenceAudio[0].path);
  }

  // 视频：上传文件转 base64，或使用URL
  let resolvedVideoUrl = videoUrl || '';
  if (uploadedFiles.referenceVideo?.[0] && !resolvedVideoUrl) {
    resolvedVideoUrl = fileToBase64(uploadedFiles.referenceVideo[0].path);
  }

  // ===== 解析 fileLabels（新版 @引用 模式）=====
  let fileLabelsParsed = null;
  if (req.body.fileLabels) {
    try {
      fileLabelsParsed = JSON.parse(req.body.fileLabels);
    } catch (e) { /* fall through to legacy */ }
  }

  // ===== 构建 Ark content 数组 =====
  let content;
  let cleanPrompt;

  if (fileLabelsParsed && Object.keys(fileLabelsParsed).length > 0) {
    // 新版：通过 @引用 解析
    const result = parseReferencesAndBuildContent(prompt, fileLabelsParsed, req.files || {});
    content = result.content;
    cleanPrompt = result.cleanPrompt;
  } else {
    // 旧版兼容模式
    cleanPrompt = prompt;
    content = [];

    if (prompt) {
      content.push({ type: 'text', text: prompt });
    }

    allImageUrls.filter(Boolean).forEach((url, idx) => {
      content.push({
        type: 'image_url',
        image_url: { url },
        role: 'reference_image'
      });
    });

    if (resolvedVideoUrl) {
      content.push({
        type: 'video_url',
        video_url: { url: resolvedVideoUrl },
        role: 'reference_video'
      });
    }

    if (resolvedAudioUrl) {
      content.push({
        type: 'audio_url',
        audio_url: { url: resolvedAudioUrl },
        role: 'reference_audio'
      });
    }
  }

  // ===== 构建请求体 =====
  const body = {
    model: apiModel,
    content,
    ratio: ratio || 'adaptive',
    duration: parseInt(duration) || -1,
    watermark: watermark === 'true' || watermark === true,
    generate_audio: generateAudio !== 'false' && generateAudio !== false
  };
  if (resolution && resolution !== '720p') body.resolution = resolution;
  if (seed !== undefined && seed !== null && seed !== '' && parseInt(seed) >= 0) body.seed = parseInt(seed);
  if (priority !== undefined && priority !== null && priority !== '') body.priority = parseInt(priority) || 0;
  if (serviceTier) body.service_tier = serviceTier;

  // ===== 调用 Ark API =====
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 300000);

  try {
    const resp = await fetch(`${apiBaseURL}/contents/generations/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    clearTimeout(timeout);

    const result = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      const errMsg = result.error?.message || result.message || JSON.stringify(result).slice(0, 500);
      throw new AppError(translateError(errMsg), 424, ErrorTypes.EXTERNAL_API);
    }

    // Ark返回: { id: "cgt-xxx" }
    const taskId = result.id || '';
    if (!taskId) {
      throw new AppError('未获取到任务ID: ' + JSON.stringify(result).slice(0, 300), 500, ErrorTypes.EXTERNAL_API);
    }

    // 保存到数据库
    await VideoTask.create({
      userId: req.user._id,
      taskId,
      provider,
      model: apiModel,
      mode,
      prompt: prompt || '',
      status: 'processing',
      fileLabels: fileLabelsParsed ? JSON.stringify(fileLabelsParsed) : '',
      params: { duration: parseInt(duration) || -1, ratio: ratio || 'adaptive', resolution: resolution || '720p', generateAudio: generateAudio !== 'false' && generateAudio !== false, watermark: watermark === 'true' || watermark === true }
    });

    res.json({
      success: true,
      data: { taskId, videoUrl: null, status: 'processing', message: '任务已提交' }
    });
  } catch (e) {
    clearTimeout(timeout);
    if (e instanceof AppError) throw e;
    if (e.name === 'AbortError') {
      throw new AppError('视频生成超时(300s)', 504, ErrorTypes.EXTERNAL_API);
    }
    throw new AppError(`视频生成失败: ${e.message}`, 500, ErrorTypes.EXTERNAL_API);
  } finally {
    // 清理上传的临时文件（base64已编码到请求中，文件可删）
    if (uploadedFiles.images) {
      uploadedFiles.images.forEach(f => fs.unlink(f.path, () => {}));
    }
    if (uploadedFiles.referenceAudio) {
      uploadedFiles.referenceAudio.forEach(f => fs.unlink(f.path, () => {}));
    }
    if (uploadedFiles.referenceVideo) {
      uploadedFiles.referenceVideo.forEach(f => fs.unlink(f.path, () => {}));
    }
  }
}));

/**
 * GET /api/video/task/:taskId
 * 查询异步任务状态 — 适配Ark实际返回格式
 */
router.get('/task/:taskId', requireAuth, asyncHandler(async (req, res) => {
  const { provider } = req.query;
  const llmProvider = provider || 'bytedance-seedance';

  const keyDoc = await ApiKey.findForUser(req.user._id, llmProvider, 'video');
  if (!keyDoc) {
    throw new AppError('未配置视频API Key', 400, ErrorTypes.VALIDATION);
  }

  const apiBaseURL = (keyDoc.baseURL || 'https://ark.cn-beijing.volces.com/api/v3').replace(/\/+$/, '');

  const resp = await fetch(`${apiBaseURL}/contents/generations/tasks/${req.params.taskId}`, {
    headers: { 'Authorization': `Bearer ${keyDoc.apiKey}` }
  });

  const result = await resp.json().catch(() => ({}));

  // Ark返回: { id, status, content: { video_url }, error: { code, message }, usage: { ... } }
  const status = result.status || 'unknown';
  const videoUrl = result.content?.video_url || '';
  const errorMsg = result.error?.message || '';

  // 同步状态到数据库
  const dbStatus = status === 'succeeded' ? 'completed' : status === 'failed' ? 'failed' : 'processing';
  await VideoTask.findOneAndUpdate(
    { taskId: req.params.taskId, userId: req.user._id },
    { status: dbStatus, videoUrl, error: errorMsg || '' }
  );

  res.json({
    success: true,
    data: {
      taskId: req.params.taskId,
      videoUrl,
      status,
      error: errorMsg || null
    }
  });
}));

/**
 * GET /api/video/history
 * 获取用户的视频生成历史
 */
router.get('/history', requireAuth, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const query = { userId: req.user._id };
  if (req.query.status) query.status = req.query.status;

  const total = await VideoTask.countDocuments(query);
  const tasks = await VideoTask.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .select('taskId provider model mode prompt status videoUrl error params createdAt updatedAt');

  res.json({
    success: true,
    data: { list: tasks, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }
  });
}));

/**
 * DELETE /api/video/task/:taskId
 * 删除视频任务记录
 */
router.delete('/task/:taskId', requireAuth, asyncHandler(async (req, res) => {
  const task = await VideoTask.findOneAndDelete({ taskId: req.params.taskId, userId: req.user._id });
  if (!task) {
    throw new AppError('任务不存在', 404, ErrorTypes.NOT_FOUND);
  }
  res.json({ success: true, message: '已删除' });
}));

module.exports = router;
