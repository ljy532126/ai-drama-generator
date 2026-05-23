/**
 * 初始化管理员账号
 */

const User = require('../models/User');
const logger = require('../config/logger');

async function seedAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@drama.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456';

  try {
    const existing = await User.findOne({ email: adminEmail });
    if (existing) {
      if (existing.role !== 'admin') {
        existing.role = 'admin';
        await existing.save();
        logger.info(`已升级 ${adminEmail} 为管理员`);
      }
      return;
    }

    const admin = new User({
      username: 'admin',
      email: adminEmail,
      passwordHash: adminPassword,
      role: 'admin'
    });
    await admin.save();
    logger.info('管理员账号已创建:', { email: adminEmail });
  } catch (error) {
    logger.error('管理员初始化失败:', { error: error.message });
  }
}

module.exports = { seedAdmin };
