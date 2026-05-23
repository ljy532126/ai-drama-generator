/**
 * 图片生成任务模型
 */
const mongoose = require('mongoose');

const imageTaskSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  provider: { type: String, required: true },
  model: { type: String, default: '' },
  prompt: { type: String, required: true },
  status: { type: String, enum: ['completed', 'failed'], default: 'completed', index: true },
  imageUrls: [{ type: String }],
  error: { type: String, default: '' },
  params: {
    size: String,
    outputFormat: String,
    watermark: Boolean,
    referenceImages: Number
  }
}, { timestamps: true });

module.exports = mongoose.model('ImageTask', imageTaskSchema);
