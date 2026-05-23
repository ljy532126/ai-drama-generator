<template>
  <div class="video-page">
    <div class="page-banner">
      <h2><el-icon><VideoCamera /></el-icon> 视频生成</h2>
      <p>在 Prompt 中用 @图像1、@视频1、@音频1 引用上传的素材 · 接入字节 Seedance</p>
    </div>

    <!-- 配置栏 -->
    <el-card class="config-card" shadow="hover">
      <el-row :gutter="16" align="middle" style="margin-bottom:12px">
        <el-col :xs="24" :sm="12" :md="6">
          <div class="field-label">视频厂商</div>
          <el-select v-model="selectedProvider" placeholder="选择厂商" size="default" style="width:100%" @change="onProviderChange">
            <el-option v-for="p in videoProviders" :key="p.value" :label="p.label" :value="p.value">
              <span>{{ p.icon }} {{ p.label }}</span>
            </el-option>
          </el-select>
        </el-col>
        <el-col :xs="24" :sm="12" :md="12">
          <div class="field-label">模型</div>
          <div style="display:flex;gap:8px">
            <el-select v-model="selectedModel" placeholder="选择或输入模型" filterable allow-create size="default" style="flex:1" :loading="fetchingModels">
              <el-option v-for="m in modelOptions" :key="m" :label="m" :value="m" />
            </el-select>
            <el-button size="default" text type="primary" :loading="fetchingModels" @click="fetchModels" :disabled="!selectedProvider">
              <el-icon><Refresh /></el-icon> 拉取
            </el-button>
          </div>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6">
          <div class="field-label">画面比例</div>
          <el-select v-model="ratio" size="default" style="width:100%">
            <el-option label="自适应" value="adaptive" />
            <el-option label="16:9" value="16:9" />
            <el-option label="9:16" value="9:16" />
            <el-option label="1:1" value="1:1" />
          </el-select>
        </el-col>
      </el-row>
      <el-row :gutter="16" align="middle">
        <el-col :xs="24" :sm="12" :md="6">
          <div class="field-label">分辨率</div>
          <el-select v-model="resolution" size="default" style="width:100%">
            <el-option label="720p" value="720p" />
            <el-option label="1080p" value="1080p" />
            <el-option label="480p" value="480p" />
          </el-select>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6">
          <div class="field-label">时长(秒)</div>
          <el-input-number v-model="duration" :min="-1" :max="15" size="default" style="width:100%" />
        </el-col>
        <el-col :xs="24" :sm="12" :md="12">
          <div class="field-label">选项</div>
          <el-checkbox v-model="generateAudio" border>生成音频</el-checkbox>
          <el-checkbox v-model="watermark" border style="margin-left:8px">水印</el-checkbox>
          <span class="field-hint">时长设为 -1 由模型自动决定</span>
        </el-col>
      </el-row>
      <div v-if="!videoProviders.length" class="no-provider-hint">
        <el-icon><Warning /></el-icon> 尚未配置视频模型 Key，请先到「个人中心 → API Key 管理」配置
      </div>
    </el-card>

    <!-- 主体区域 -->
    <div class="main-area">
      <!-- 左侧：创作区 -->
      <div class="main-left">
        <!-- 模式选择 + 上传素材 -->
        <div class="mode-bar">
          <span class="mode-label">生成模式</span>
          <el-select v-model="selectedMode" size="small" style="width:150px">
            <el-option label="自动检测" value="auto" />
            <el-option label="文生视频" value="text-to-video" />
            <el-option label="参考生视频" value="reference-to-video" />
            <el-option label="视频编辑" value="video-edit" />
          </el-select>
          <span class="mode-detect" v-if="selectedMode === 'auto'">
            → 当前: <strong>{{ effectiveModeLabel }}</strong>
          </span>
        </div>

        <!-- 素材上传面板 -->
        <MediaUploadPanel
          ref="mediaPanelRef"
          v-model="mediaItems"
          :disabled="generating"
          @insert-label="onInsertLabel"
        />

        <!-- Rich Prompt Editor -->
        <div class="prompt-section">
          <RichPromptEditor
            ref="editorRef"
            v-model="prompt"
            :references="availableReferences"
            :placeholder="promptPlaceholder"
            :rows="effectiveMode === 'video-edit' ? 5 : 7"
            :disabled="generating"
            @insert-label="onInsertLabel"
          />
        </div>

        <!-- 反向词（仅文生视频） -->
        <el-input
          v-if="effectiveMode === 'text-to-video'"
          v-model="negativePrompt"
          type="textarea"
          :rows="2"
          placeholder="反向词（不想出现的内容）：模糊、变形、低质量..."
          style="margin-top:12px"
        />

        <!-- 视频编辑模式：原视频 -->
        <el-card v-if="effectiveMode === 'video-edit'" class="edit-source-card" shadow="never">
          <div class="edit-source-header">
            <el-icon><VideoCamera /></el-icon>
            <span>选择要编辑的原视频</span>
            <el-tag size="small" type="danger">必填</el-tag>
          </div>
          <p class="edit-source-desc">上传或粘贴待编辑视频的链接，然后在下方 Prompt 中描述你想要的修改</p>
          <el-input v-model="editVideoUrl" placeholder="粘贴视频链接，如 https://example.com/video.mp4" clearable>
            <template #prepend>URL</template>
          </el-input>
          <el-upload
            :auto-upload="false"
            :show-file-list="false"
            :on-change="onEditVideoFileChange"
            accept="video/*"
            style="margin-top:8px"
          >
            <el-button size="small" text type="primary">
              <el-icon><Upload /></el-icon> 或上传本地视频文件
            </el-button>
          </el-upload>
          <div v-if="editVideoFile" class="edit-file-tag">
            <el-icon><VideoCamera /></el-icon>
            <span>{{ editVideoFile.name }}</span>
            <el-button :icon="Close" circle size="small" @click="editVideoFile = null" />
          </div>
        </el-card>

        <!-- 生成按钮 -->
        <div class="generate-actions">
          <el-button
            type="primary"
            size="large"
            :loading="generating"
            @click="handleGenerate"
            :disabled="!canGenerate || cancelling"
            class="generate-btn"
          >
            <el-icon v-if="effectiveMode === 'video-edit'"><MagicStick /></el-icon>
            <el-icon v-else><VideoCamera /></el-icon>
            {{ generating ? '提交中...' : generateBtnText }}
          </el-button>
          <el-button
            v-if="generating || taskStatus === 'processing'"
            type="danger"
            size="large"
            :loading="cancelling"
            @click="cancelGeneration"
            class="cancel-btn"
          >
            <el-icon><Close /></el-icon>
            取消生成
          </el-button>
        </div>
      </div>

      <!-- 右侧：结果预览 -->
      <div class="main-right">
        <ResultPreview
          :video-url="resultVideo"
          :status="taskStatus"
          :task-id="taskId"
          :provider="selectedProvider"
          @poll="pollTask"
        />
      </div>
    </div>

    <!-- 历史记录 -->
    <el-card v-if="history.length" class="history-card" shadow="hover">
      <template #header>
        <span>生成历史</span>
        <el-button size="small" text type="danger" style="float:right" @click="history = []">清空</el-button>
      </template>
      <div class="history-grid">
        <div v-for="(item, idx) in history" :key="idx" class="history-item" @click="loadHistoryItem(item)">
          <template v-if="item.videoUrl">
            <video :src="item.videoUrl" muted />
            <div class="history-meta">
              <el-tag size="small">{{ item.modeLabel }}</el-tag>
              <span>{{ new Date(item.time).toLocaleTimeString() }}</span>
            </div>
          </template>
          <template v-else>
            <div class="history-pending">
              <el-icon :size="24" class="rotating"><Loading /></el-icon>
              <span>{{ item.taskId?.slice(0, 12) }}...</span>
            </div>
            <div class="history-meta">
              <el-tag size="small" type="warning">生成中</el-tag>
              <el-button size="small" text @click.stop="pollHistoryItem(item, idx)">刷新</el-button>
            </div>
          </template>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Loading, Upload, VideoCamera, MagicStick, Warning, Refresh, Close } from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'
import ResultPreview from '../components/ResultPreview.vue'
import RichPromptEditor from '../components/RichPromptEditor.vue'
import MediaUploadPanel from '../components/MediaUploadPanel.vue'

const authStore = useAuthStore()
const videoProviders = ref([])
const selectedProvider = ref('')
const selectedModel = ref('')
const modelOptions = ref([])
const fetchingModels = ref(false)
const generating = ref(false)
const cancelling = ref(false)
const pollIntervalId = ref(null)
const ratio = ref('adaptive')
const resolution = ref('720p')
const duration = ref(-1)
const generateAudio = ref(true)
const watermark = ref(false)
const resultVideo = ref('')
const taskId = ref('')
const taskStatus = ref('')
const history = ref([])

// Unified state — replaces the 4 tab-specific form objects
const selectedMode = ref('auto')
const prompt = ref('')
const negativePrompt = ref('')
const editVideoUrl = ref('')
const editVideoFile = ref(null)
const mediaItems = ref([])
const editorRef = ref(null)
const mediaPanelRef = ref(null)

const modeLabelMap = { 'text-to-video': '文生视频', 'reference-to-video': '参考生视频', 'video-edit': '视频编辑' }

const availableReferences = computed(() =>
  mediaItems.value.map(m => ({ label: m.label, type: m.type }))
)

const effectiveMode = computed(() => {
  if (selectedMode.value !== 'auto') return selectedMode.value
  // Video-edit is a special mode — never auto-detect, must be explicitly selected
  if (mediaItems.value.length > 0) return 'reference-to-video'
  return 'text-to-video'
})

const effectiveModeLabel = computed(() => modeLabelMap[effectiveMode.value] || effectiveMode.value)

const canGenerate = computed(() => {
  if (!selectedProvider.value) return false
  if (effectiveMode.value === 'video-edit')
    return !!(prompt.value.trim() && (editVideoUrl.value.trim() || editVideoFile.value))
  if (effectiveMode.value === 'text-to-video')
    return !!prompt.value.trim()
  return mediaItems.value.length > 0 || prompt.value.trim().length > 0
})

const generateBtnText = computed(() => {
  if (effectiveMode.value === 'video-edit') return '开始编辑'
  return '生成视频'
})

const promptPlaceholder = computed(() => {
  if (effectiveMode.value === 'video-edit') return '描述你想对视频做什么修改...'
  return '描述你想生成的视频内容\n上传素材后可用 @图像1、@视频1、@音频1 引用它们\n例如：参考@视频1的镜头语言，生成@图像1和@图像2的打斗场面...'
})

function onInsertLabel(label) {
  editorRef.value?.insertAtCursor(`@${label}`)
  editorRef.value?.focus()
}

function onEditVideoFileChange(file) {
  editVideoFile.value = file.raw
  editVideoUrl.value = ''
}

// --- Provider & Model ---
async function loadProviders() {
  try {
    const res = await authStore.fetchWithAuth('/api/keys')
    const data = await res.json()
    if (data.success && data.data.video) {
      videoProviders.value = data.data.video
        .filter(p => p.available && !p.isCustom)
        .map(p => ({
          value: p.provider,
          label: p.label,
          icon: p.icon || '',
          storedModel: p.userKey?.model || p.globalKey?.model || ''
        }))
      if (videoProviders.value.length && !selectedProvider.value) {
        const first = videoProviders.value[0]
        selectedProvider.value = first.value
        if (first.storedModel) {
          selectedModel.value = first.storedModel
          modelOptions.value = [first.storedModel]
        }
      }
    }
  } catch {}
}

function onProviderChange() {
  selectedModel.value = ''
  modelOptions.value = []
  if (!selectedProvider.value) return
  const prov = videoProviders.value.find(p => p.value === selectedProvider.value)
  if (prov?.storedModel) {
    selectedModel.value = prov.storedModel
    modelOptions.value = [prov.storedModel]
  }
  nextTick(() => fetchModels())
}

async function fetchModels() {
  if (!selectedProvider.value) return
  fetchingModels.value = true
  try {
    const res = await authStore.fetchWithAuth('/api/keys/fetch-models', {
      method: 'POST', body: JSON.stringify({ provider: selectedProvider.value, type: 'video' })
    })
    const data = await res.json()
    if (data.success && data.data.models?.length) {
      modelOptions.value = data.data.models.map(m => m.id)
      if (!selectedModel.value) selectedModel.value = modelOptions.value[0]
      ElMessage.success(`获取到 ${data.data.total} 个模型`)
    } else { ElMessage.warning(data.message || '未获取到模型列表') }
  } catch (e) { ElMessage.error('获取模型列表失败: ' + e.message) }
  finally { fetchingModels.value = false }
}

// --- Polling ---
async function pollTask(tId, provider) {
  const p = provider || selectedProvider.value
  try {
    const res = await authStore.fetchWithAuth(`/api/video/task/${tId}?provider=${p}`)
    const d = await res.json()
    if (d.success) {
      taskStatus.value = d.data.status
      if (d.data.videoUrl) { resultVideo.value = d.data.videoUrl; taskStatus.value = 'completed'; ElMessage.success('视频生成完成'); const hit = history.value.find(h => h.taskId === tId); if (hit) hit.videoUrl = d.data.videoUrl }
      else if (d.data.status === 'failed') { taskStatus.value = 'failed'; ElMessage.error(d.data.error || '视频生成失败') }
    }
  } catch {}
}

function startPolling(tId, prov) {
  const provider = prov || selectedProvider.value
  const interval = setInterval(async () => {
    try {
      const res = await authStore.fetchWithAuth(`/api/video/task/${tId}?provider=${provider}`)
      const d = await res.json()
      if (d.success) {
        const hit = history.value.find(h => h.taskId === tId)
        if (d.data.videoUrl) { resultVideo.value = d.data.videoUrl; taskStatus.value = 'completed'; if (hit) hit.videoUrl = d.data.videoUrl; clearPolling(tId); ElMessage.success('视频生成完成') }
        else if (d.data.status === 'failed') { taskStatus.value = 'failed'; clearPolling(tId); if (hit) hit.videoUrl = ''; ElMessage.error(d.data.error || '视频生成失败') }
      }
    } catch {}
  }, 5000)
  const timeout = setTimeout(() => { clearInterval(interval); clearPolling(tId) }, 300000)
  const old = pollIntervalId.value
  if (old) clearInterval(old.interval)
  pollIntervalId.value = { taskId: tId, interval, timeout }
}

function clearPolling(tId) {
  const p = pollIntervalId.value
  if (!p || p.taskId !== tId) return
  clearInterval(p.interval)
  clearTimeout(p.timeout)
  pollIntervalId.value = null
  generating.value = false
}

async function cancelGeneration() {
  cancelling.value = true
  try {
    const p = pollIntervalId.value
    if (p) {
      clearInterval(p.interval)
      clearTimeout(p.timeout)
      pollIntervalId.value = null
    }
    if (taskId.value) {
      try {
        await authStore.fetchWithAuth(`/api/video/task/${taskId.value}`, { method: 'DELETE' })
      } catch {}
    }
    taskStatus.value = 'cancelled'
    resultVideo.value = ''
    taskId.value = ''
    generating.value = false
    ElMessage.info('已取消生成')
  } finally {
    cancelling.value = false
  }
}

// --- Generate ---
async function handleGenerate() {
  if (!selectedProvider.value) { ElMessage.warning('请先选择视频厂商'); return }
  generating.value = true; resultVideo.value = ''; taskId.value = ''; taskStatus.value = ''

  const mode = effectiveMode.value
  const fd = new FormData()
  fd.append('provider', selectedProvider.value)
  if (selectedModel.value) fd.append('model', selectedModel.value)
  fd.append('mode', mode)
  fd.append('duration', duration.value)
  fd.append('ratio', ratio.value)
  fd.append('resolution', resolution.value)
  fd.append('generateAudio', generateAudio.value)
  fd.append('watermark', watermark.value)
  fd.append('prompt', prompt.value || '')

  if (mode === 'text-to-video' && negativePrompt.value) {
    fd.append('negativePrompt', negativePrompt.value)
  }

  if (mode === 'video-edit') {
    if (editVideoUrl.value) fd.append('videoUrl', editVideoUrl.value)
    if (editVideoFile.value) fd.append('referenceVideo', editVideoFile.value)
  }

  // Build fileLabels and append files via MediaUploadPanel
  const fileLabelsJson = mediaPanelRef.value.buildFormData(fd)
  fd.append('fileLabels', fileLabelsJson)

  try {
    const res = await authStore.fetchWithAuth('/api/video/generate', { method: 'POST', body: fd })
    const data = await res.json()
    if (data.success) {
      if (data.data.taskId) {
        taskId.value = data.data.taskId; taskStatus.value = 'processing'
        ElMessage.success('任务已提交，正在生成...')
        history.value.unshift({
          taskId: data.data.taskId, videoUrl: data.data.videoUrl || '',
          modeLabel: modeLabelMap[mode], provider: selectedProvider.value, time: Date.now()
        })
        startPolling(data.data.taskId)
      } else if (data.data.videoUrl) {
        resultVideo.value = data.data.videoUrl; taskStatus.value = 'completed'
        ElMessage.success('视频生成完成')
        history.value.unshift({
          taskId: '', videoUrl: data.data.videoUrl,
          modeLabel: modeLabelMap[mode], provider: selectedProvider.value, time: Date.now()
        })
      }
    } else { ElMessage.error(data.message || '生成失败') }
  } catch (e) { ElMessage.error('生成失败: ' + e.message) }
  finally { generating.value = false }
}

// --- History ---
function loadHistoryItem(item) {
  if (item.videoUrl) { resultVideo.value = item.videoUrl; taskStatus.value = 'completed' }
  else if (item.taskId) { taskId.value = item.taskId; taskStatus.value = 'processing' }
}
function pollHistoryItem(item) { if (item.taskId) pollTask(item.taskId, item.provider) }

async function loadHistory() {
  try {
    const res = await authStore.fetchWithAuth('/api/video/history?limit=50')
    const data = await res.json()
    if (data.success && data.data.list?.length) {
      history.value = data.data.list.map(t => ({
        taskId: t.taskId,
        videoUrl: t.videoUrl || '',
        modeLabel: modeLabelMap[t.mode] || t.mode,
        provider: t.provider,
        time: new Date(t.createdAt).getTime()
      }))
      history.value.forEach(t => {
        if (!t.videoUrl && t.taskId) startPolling(t.taskId, t.provider)
      })
    }
  } catch {}
}

onMounted(async () => {
  await loadProviders()
  loadHistory()
})
</script>

<style scoped>
.video-page { max-width: 1100px; margin: 0 auto; }
.page-banner { margin-bottom: 16px; }
.page-banner h2 { font-size: 22px; font-weight: 700; color: #303133; display: flex; align-items: center; gap: 8px; margin: 0 0 4px; }
.page-banner p { font-size: 13px; color: #909399; margin: 0; }
.config-card { margin-bottom: 16px; }
.field-label { font-size: 12px; color: #909399; margin-bottom: 4px; }
.no-provider-hint { margin-top: 12px; font-size: 13px; color: #e6a23c; display: flex; align-items: center; gap: 4px; }
.field-hint { font-size: 11px; color: #c0c4cc; margin-left: 12px; }

/* Main area */
.main-area { display: flex; gap: 20px; align-items: flex-start; }
.main-left { flex: 1; min-width: 0; }
.main-right { width: 380px; flex-shrink: 0; position: sticky; top: 16px; }

/* Mode bar */
.mode-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: #fafbfc;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
}
.mode-label { font-size: 13px; color: #606266; font-weight: 500; }
.mode-detect { font-size: 12px; color: #909399; }
.mode-detect strong { color: #7c3aed; }

/* Prompt section */
.prompt-section { margin-top: 12px; }

/* Generate button */
.generate-actions { margin-top: 16px; display: flex; gap: 12px; }
.generate-btn {
  flex: 1;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 8px;
}
.cancel-btn {
  height: 48px;
  font-size: 15px;
  border-radius: 8px;
}

/* History */
.history-card { margin-top: 16px; }
.history-grid { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 8px; }
.history-item { flex-shrink: 0; width: 160px; cursor: pointer; border-radius: 6px; overflow: hidden; border: 2px solid transparent; transition: border-color 0.2s; }
.history-item:hover { border-color: #7c3aed; }
.history-item video { width: 100%; height: 100px; object-fit: cover; display: block; }
.history-meta { padding: 6px 8px; display: flex; align-items: center; gap: 6px; font-size: 11px; color: #909399; background: #fafbfc; justify-content: space-between; }
.history-pending { height: 100px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; color: #909399; background: #fafbfc; font-size: 12px; }
.rotating { animation: spin 2s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Edit source card */
.edit-source-card {
  margin-top: 12px;
  border: 1px dashed #d3d6db;
  border-radius: 8px;
  background: #fafbfc;
}
.edit-source-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}
.edit-source-desc {
  font-size: 12px;
  color: #909399;
  margin: 0 0 8px;
}
.edit-file-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 6px 12px;
  background: rgba(124, 58, 237, 0.06);
  border: 1px solid rgba(124, 58, 237, 0.2);
  border-radius: 6px;
  font-size: 13px;
  color: #7c3aed;
}

@media (max-width: 767px) {
  .video-page { padding: 0 4px; }
  .page-banner h2 { font-size: 18px; }
  .page-banner p { font-size: 12px; }
  .config-card .el-row { flex-wrap: wrap; }
  .config-card .el-col { margin-bottom: 10px; }
  .config-card .el-checkbox { margin-bottom: 8px; }
  .field-hint { display: block; margin-left: 0; margin-top: 2px; }
  .main-area { flex-direction: column; }
  .main-left { width: 100%; }
  .main-right { width: 100%; position: static; }
  .mode-bar { flex-wrap: wrap; gap: 6px; }
  .generate-actions { flex-direction: column; }
  .generate-btn, .cancel-btn { width: 100%; height: 44px; font-size: 15px; }
  .history-grid { gap: 8px; }
  .history-item { width: 140px; }
}
</style>
