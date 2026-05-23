/**
 * 视频生成任务模型
 */
const mongoose = require('mongoose');

const videoTaskSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  taskId: { type: String, required: true, unique: true, index: true },
  provider: { type: String, required: true },
  model: { type: String, default: '' },
  mode: { type: String, required: true },
  prompt: { type: String, default: '' },
  status: { type: String, enum: ['processing', 'completed', 'failed'], default: 'processing', index: true },
  videoUrl: { type: String, default: '' },
  error: { type: String, default: '' },
  fileLabels: { type: String, default: '' },
  params: {
    duration: Number,
    ratio: String,
    resolution: String,
    generateAudio: Boolean,
    watermark: Boolean
  }
}, { timestamps: true });

module.exports = mongoose.model('VideoTask', videoTaskSchema);
