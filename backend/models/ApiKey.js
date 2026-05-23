/**
 * API Key 模型
 * 支持管理员全局Key和用户自定义Key
 * 使用AES-256-GCM加密存储Key
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'drama-encryption-key-32bytes!!';
const ALGORITHM = 'aes-256-gcm';

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return iv.toString('hex') + ':' + authTag + ':' + encrypted;
}

function decrypt(text) {
  if (!text || !text.includes(':')) return '';
  const [ivHex, authTagHex, encrypted] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)), iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

const apiKeySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
    default: null  // null = 管理员全局Key
  },
  provider: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'video'],
    default: 'text',
    index: true
  },
  apiKey: {
    type: String,
    required: true,
    set: encrypt,
    get: decrypt
  },
  model: {
    type: String,
    default: ''
  },
  baseURL: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isGlobal: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

apiKeySchema.index({ userId: 1, provider: 1, type: 1 }, { unique: true });

// 查找用户可用的Key (优先用户自定义，回退到全局)
apiKeySchema.statics.findForUser = async function(userId, provider, type = 'text') {
  // 先找用户的Key
  let key = await this.findOne({ userId, provider, type, isActive: true });
  // 回退到全局Key
  if (!key) {
    key = await this.findOne({ isGlobal: true, userId: null, provider, type, isActive: true });
  }
  return key;
};

const ApiKey = mongoose.model('ApiKey', apiKeySchema);

module.exports = ApiKey;
