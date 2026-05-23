/**
 * 日志实时流路由
 * 通过SSE向客户端推送实时日志
 */

const express = require('express');
const { emitter } = require('../config/logger');

const router = express.Router();

/**
 * GET /api/logs/stream
 * SSE实时日志流
 */
router.get('/stream', (req, res) => {
  // SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  // 发送初始连接确认
  res.write(`data: ${JSON.stringify({ type: 'connected', message: '日志流已连接' })}\n\n`);

  // 日志事件处理函数
  const onLog = (logEntry) => {
    res.write(`data: ${JSON.stringify({ type: 'log', ...logEntry })}\n\n`);
  };

  emitter.on('log', onLog);

  // 心跳保活（每25秒）
  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 25000);

  // 客户端断开时清理
  req.on('close', () => {
    emitter.off('log', onLog);
    clearInterval(heartbeat);
  });
});

/**
 * GET /api/logs/recent
 * 获取最近的日志（用于页面初始加载）
 */
router.get('/recent', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const logFile = path.resolve(__dirname, '../../logs/combined.log');
  const limit = parseInt(req.query.lines) || 50;

  try {
    if (!fs.existsSync(logFile)) {
      return res.json({ success: true, data: { lines: [] } });
    }

    const content = fs.readFileSync(logFile, 'utf-8');
    const lines = content.trim().split('\n').slice(-limit);

    res.json({
      success: true,
      data: { lines }
    });
  } catch (error) {
    res.json({ success: true, data: { lines: [], error: error.message } });
  }
});

module.exports = router;
