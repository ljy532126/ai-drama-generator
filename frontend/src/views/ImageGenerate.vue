<template>
  <div class="image-page">
    <div class="page-banner">
      <h2><el-icon><Picture /></el-icon> 图片生成</h2>
      <p>文生图 / 图生图 / 图像编辑 · 接入火山方舟 Seedream 和阿里千问 Qwen-Image
        <template v-if="isQwen">
          · 当前模式: <strong>{{ imagesCount > 0 ? '图像编辑（图生图）' : '文生图' }}</strong>
          <span class="field-hint">（千问自动根据是否有参考图切换API）</span>
        </template>
      </p>
    </div>

    <!-- 配置栏 -->
    <el-card class="config-card" shadow="hover">
      <el-row :gutter="16" align="middle" style="margin-bottom:12px">
        <el-col :xs="24" :sm="12" :md="6">
          <div class="field-label">图片厂商</div>
          <el-select v-model="selectedProvider" placeholder="选择厂商" size="default" style="width:100%" @change="onProviderChange">
            <el-option v-for="p in providers" :key="p.value" :label="p.label" :value="p.value">
              <span>{{ p.icon }} {{ p.label }}</span>
            </el-option>
          </el-select>
        </el-col>
        <el-col :xs="24" :sm="12" :md="10">
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
        <el-col :xs="12" :sm="12" :md="4">
          <div class="field-label">{{ isQwen ? '尺寸 (宽*高)' : '尺寸' }}</div>
          <template v-if="isQwen">
            <el-select v-model="qwenSize" size="default" style="width:100%" filterable allow-create>
              <el-option label="1024*1024 (1:1)" value="1024*1024" />
              <el-option label="768*1152 (2:3)" value="768*1152" />
              <el-option label="1152*768 (3:2)" value="1152*768" />
              <el-option label="960*1280 (3:4)" value="960*1280" />
              <el-option label="1280*960 (4:3)" value="1280*960" />
              <el-option label="720*1280 (9:16)" value="720*1280" />
              <el-option label="1280*720 (16:9)" value="1280*720" />
              <el-option label="1440*1440 (1:1)" value="1440*1440" />
            </el-select>
          </template>
          <template v-else>
            <el-select v-model="imgSize" size="default" style="width:100%">
              <el-option label="2K" value="2K" />
              <el-option label="3K" value="3K" />
              <el-option label="4K" value="4K" />
            </el-select>
          </template>
        </el-col>
        <el-col :xs="12" :sm="12" :md="4">
          <div class="field-label">{{ isQwen ? '生成张数' : '宽高比' }}</div>
          <template v-if="isQwen">
            <el-input-number v-model="numImages" :min="1" :max="6" size="default" style="width:100%" />
          </template>
          <template v-else>
            <el-select v-model="imgRatio" size="default" style="width:100%">
              <el-option label="自适应" value="auto" />
              <el-option label="1:1" value="1:1" />
              <el-option label="16:9" value="16:9" />
              <el-option label="9:16" value="9:16" />
              <el-option label="4:3" value="4:3" />
              <el-option label="3:4" value="3:4" />
            </el-select>
          </template>
        </el-col>
      </el-row>
      <!-- Ark 高级选项 -->
      <el-row v-if="!isQwen" :gutter="16" align="middle">
        <el-col :xs="12" :sm="12" :md="4">
          <div class="field-label">生成张数</div>
          <el-input-number v-model="numImages" :min="1" :max="4" size="default" style="width:100%" />
        </el-col>
        <el-col :xs="12" :sm="12" :md="5">
          <div class="field-label">引导系数 (guidance_scale)</div>
          <el-slider v-model="guidance" :min="1" :max="10" :step="0.5" show-input :show-input-controls="false" size="default" />
        </el-col>
        <el-col :xs="24" :sm="12" :md="5">
          <div class="field-label">随机种子 (seed)</div>
          <el-input v-model="genSeed" placeholder="留空随机" clearable size="default">
            <template #append>
              <el-button @click="genSeed = String(Math.floor(Math.random() * 9999999999))">随机</el-button>
            </template>
          </el-input>
        </el-col>
        <el-col :xs="24" :sm="12" :md="10">
          <div class="field-label">选项</div>
          <el-checkbox v-model="watermark" border>水印</el-checkbox>
          <el-checkbox v-model="outputPng" border style="margin-left:8px">PNG</el-checkbox>
          <el-checkbox v-model="optimizePrompt" border style="margin-left:8px">优化提示词</el-checkbox>
        </el-col>
      </el-row>
      <!-- Qwen 高级选项 -->
      <el-row v-else :gutter="16" align="middle">
        <el-col :xs="24" :sm="12" :md="6">
          <div class="field-label">反向提示词 (negative_prompt)</div>
          <el-input v-model="negativePrompt" placeholder="不想出现的内容..." clearable size="default" />
        </el-col>
        <el-col :xs="24" :sm="12" :md="4">
          <div class="field-label">随机种子 (seed)</div>
          <el-input v-model="genSeed" placeholder="留空随机" clearable size="default">
            <template #append>
              <el-button @click="genSeed = String(Math.floor(Math.random() * 2147483647))">随机</el-button>
            </template>
          </el-input>
        </el-col>
        <el-col :xs="24" :sm="12" :md="14">
          <div class="field-label">选项</div>
          <el-checkbox v-model="watermark" border>Qwen水印</el-checkbox>
          <el-checkbox v-model="qwenPromptExtend" border style="margin-left:8px">智能改写提示词</el-checkbox>
          <span class="field-hint">最多3张参考图 · 输出1-6张 · PNG格式</span>
        </el-col>
      </el-row>
      <div v-if="!providers.length" class="no-provider-hint">
        <el-icon><Warning /></el-icon> 尚未配置图片模型 Key，请先到「个人中心 → API Key 管理」配置
      </div>
    </el-card>

    <!-- 生成区域 -->
    <el-card class="main-card" shadow="hover">
      <el-row :gutter="20">
        <!-- 左侧：输入 -->
        <el-col :xs="24" :md="14">
          <el-form label-position="top">
            <el-form-item label="描述词 (Prompt)" required>
              <el-input v-model="prompt" type="textarea" :rows="5"
                placeholder="描述你想生成的图片内容，越详细效果越好&#10;例如：一只戴着帽子的柯基犬，在阳光下的草地上玩耍，电影级光影，细节丰富，4K" />
            </el-form-item>
            <el-form-item label="参考图片（可选，多张上传或填URL）">
              <div class="url-inputs">
                <div v-for="(url, idx) in imageUrls" :key="'url'+idx" class="url-row">
                  <el-input v-model="imageUrls[idx]" placeholder="输入参考图片URL" clearable>
                    <template #prepend>URL {{ idx + 1 }}</template>
                  </el-input>
                  <el-button v-if="imageUrls.length > 1" :icon="Delete" circle size="small" @click="imageUrls.splice(idx,1)" />
                </div>
                <el-button size="small" text type="primary" @click="imageUrls.push('')">
                  <el-icon><Plus /></el-icon> 添加URL
                </el-button>
              </div>
              <el-upload :auto-upload="false" :show-file-list="false" :on-change="onFileChange" accept="image/*" multiple style="margin-top:6px">
                <el-button size="small" text type="primary"><el-icon><Upload /></el-icon> 本地上传图片</el-button>
              </el-upload>
              <div v-if="allPreviews.length" class="preview-row">
                <div v-for="(p, idx) in allPreviews" :key="idx" class="preview-item">
                  <img :src="p" />
                  <el-icon class="preview-remove" @click="removeImage(idx)"><CircleClose /></el-icon>
                </div>
              </div>
            </el-form-item>
            <div class="generate-actions">
              <el-button type="primary" size="large" :loading="generating" @click="generate" :disabled="!prompt.trim() || !selectedProvider || cancelling" style="flex:1">
                <el-icon><Picture /></el-icon> 生成图片
              </el-button>
              <el-button
                v-if="generating"
                type="danger"
                size="large"
                :loading="cancelling"
                @click="cancelGenerate"
              >
                <el-icon><Close /></el-icon>
                取消
              </el-button>
            </div>
          </el-form>
        </el-col>

        <!-- 右侧：结果预览 -->
        <el-col :xs="24" :md="10">
          <div class="result-area">
            <div class="result-label">生成结果</div>

            <div v-if="generating" class="result-state">
              <el-icon :size="36" class="rotating"><Loading /></el-icon>
              <p>正在生成中...</p>
            </div>

            <div v-else-if="resultImages.length" class="result-grid">
              <div v-for="(img, idx) in resultImages" :key="idx" class="result-item">
                <img :src="img.url" />
                <div class="result-actions">
                  <el-button size="small" text @click="copyUrl(img.url)">
                    <el-icon><Link /></el-icon>
                  </el-button>
                  <el-button size="small" text @click="downloadImg(img.url)">
                    <el-icon><Download /></el-icon>
                  </el-button>
                </div>
              </div>
            </div>

            <div v-else-if="errorMsg" class="result-state">
              <el-icon :size="36" color="#f56c6c"><CircleClose /></el-icon>
              <p style="color:#f56c6c;text-align:center;font-size:13px">{{ errorMsg }}</p>
            </div>

            <div v-else class="result-state">
              <el-icon :size="36"><Picture /></el-icon>
              <p>输入提示词后点击生成</p>
            </div>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- 历史记录 -->
    <el-card v-if="history.length" class="history-card" shadow="hover">
      <template #header>
        <span>生成历史</span>
        <el-button size="small" text type="danger" style="float:right" @click="history=[];page=1;total=0">清空</el-button>
      </template>
      <div class="history-grid">
        <div v-for="(item, idx) in history" :key="idx" class="h-item" @click="loadHistoryItem(item)">
          <template v-if="item.imageUrls?.[0]">
            <img :src="item.imageUrls[0]" />
          </template>
          <template v-else>
            <div class="h-failed">
              <el-icon :size="20" color="#f56c6c"><CircleClose /></el-icon>
              <span>失败</span>
            </div>
          </template>
          <div class="h-meta">
            <el-tag size="small">{{ item.provider }}</el-tag>
            <span>{{ new Date(item.createdAt || item.time).toLocaleTimeString() }}</span>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Delete, Plus, Loading, Upload, Picture, Warning, CircleClose, Link, Download } from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const providers = ref([])
const selectedProvider = ref('')
const selectedModel = ref('')
const modelOptions = ref([])
const fetchingModels = ref(false)
const generating = ref(false)
const cancelling = ref(false)
const abortCtrl = ref(null)
const imgSize = ref('2K')
const imgRatio = ref('auto')
const qwenSize = ref('1024*1024')
const numImages = ref(1)
const guidance = ref(3.5)
const genSeed = ref('')
const optimizePrompt = ref(false)
const watermark = ref(false)
const outputPng = ref(true)
const negativePrompt = ref('')
const qwenPromptExtend = ref(true)

const isQwen = computed(() => selectedProvider.value && (selectedProvider.value.startsWith('qwen') || selectedProvider.value.includes('qwen')))
const imagesCount = computed(() => imageUrls.value.filter(Boolean).length + files.value.length)

// 分辨率+宽高比 → 像素尺寸映射（来自火山方舟推荐值）
const SIZE_MAP = {
  '2K': { '1:1': '2048x2048', '4:3': '2304x1728', '3:4': '1728x2304', '16:9': '2848x1600', '9:16': '1600x2848' },
  '3K': { '1:1': '3072x3072', '4:3': '3456x2592', '3:4': '2592x3456', '16:9': '4096x2304', '9:16': '2304x4096' },
  '4K': { '1:1': '4096x4096', '4:3': '4704x3520', '3:4': '3520x4704', '16:9': '5504x3040', '9:16': '3040x5504' },
}

function getSizeForRequest() {
  if (isQwen.value) return qwenSize.value
  if (imgRatio.value === 'auto') return imgSize.value
  return SIZE_MAP[imgSize.value]?.[imgRatio.value] || imgSize.value
}
const prompt = ref('')
const imageUrls = ref([''])
const files = ref([])
const resultImages = ref([])
const errorMsg = ref('')
const history = ref([])

const allPreviews = computed(() => {
  const p = []
  imageUrls.value.filter(Boolean).forEach(u => p.push(u))
  files.value.forEach(f => p.push(f.preview))
  return p
})

async function loadProviders() {
  try {
    const res = await authStore.fetchWithAuth('/api/keys')
    const data = await res.json()
    if (data.success && data.data.image) {
      providers.value = data.data.image
        .filter(p => p.available && !p.isCustom)
        .map(p => ({
          value: p.provider,
          label: p.label,
          icon: p.icon || '',
          storedModel: p.userKey?.model || p.globalKey?.model || ''
        }))
      if (providers.value.length && !selectedProvider.value) {
        const first = providers.value[0]
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
  const prov = providers.value.find(p => p.value === selectedProvider.value)
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
      method: 'POST', body: JSON.stringify({ provider: selectedProvider.value, type: 'image' })
    })
    const data = await res.json()
    if (data.success && data.data.models?.length) {
      modelOptions.value = [...new Set([...modelOptions.value, ...data.data.models.map(m => m.id)])]
      if (!selectedModel.value) selectedModel.value = modelOptions.value[0]
      ElMessage.success(`获取到 ${data.data.total} 个模型`)
    } else { ElMessage.warning(data.message || '未获取到模型列表') }
  } catch (e) { ElMessage.error('获取模型列表失败: ' + e.message) }
  finally { fetchingModels.value = false }
}

function onFileChange(file) {
  files.value.push({ raw: file.raw, preview: URL.createObjectURL(file.raw) })
}

function removeImage(idx) {
  const urlCount = imageUrls.value.filter(Boolean).length
  if (idx < urlCount) {
    imageUrls.value = imageUrls.value.filter((_, i) => i !== idx)
    if (!imageUrls.value.length) imageUrls.value.push('')
  } else {
    files.value.splice(idx - urlCount, 1)
  }
}

async function generate() {
  if (!selectedProvider.value) { ElMessage.warning('请先选择图片厂商'); return }
  generating.value = true; resultImages.value = []; errorMsg.value = ''

  const fd = new FormData()
  fd.append('provider', selectedProvider.value)
  if (selectedModel.value) fd.append('model', selectedModel.value)
  fd.append('prompt', prompt.value)
  fd.append('size', getSizeForRequest())
  fd.append('watermark', watermark.value)
  fd.append('outputFormat', outputPng.value ? 'png' : 'jpeg')
  fd.append('maxImages', String(numImages.value))
  if (isQwen.value) {
    if (negativePrompt.value) fd.append('negativePrompt', negativePrompt.value)
    fd.append('promptExtend', String(qwenPromptExtend.value))
  } else {
    if (guidance.value !== 3.5) fd.append('guidanceScale', String(guidance.value))
    if (optimizePrompt.value) fd.append('optimizePrompt', 'true')
  }
  if (genSeed.value) fd.append('seed', genSeed.value)

  const urls = imageUrls.value.filter(Boolean)
  if (urls.length) fd.append('imageUrls', JSON.stringify(urls))
  files.value.forEach(f => fd.append('images', f.raw))

  const ctrl = new AbortController()
  abortCtrl.value = ctrl

  try {
    const res = await authStore.fetchWithAuth('/api/image/generate', { method: 'POST', body: fd, signal: ctrl.signal })
    const data = await res.json()
    if (data.success) {
      resultImages.value = data.data.images || []
      if (resultImages.value.length) {
        ElMessage.success(`生成了 ${resultImages.value.length} 张图片`)
        history.value.unshift({
          _id: Date.now().toString(),
          provider: selectedProvider.value,
          imageUrls: resultImages.value.map(img => img.url),
          createdAt: new Date().toISOString()
        })
      } else {
        ElMessage.warning('生成完成但未返回图片')
      }
    } else {
      errorMsg.value = data.message || '生成失败'
      ElMessage.error(errorMsg.value)
    }
  } catch (e) {
    if (e.name === 'AbortError') {
      errorMsg.value = ''
      ElMessage.info('已取消生成')
    } else {
      errorMsg.value = '生成失败: ' + e.message
      ElMessage.error(errorMsg.value)
    }
  } finally {
    generating.value = false
    abortCtrl.value = null
  }
}

function cancelGenerate() {
  cancelling.value = true
  try {
    if (abortCtrl.value) {
      abortCtrl.value.abort()
      abortCtrl.value = null
    }
  } finally {
    cancelling.value = false
  }
}

function loadHistoryItem(item) {
  if (item.imageUrls?.length) {
    resultImages.value = item.imageUrls.map(url => ({ url }))
    errorMsg.value = ''
  }
}

function copyUrl(url) {
  if (url && /^https?:\/\//.test(url)) {
    navigator.clipboard.writeText(url).then(() => ElMessage.success('链接已复制'))
  } else {
    ElMessage.warning('无效的图片链接')
  }
}

function downloadImg(url) {
  if (!url || !/^https?:\/\//.test(url)) { ElMessage.warning('无效的图片链接'); return }
  const a = document.createElement('a'); a.href = url; a.download = 'image.png'; a.target = '_blank'; a.click()
}

async function loadHistory() {
  try {
    const res = await authStore.fetchWithAuth('/api/image/history?limit=30')
    const data = await res.json()
    if (data.success && data.data.list?.length) {
      history.value = data.data.list
    }
  } catch {}
}

onMounted(async () => {
  await loadProviders()
  loadHistory()
})
</script>

<style scoped>
.image-page { max-width: 1100px; margin: 0 auto; }
.page-banner { margin-bottom: 16px; }
.page-banner h2 { font-size: 22px; font-weight: 700; color: #303133; display: flex; align-items: center; gap: 8px; margin: 0 0 4px; }
.page-banner p { font-size: 13px; color: #909399; margin: 0; }
.config-card { margin-bottom: 16px; }
.field-label { font-size: 12px; color: #909399; margin-bottom: 4px; }
.no-provider-hint { margin-top: 12px; font-size: 13px; color: #e6a23c; display: flex; align-items: center; gap: 4px; }
.field-hint { font-size: 11px; color: #c0c4cc; margin-left: 12px; }
.main-card { margin-bottom: 16px; }
.url-inputs { margin-bottom: 4px; }
.url-row { display: flex; gap: 6px; margin-bottom: 6px; }
.preview-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
.preview-item { position: relative; width: 64px; height: 48px; }
.preview-item img { width: 100%; height: 100%; object-fit: cover; border-radius: 4px; border: 1px solid #e4e7ed; }
.preview-remove { position: absolute; top: -6px; right: -6px; color: #f56c6c; cursor: pointer; font-size: 16px; background: #fff; border-radius: 50%; }

.result-area { background: #fafbfc; border: 1px solid #e4e7ed; border-radius: 8px; padding: 16px; min-height: 360px; display: flex; flex-direction: column; }
.result-label { font-size: 14px; font-weight: 600; color: #303133; margin-bottom: 12px; }
.result-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #c0c4cc; }
.result-state p { margin-top: 8px; font-size: 13px; }
.result-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.result-item { position: relative; border-radius: 6px; overflow: hidden; }
.result-item img { width: 100%; display: block; border-radius: 6px; }
.result-actions { position: absolute; bottom: 4px; right: 4px; display: flex; gap: 4px; background: rgba(0,0,0,0.6); border-radius: 4px; padding: 2px; }
.result-actions .el-button { color: #fff; }

.generate-actions { display: flex; gap: 12px; }
.history-card { margin-top: 16px; }
.history-grid { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 8px; }
.h-item { flex-shrink: 0; width: 130px; cursor: pointer; border-radius: 6px; overflow: hidden; border: 2px solid transparent; transition: border-color 0.2s; }
.h-item:hover { border-color: #7c3aed; }
.h-item img { width: 100%; height: 90px; object-fit: cover; display: block; }
.h-failed { height: 90px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; background: #fef0f0; font-size: 12px; color: #f56c6c; }
.h-meta { padding: 6px; display: flex; align-items: center; gap: 4px; font-size: 11px; color: #909399; background: #fafbfc; justify-content: space-between; }
.rotating { animation: spin 2s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 767px) {
  .image-page { padding: 0 4px; }
  .page-banner h2 { font-size: 18px; }
  .page-banner p { font-size: 12px; }
  .config-card .el-col { margin-bottom: 10px; }
  .config-card .field-hint { display: block; margin-left: 0; margin-top: 2px; }
  .main-card .el-row { flex-wrap: wrap; }
  .main-card .el-col { margin-bottom: 12px; }
  .result-area { min-height: 200px; }
  .generate-actions { flex-direction: column; }
  .generate-actions .el-button { width: 100%; }
  .history-grid { gap: 8px; }
  .h-item { width: 110px; }
  .h-item img { height: 75px; }
  .preview-item { width: 48px; height: 36px; }
}
</style>
