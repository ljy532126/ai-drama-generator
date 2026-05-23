<template>
  <el-card class="result-card">
    <template #header>
      <div class="result-header">
        <span>{{ icon }} {{ title }}</span>
        <div class="result-actions">
          <el-dropdown @command="handleDownload">
            <el-button size="small" type="primary" plain>
              下载 <el-icon><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="md">Markdown (.md)</el-dropdown-item>
                <el-dropdown-item command="txt">纯文本 (.txt)</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-button size="small" @click="copyContent">复制</el-button>
        </div>
      </div>
    </template>
    <div class="result-content" v-html="formattedContent"></div>
  </el-card>
</template>

<script setup>
import { computed } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  title: String,
  icon: String,
  content: String,
  section: String,
  taskId: String
})

const formattedContent = computed(() => {
  if (!props.content) return '<p style="color:#909399">暂无内容</p>'
  return props.content
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/```([\s\S]+?)```/g, '<pre>$1</pre>')
    .replace(/\n/g, '<br>')
})

function handleDownload(format) {
  if (!props.content) return
  const filename = `${props.section}.${format}`
  const blob = new Blob([props.content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('下载开始')
}

async function copyContent() {
  try {
    await navigator.clipboard.writeText(props.content || '')
    ElMessage.success('复制成功')
  } catch {
    ElMessage.error('复制失败')
  }
}
</script>

<style scoped>
.result-card {
  margin-bottom: 20px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.result-actions {
  display: flex;
  gap: 8px;
}

.result-content {
  max-height: 600px;
  overflow-y: auto;
  background: #f9fafb;
  padding: 16px;
  border-radius: 8px;
  line-height: 1.8;
  white-space: pre-wrap;
}

.result-content :deep(h1) { font-size: 1.4em; margin: 16px 0 8px; }
.result-content :deep(h2) { font-size: 1.2em; margin: 12px 0 6px; }
.result-content :deep(h3) { font-size: 1.05em; margin: 10px 0 4px; }
.result-content :deep(pre) { background: #1d1e2c; color: #e5e7eb; padding: 12px; border-radius: 6px; overflow-x: auto; }
.result-content :deep(strong) { color: #303133; }

@media (max-width: 767px) {
  .result-header { flex-direction: column; align-items: flex-start; gap: 8px; }
  .result-actions { align-self: flex-end; }
  .result-content { max-height: 400px; padding: 12px; font-size: 13px; }
}
</style>
