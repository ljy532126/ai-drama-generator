/**
 * 数据分析路由
 * 用户个人统计 + 管理员系统分析
 */

const express = require('express');
const Drama = require('../models/Drama');
const User = require('../models/User');
const ImageTask = require('../models/ImageTask');
const VideoTask = require('../models/VideoTask');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * GET /api/analytics/public
 * 公开统计 — landing page 使用，无需认证
 */
router.get('/public', asyncHandler(async (req, res) => {
  const [totalDramas, completedDramas, totalUsers] = await Promise.all([
    Drama.countDocuments(),
    Drama.countDocuments({ status: 'completed' }),
    User.countDocuments()
  ]);
  res.json({
    success: true,
    data: {
      totalDramas,
      completedDramas,
      totalUsers,
      successRate: totalDramas ? ((completedDramas / totalDramas) * 100).toFixed(1) : 0
    }
  });
}));

/**
 * GET /api/analytics/user
 * 用户个人统计
 */
router.get('/user', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const [totalDramas, completedDramas, failedDramas, recentDramas,
         totalImages, completedImages,
         totalVideos, completedVideos] = await Promise.all([
    Drama.countDocuments({ userId: userId.toString() }),
    Drama.countDocuments({ userId: userId.toString(), status: 'completed' }),
    Drama.countDocuments({ userId: userId.toString(), status: 'failed' }),
    Drama.find({ userId: userId.toString() }).sort({ createdAt: -1 }).limit(20).select('status executionTime userInput createdAt'),
    ImageTask.countDocuments({ userId }),
    ImageTask.countDocuments({ userId, status: 'completed' }),
    VideoTask.countDocuments({ userId }),
    VideoTask.countDocuments({ userId, status: 'completed' })
  ]);

  // 平均执行时间
  const completedWithTime = recentDramas.filter(d => d.status === 'completed' && d.executionTime > 0);
  const avgTime = completedWithTime.length > 0
    ? Math.round(completedWithTime.reduce((s, d) => s + d.executionTime, 0) / completedWithTime.length)
    : 0;

  // 题材分布
  const themeMap = {};
  recentDramas.forEach(d => {
    const theme = d.userInput?.theme || '未知';
    themeMap[theme] = (themeMap[theme] || 0) + 1;
  });

  // 最近7天趋势
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const trendData = await Drama.aggregate([
    { $match: { userId, createdAt: { $gte: sevenDaysAgo } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } } } },
    { $sort: { _id: 1 } }
  ]);

  // 最近活动
  const recentActivity = recentDramas.slice(0, 10).map(d => ({
    taskId: d.taskId,
    theme: d.userInput?.theme || '',
    status: d.status,
    executionTime: d.executionTime,
    createdAt: d.createdAt
  }));

  res.json({
    success: true,
    data: {
      totalDramas,
      completedDramas,
      failedDramas,
      totalImages,
      completedImages,
      totalVideos,
      completedVideos,
      totalTasks: totalDramas + totalImages + totalVideos,
      successRate: (totalDramas + totalImages + totalVideos) > 0
        ? (((completedDramas + completedImages + completedVideos) / (totalDramas + totalImages + totalVideos)) * 100).toFixed(1)
        : 0,
      avgExecutionTime: avgTime,
      themeDistribution: Object.entries(themeMap).map(([name, value]) => ({ name, value })),
      trend: trendData,
      recentActivity
    }
  });
}));

/**
 * GET /api/admin/analytics/overview
 * 系统概览
 */
router.get('/analytics/overview', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const today = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [totalUsers, totalDramas, completedDramas, todayDramas,
         totalImages, completedImages, todayImages,
         totalVideos, completedVideos, todayVideos, newUsersToday] = await Promise.all([
    User.countDocuments(),
    Drama.countDocuments(),
    Drama.countDocuments({ status: 'completed' }),
    Drama.countDocuments({ createdAt: { $gte: today } }),
    ImageTask.countDocuments(),
    ImageTask.countDocuments({ status: 'completed' }),
    ImageTask.countDocuments({ createdAt: { $gte: today } }),
    VideoTask.countDocuments(),
    VideoTask.countDocuments({ status: 'completed' }),
    VideoTask.countDocuments({ createdAt: { $gte: today } }),
    User.countDocuments({ createdAt: { $gte: today } })
  ]);

  const totalTasks = totalDramas + totalImages + totalVideos;
  const completedTasks = completedDramas + completedImages + completedVideos;
  const todayTasks = todayDramas + todayImages + todayVideos;

  // 计算30天趋势 (合并 Drama + ImageTask + VideoTask)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [dramaTrend, imageTrend, videoTrend] = await Promise.all([
    Drama.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } } } },
      { $sort: { _id: 1 } }
    ]),
    ImageTask.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } } } },
      { $sort: { _id: 1 } }
    ]),
    VideoTask.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } } } },
      { $sort: { _id: 1 } }
    ])
  ]);

  // 合并三种趋势数据
  const trendMap = {};
  for (const t of [...dramaTrend, ...imageTrend, ...videoTrend]) {
    if (!trendMap[t._id]) trendMap[t._id] = { count: 0, completed: 0 };
    trendMap[t._id].count += t.count;
    trendMap[t._id].completed += t.completed;
  }
  const trendData = Object.entries(trendMap).map(([k, v]) => ({ _id: k, ...v })).sort((a, b) => a._id.localeCompare(b._id));

  res.json({
    success: true,
    data: {
      totalUsers,
      totalTasks,
      completedTasks,
      todayTasks,
      newUsersToday,
      totalDramas, totalImages, totalVideos,
      successRate: totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0,
      trend: trendData
    }
  });
}));

/**
 * GET /api/admin/analytics/geo
 * 用户地区分布
 */
router.get('/analytics/geo', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const geoData = await Drama.aggregate([
    { $match: { 'geo.country': { $exists: true, $ne: '' } } },
    {
      $group: {
        _id: {
          country: '$geo.country',
          region: '$geo.region',
          city: '$geo.city'
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 30 }
  ]);

  res.json({
    success: true,
    data: geoData.map(d => {
      const c = d._id.country || '';
      const r = d._id.region || '';
      const city = d._id.city || '';
      // For China: show province as "country", city as "region"
      if (c === 'China' || c === '中国') {
        return {
          country: r || '未知省份',
          region: city || '未知城市',
          count: d.count
        };
      }
      return {
        country: c || '未知',
        region: r || '未知',
        count: d.count
      };
    })
  });
}));

/**
 * GET /api/admin/analytics/devices
 * 设备/浏览器/OS 分布
 */
router.get('/analytics/devices', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const [browserData, osData, deviceData] = await Promise.all([
    Drama.aggregate([
      { $match: { 'parsedUA.browser': { $exists: true, $ne: '' } } },
      { $group: { _id: '$parsedUA.browser', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    Drama.aggregate([
      { $match: { 'parsedUA.os': { $exists: true, $ne: '' } } },
      { $group: { _id: '$parsedUA.os', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    Drama.aggregate([
      { $match: { 'parsedUA.device': { $exists: true, $ne: '' } } },
      { $group: { _id: '$parsedUA.device', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ])
  ]);

  res.json({
    success: true,
    data: {
      browsers: browserData.map(d => ({ name: d._id, value: d.count })),
      os: osData.map(d => ({ name: d._id, value: d.count })),
      devices: deviceData.map(d => ({ name: d._id, value: d.count }))
    }
  });
}));

/**
 * GET /api/admin/analytics/providers
 * 各厂商使用分布
 */
router.get('/analytics/providers', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const [dramaProviders, imageProviders, videoProviders] = await Promise.all([
    Drama.aggregate([
      { $match: { 'userInput.provider': { $exists: true, $ne: '' } } },
      { $group: { _id: '$userInput.provider', count: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } } } },
      { $sort: { count: -1 } }
    ]),
    ImageTask.aggregate([
      { $match: { provider: { $exists: true, $ne: '' } } },
      { $group: { _id: '$provider', count: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } } } },
      { $sort: { count: -1 } }
    ]),
    VideoTask.aggregate([
      { $match: { provider: { $exists: true, $ne: '' } } },
      { $group: { _id: '$provider', count: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } } } },
      { $sort: { count: -1 } }
    ])
  ]);

  // 合并 provider stats，按 provider 名聚合
  const providerMap = {};
  for (const d of dramaProviders) {
    const name = d._id || '未知';
    if (!providerMap[name]) providerMap[name] = { provider: name, dramaCount: 0, imageCount: 0, videoCount: 0, completed: 0 };
    providerMap[name].dramaCount += d.count;
    providerMap[name].completed += d.completed;
  }
  for (const d of imageProviders) {
    const name = d._id || '未知';
    if (!providerMap[name]) providerMap[name] = { provider: name, dramaCount: 0, imageCount: 0, videoCount: 0, completed: 0 };
    providerMap[name].imageCount += d.count;
    providerMap[name].completed += d.completed;
  }
  for (const d of videoProviders) {
    const name = d._id || '未知';
    if (!providerMap[name]) providerMap[name] = { provider: name, dramaCount: 0, imageCount: 0, videoCount: 0, completed: 0 };
    providerMap[name].videoCount += d.count;
    providerMap[name].completed += d.completed;
  }

  const combined = Object.values(providerMap).map(p => ({
    ...p,
    count: p.dramaCount + p.imageCount + p.videoCount
  })).sort((a, b) => b.count - a.count);

  res.json({
    success: true,
    data: combined
  });
}));

/**
 * GET /api/analytics/server
 * 服务器运行状态
 */
router.get('/server', requireAuth, asyncHandler(async (req, res) => {
  const os = require('os');
  const pkg = require('../../package.json');

  const uptime = process.uptime();
  const sysUptime = os.uptime();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const heapUsed = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  const heapTotal = Math.round(process.memoryUsage().heapTotal / 1024 / 1024);
  const rss = Math.round(process.memoryUsage().rss / 1024 / 1024);
  const cpus = os.cpus();

  const formatUptime = (s) => {
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  res.json({
    success: true,
    data: {
      app: {
        name: pkg.name || 'ai-drama-generator',
        version: pkg.version || '1.0.0',
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      },
      process: {
        pid: process.pid,
        uptime: formatUptime(uptime),
        uptimeSeconds: Math.round(uptime)
      },
      system: {
        uptime: formatUptime(sysUptime),
        cpuModel: cpus[0]?.model || '未知',
        cpuCores: cpus.length,
        loadAvg: os.loadavg().map(l => l.toFixed(2)),
        totalMemory: Math.round(totalMem / 1024 / 1024 / 1024) + ' GB',
        freeMemory: Math.round(freeMem / 1024 / 1024 / 1024 * 10) / 10 + ' GB',
        memoryUsagePercent: Math.round((1 - freeMem / totalMem) * 100)
      },
      heap: {
        usedMB: heapUsed,
        totalMB: heapTotal,
        rssMB: rss,
        usagePercent: heapTotal > 0 ? Math.round(heapUsed / heapTotal * 100) : 0
      }
    }
  });
}));

module.exports = router;
