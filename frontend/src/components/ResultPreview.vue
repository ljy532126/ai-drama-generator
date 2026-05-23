<template>
  <div class="preview-area">
    <div class="preview-label">生成结果</div>

    <!-- 处理中 -->
    <div v-if="status === 'processing' && !videoUrl" class="preview-state">
      <el-icon :size="48" class="rotating"><Loading /></el-icon>
      <p>视频正在生成中...</p>
      <p class="sub-text">任务ID: {{ taskId?.slice(0, 20) }}...</p>
      <el-button size="small" type="primary" @click="$emit('poll', taskId, provider)" style="margin-top:12px">
        <el-icon><Refresh /></el-icon> 查询状态
      </el-button>
    </div>

    <!-- 完成 -->
    <div v-else-if="videoUrl" class="preview-state">
      <video :src="videoUrl" controls autoplay loop class="result-video" />
      <div class="video-actions">
        <el-button size="small" @click="downloadVideo">
          <el-icon><Download /></el-icon> 下载
        </el-button>
        <el-button size="small" text @click="copyUrl">
          <el-icon><Link /></el-icon> 复制链接
        </el-button>
      </div>
    </div>

    <!-- 失败 -->
    <div v-else-if="status === 'failed'" class="preview-state">
      <el-icon :size="48" color="#f56c6c"><CircleClose /></el-icon>
      <p style="color:#f56c6c">视频生成失败</p>
    </div>

    <!-- 空闲 -->
    <div v-else class="preview-state">
      <el-icon :size="48"><VideoCamera /></el-icon>
      <p>输入参数后点击生成</p>
    </div>
  </div>
</template>

<script setup>
import { ElMessage } from 'element-plus'
import { Loading, Refresh, Download, Link, VideoCamera, CircleClose } from '@element-plus/icons-vue'

const props = defineProps({
  videoUrl: { type: String, default: '' },
  status: { type: String, default: '' },
  taskId: { type: String, default: '' },
  provider: { type: String, default: '' }
})

defineEmits(['poll'])

function copyUrl() {
  if (props.videoUrl && /^https?:\/\//.test(props.videoUrl)) {
    navigator.clipboard.writeText(props.videoUrl).then(() => ElMessage.success('链接已复制'))
  } else {
    ElMessage.warning('无效的视频链接')
  }
}

function downloadVideo() {
  if (!props.videoUrl || !/^https?:\/\//.test(props.videoUrl)) { ElMessage.warning('无效的视频链接'); return }
  const a = document.createElement('a')
  a.href = props.videoUrl
  a.download = 'video.mp4'
  a.target = '_blank'
  a.click()
}
</script>

<style scoped>
.preview-area { background: #fafbfc; border: 1px solid #e4e7ed; border-radius: 8px; padding: 16px; height: 100%; display: flex; flex-direction: column; }
.preview-label { font-size: 14px; font-weight: 600; color: #303133; margin-bottom: 12px; }
.preview-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #c0c4cc; }
.preview-state p { margin-top: 8px; font-size: 13px; }
.sub-text { font-size: 11px !important; color: #dcdfe6; word-break: break-all; text-align: center; }
.result-video { width: 100%; max-height: 340px; border-radius: 6px; background: #000; }
.video-actions { display: flex; gap: 8px; margin-top: 10px; }
.rotating { animation: spin 2s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 767px) {
  .preview-area { min-height: 180px; padding: 12px; }
  .result-video { max-height: 220px; }
}
</style>
