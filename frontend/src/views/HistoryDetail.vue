<template>
  <div class="detail-page">
    <el-button text @click="$router.back()" style="margin-bottom:12px">
      <el-icon><ArrowLeft /></el-icon>返回列表
    </el-button>

    <el-skeleton v-if="loading" :rows="10" animated />

    <template v-else-if="detail">
      <!-- 合集摘要卡片 -->
      <div class="collection-summary" v-if="detail.status === 'completed'">
        <div class="collection-info">
          <h2 class="collection-title">{{ dramaTitle }}</h2>
          <div class="collection-meta">
            <span><el-icon><Collection /></el-icon> 共 {{ totalEpisodes }} 集</span>
            <span><el-icon><Notebook /></el-icon> 约 {{ totalWords.toLocaleString() }} 字</span>
            <span><el-icon><Clock /></el-icon> {{ formatDate }}</span>
          </div>
        </div>
        <div class="collection-actions">
          <el-button @click="downloadAll">下载合集</el-button>
          <el-button type="primary" @click="handleContinue">续写第{{ nextEpisodeNumber }}集</el-button>
        </div>
      </div>

      <div class="detail-layout">
        <!-- 左侧：目录导航 -->
        <aside class="detail-toc">
          <div class="toc-title">目录导航</div>
          <nav class="toc-nav">
            <a
              v-for="item in tocItems"
              :key="item.key"
              :class="['toc-link', { active: activeToc === item.key }]"
              @click.prevent="scrollToSection(item.key)"
            >
              {{ item.icon }} {{ item.label }}
            </a>
            <template v-if="episodes.length">
              <div class="toc-divider"></div>
              <div class="toc-subtitle">续集</div>
              <a
                v-for="ep in episodes"
                :key="'ep' + ep.episodeNumber"
                :class="['toc-link toc-ep', { active: activeToc === 'ep' + ep.episodeNumber }]"
                @click.prevent="scrollToSection('ep' + ep.episodeNumber)"
              >
                第{{ ep.episodeNumber }}集
              </a>
            </template>
          </nav>

          <!-- 续写按钮 -->
          <div class="toc-continue" v-if="detail.status === 'completed'">
            <el-input
              v-model="continueInstruction"
              type="textarea"
              :rows="2"
              placeholder="续写指示（可选）：侧重什么方向、补充什么剧情..."
              size="small"
              :disabled="continuing"
            />
            <el-button
              type="primary"
              size="small"
              :loading="continuing"
              @click="handleContinue"
              style="margin-top:8px;width:100%"
            >
              <el-icon><MagicStick /></el-icon>
              {{ continuing ? '续写中...' : `续写第${nextEpisodeNumber}集` }}
            </el-button>
            <p class="toc-continue-hint">AI将基于已有大纲、角色和剧情自动续写，可在上方补充你想要的剧情方向</p>
          </div>
        </aside>

        <!-- 右侧：内容区 -->
        <div class="detail-content">
          <div class="detail-header">
            <h2>{{ dramaTitle }}</h2>
            <el-tag type="success" size="small">已完成</el-tag>
          </div>

          <div v-for="item in tocItems" :key="item.key" :id="item.key" class="content-section">
            <ResultCard
              :title="item.label"
              :icon="item.icon"
              :content="getContent(item.key)"
              :section="item.key"
              :task-id="taskId"
            />
          </div>

          <!-- 续集内容 -->
          <template v-for="ep in episodes" :key="'ep' + ep.episodeNumber">
            <div :id="'ep' + ep.episodeNumber" class="content-section">
              <ResultCard
                :title="`第${ep.episodeNumber}集 剧本`"
                icon=""
                :content="ep.script"
                :section="`ep${ep.episodeNumber}-script`"
                :task-id="taskId"
              />
            </div>
            <div v-if="ep.storyboard" class="content-section">
              <ResultCard
                :title="`第${ep.episodeNumber}集 分镜表`"
                icon=""
                :content="ep.storyboard"
                :section="`ep${ep.episodeNumber}-storyboard`"
                :task-id="taskId"
              />
            </div>
          </template>

          <!-- 续写中状态 -->
          <div v-if="continuing" class="content-section">
            <el-card class="result-card">
              <div class="continue-loading">
                <el-icon :size="32" class="rotating"><Loading /></el-icon>
                <p>正在续写第{{ nextEpisodeNumber }}集...</p>
                <p class="sub-text">基于已有大纲、角色和剧情自动生成，预计1-3分钟</p>
              </div>
            </el-card>
          </div>
        </div>
      </div>
    </template>

    <el-empty v-else description="未找到该记录" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, MagicStick, Loading, Collection, Notebook, Clock } from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'
import ResultCard from '../components/ResultCard.vue'

const route = useRoute()
const authStore = useAuthStore()
const taskId = route.params.taskId
const detail = ref(null)
const loading = ref(true)
const activeToc = ref('outline')
const continuing = ref(false)
const continueInstruction = ref('')
const episodes = ref([])
let pollTimer = null

const tocItems = [
  { key: 'outline', label: '故事大纲', icon: '' },
  { key: 'characters', label: '角色设定', icon: '' },
  { key: 'structure', label: '剧情结构', icon: '' },
  { key: 'script', label: '第一集剧本', icon: '' },
  { key: 'storyboard', label: '分镜表', icon: '' },
]

const nextEpisodeNumber = computed(() => episodes.value.length + 2)

const totalEpisodes = computed(() => episodes.value.length + 1)

const totalWords = computed(() => {
  let count = 0
  for (const key of ['outline', 'characters', 'structure', 'script', 'storyboard']) {
    count += (getContent(key) || '').length
  }
  for (const ep of episodes.value) {
    count += (ep.script || '').length + (ep.storyboard || '').length
  }
  return count
})

const formatDate = computed(() => {
  const d = detail.value?.createdAt
  if (!d) return ''
  return new Date(d).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
})

const dramaTitle = computed(() => {
  const outline = detail.value?.generatedContent?.outline || detail.value?.result?.outline || ''
  const match = outline.match(/^#\s+(.+)/m)
  return match ? match[1] : (detail.value?.userInput?.theme || '未命名')
})

function getContent(key) {
  if (detail.value?.generatedContent) {
    return detail.value.generatedContent[key] || ''
  }
  if (detail.value?.result) {
    return detail.value.result[key] || ''
  }
  return ''
}

function scrollToSection(id) {
  activeToc.value = id
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function downloadAll() {
  const title = dramaTitle.value || '短剧剧本'
  let text = `# ${title}\n\n> 生成时间：${formatDate.value}\n> 共 ${totalEpisodes.value} 集 · 约 ${totalWords.value.toLocaleString()} 字\n\n---\n\n`
  for (const item of tocItems) {
    text += `## ${item.label}\n\n${getContent(item.key) || ''}\n\n---\n\n`
  }
  for (const ep of episodes.value) {
    text += `## 第${ep.episodeNumber}集 剧本\n\n${ep.script || ''}\n\n`
    if (ep.storyboard) text += `## 第${ep.episodeNumber}集 分镜表\n\n${ep.storyboard || ''}\n\n`
    text += '---\n\n'
  }
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title}_合集.md`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('合集已下载')
}

// Intersection Observer to highlight current section in TOC
let observer = null
function setupObserver() {
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          activeToc.value = entry.target.id
        }
      }
    },
    { rootMargin: '-80px 0px -60% 0px' }
  )
  const ids = [...tocItems.map(i => i.key), ...episodes.value.map(e => 'ep' + e.episodeNumber)]
  for (const id of ids) {
    const el = document.getElementById(id)
    if (el) observer.observe(el)
  }
}

async function fetchDetail() {
  try {
    const res = await authStore.fetchWithAuth(`/api/history/${taskId}`)
    const data = await res.json()
    if (data.success) {
      detail.value = data.data
      if (data.data.episodes) episodes.value = data.data.episodes
    }
  } catch {} finally {
    loading.value = false
    setTimeout(setupObserver, 500)
  }
}

async function handleContinue() {
  continuing.value = true
  try {
    const res = await authStore.fetchWithAuth('/api/drama/continue', {
      method: 'POST',
      body: JSON.stringify({
        taskId,
        instruction: continueInstruction.value
      })
    })
    const data = await res.json()
    if (data.success) {
      ElMessage.success(data.message || '续写任务已提交')
      continueInstruction.value = ''
      startPolling()
    } else {
      ElMessage.error(data.message || '续写失败')
      continuing.value = false
    }
  } catch (e) {
    ElMessage.error('续写失败: ' + e.message)
    continuing.value = false
  }
}

function startPolling() {
  pollTimer = setInterval(async () => {
    try {
      const res = await authStore.fetchWithAuth(`/api/drama/status/${taskId}`)
      const data = await res.json()
      if (!data.success) return

      if (data.data.status === 'completed' && data.data.episodes) {
        const newEps = data.data.episodes || []
        if (newEps.length > episodes.value.length) {
          ElMessage.success('续写完成！')
          episodes.value = newEps
          continuing.value = false
          clearInterval(pollTimer)
          setTimeout(setupObserver, 300)
        }
      }
      if (data.data.status === 'failed') {
        ElMessage.error('续写失败')
        continuing.value = false
        clearInterval(pollTimer)
      }
    } catch {}
  }, 3000)
}

onMounted(fetchDetail)
onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
  if (observer) observer.disconnect()
})
</script>

<style scoped>
.detail-page {
  max-width: 1200px;
  margin: 0 auto;
}

/* Collection Summary */
.collection-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #f5f4fa 0%, #ede9fe 100%);
  border: 1px solid #ddd6fe;
  border-radius: 12px;
  padding: 20px 24px;
  margin-bottom: 20px;
}
.collection-title {
  font-size: 18px;
  font-weight: 700;
  color: #303133;
  margin: 0 0 8px;
}
.collection-meta {
  display: flex;
  gap: 20px;
  font-size: 13px;
  color: #909399;
}
.collection-meta span {
  display: flex;
  align-items: center;
  gap: 4px;
}
.collection-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.detail-layout {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

/* Left TOC sidebar */
.detail-toc {
  width: 200px;
  flex-shrink: 0;
  position: sticky;
  top: 16px;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
}

.toc-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
}

.toc-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.toc-link {
  display: block;
  padding: 6px 10px;
  font-size: 13px;
  color: #606266;
  text-decoration: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
  border-left: 2px solid transparent;
}

.toc-link:hover {
  background: #f5f7fa;
  color: #303133;
}

.toc-link.active {
  background: rgba(124, 58, 237, 0.08);
  color: #7c3aed;
  border-left-color: #7c3aed;
  font-weight: 500;
}

.toc-divider {
  height: 1px;
  background: #ebeef5;
  margin: 6px 0;
}

.toc-subtitle {
  font-size: 11px;
  color: #c0c4cc;
  padding: 2px 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.toc-ep {
  font-size: 12px;
  padding-left: 16px;
}

.toc-continue {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
}

.toc-continue-hint {
  font-size: 11px;
  color: #c0c4cc;
  margin-top: 6px;
  line-height: 1.4;
}

/* Right content area */
.detail-content {
  flex: 1;
  min-width: 0;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.detail-header h2 {
  font-size: 20px;
  font-weight: 700;
  color: #303133;
  margin: 0;
}

.content-section {
  scroll-margin-top: 80px;
}

.continue-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #909399;
}

.continue-loading p {
  margin-top: 12px;
  font-size: 14px;
}

.sub-text {
  font-size: 12px !important;
  color: #c0c4cc;
}

.rotating { animation: spin 2s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 767px) {
  .detail-page { padding: 0 4px; }
  .collection-summary { flex-direction: column; gap: 12px; padding: 16px; }
  .collection-meta { flex-wrap: wrap; gap: 10px; }
  .collection-actions { width: 100%; }
  .collection-actions .el-button { flex: 1; }
  .detail-layout { flex-direction: column; }
  .detail-toc {
    width: 100%;
    position: sticky;
    top: 0;
    z-index: 100;
    max-height: none;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 4px;
    padding: 10px 12px;
    background: #fff;
    border-bottom: 1px solid #ebeef5;
    border-radius: 0;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  }
  .toc-title {
    display: none;
  }
  .toc-nav {
    flex-direction: row;
    flex-wrap: nowrap;
    gap: 4px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 4px;
  }
  .toc-link {
    font-size: 12px;
    padding: 5px 10px;
    white-space: nowrap;
    border-left: none;
    border-bottom: none;
    border-radius: 14px;
    background: #f5f7fa;
    flex-shrink: 0;
  }
  .toc-link.active {
    border-left-color: transparent;
    background: #7c3aed;
    color: #fff;
    font-weight: 500;
  }
  .toc-divider { display: none; }
  .toc-subtitle { width: 100%; }
  .toc-continue { display: none; }
  .detail-header h2 { font-size: 17px; }
}
</style>
