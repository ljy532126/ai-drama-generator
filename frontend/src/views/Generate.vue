<template>
  <div class="generate-page">
    <!-- 页面头部 -->
    <div class="page-banner">
      <h2><el-icon><Edit /></el-icon> 剧本生成</h2>
      <p>填写设定，AI 自动完成从大纲到分镜的全流程创作</p>
    </div>

    <el-row :gutter="16">
      <!-- 左侧：创作表单 -->
      <el-col :span="showProgress || results ? 12 : 16" :class="{ 'form-full': !showProgress && !results }">
        <el-card class="form-card" shadow="hover">
          <el-form :model="form" label-position="top">
            <el-form-item label="短剧题材" required>
              <el-input
                v-model="form.theme"
                placeholder="例如：都市爱情、悬疑推理、穿越逆袭..."
                size="large"
                clearable
              />
            </el-form-item>
            <el-form-item label="关键词" required>
              <el-input
                v-model="form.keywords"
                placeholder="例如：霸道总裁、失忆、复仇、逆袭..."
                size="large"
                clearable
              />
              <div class="keyword-chips">
                <el-tag
                  v-for="kw in presetKeywords"
                  :key="kw"
                  size="small"
                  :type="form.keywords.includes(kw) ? 'primary' : 'info'"
                  class="chip"
                  @click="toggleKeyword(kw)"
                >{{ kw }}</el-tag>
              </div>
            </el-form-item>

            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="类型">
                  <el-select
                    v-model="form.genre"
                    placeholder="选择或输入类型"
                    size="large"
                    style="width:100%"
                    filterable
                    allow-create
                    clearable
                  >
                    <el-option v-for="g in genres" :key="g.value" :label="g.label" :value="g.value">
                      <span>{{ g.icon }} {{ g.label }}</span>
                    </el-option>
                  </el-select>
                  <div class="chip-row">
                    <el-tag
                      v-for="g in genres.slice(1)"
                      :key="g.value"
                      size="small"
                      :type="form.genre === g.value ? 'primary' : ''"
                      class="chip"
                      @click="form.genre = form.genre === g.value ? '' : g.value"
                    >{{ g.icon }} {{ g.label }}</el-tag>
                  </div>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="风格">
                  <el-select
                    v-model="form.style"
                    placeholder="选择或输入风格"
                    size="large"
                    style="width:100%"
                    filterable
                    allow-create
                    clearable
                  >
                    <el-option v-for="s in styles" :key="s.value" :label="s.label" :value="s.value">
                      <span>{{ s.icon }} {{ s.label }}</span>
                    </el-option>
                  </el-select>
                  <div class="chip-row">
                    <el-tag
                      v-for="s in styles.slice(1)"
                      :key="s.value"
                      size="small"
                      :type="form.style === s.value ? 'primary' : ''"
                      class="chip"
                      @click="form.style = form.style === s.value ? '' : s.value"
                    >{{ s.icon }} {{ s.label }}</el-tag>
                  </div>
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="AI 厂商">
              <ProviderSelect v-model="form.provider" />
            </el-form-item>

            <el-form-item>
              <el-button
                type="primary"
                size="large"
                :loading="generating"
                @click="handleGenerate"
                class="generate-btn"
              >
                <el-icon v-if="!generating"><MagicStick /></el-icon>
                {{ generating ? '生成中，请耐心等待...' : '开始 AI 创作' }}
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <!-- 右侧：进度 + 结果 -->
      <el-col v-if="showProgress || results" :span="12">
        <ProgressPanel v-if="showProgress" :step="Math.max(0, currentStep - 1)" :status="stepStatus" />

        <template v-if="results">
          <ResultCard
            v-for="item in resultSections"
            :key="item.key"
            :title="item.title"
            :icon="item.icon"
            :content="results[item.key] || ''"
            :section="item.key"
            :task-id="currentTaskId"
          />
        </template>

        <LogPanel />
      </el-col>
    </el-row>

    <!-- 下方：全宽显示完整结果 -->
    <template v-if="results">
      <el-card class="full-results" shadow="hover">
        <template #header>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span>
              <span style="font-weight:600">完整生成结果</span>
              <el-tag type="success" size="small" style="margin-left:8px">已完成</el-tag>
            </span>
            <el-button type="primary" size="small" @click="$router.push(`/app/history/${currentTaskId}`)">
              <el-icon><Document /></el-icon> 查看完整详情（含目录导航）
            </el-button>
          </div>
        </template>
        <ResultCard
          v-for="item in resultSections"
          :key="'full-' + item.key"
          :title="item.title"
          :icon="item.icon"
          :content="results[item.key] || ''"
          :section="item.key"
          :task-id="currentTaskId"
        />
      </el-card>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth'
import ProgressPanel from '../components/ProgressPanel.vue'
import ResultCard from '../components/ResultCard.vue'
import LogPanel from '../components/LogPanel.vue'
import ProviderSelect from '../components/ProviderSelect.vue'

const authStore = useAuthStore()

const form = reactive({ theme: '', keywords: '', genre: '', style: '', provider: 'deepseek' })
const generating = ref(false)
const showProgress = ref(false)
const currentStep = ref(0)
const stepStatus = ref('')
const currentTaskId = ref('')
const results = ref(null)

const presetKeywords = ['霸道总裁', '失忆', '复仇', '逆袭', '穿越', '契约婚姻', '豪门', '宫斗', '重生', '替嫁', '萌宝', '虐恋']

const genres = [
  { label: '不限', value: '', icon: '🎭' },
  { label: '爱情', value: '爱情', icon: '💕' },
  { label: '悬疑', value: '悬疑', icon: '🔍' },
  { label: '喜剧', value: '喜剧', icon: '😂' },
  { label: '科幻', value: '科幻', icon: '🚀' },
  { label: '古装', value: '古装', icon: '👘' },
  { label: '现代', value: '现代', icon: '🏙️' },
]

const styles = [
  { label: '不限', value: '', icon: '🎨' },
  { label: '轻松幽默', value: '轻松幽默', icon: '😄' },
  { label: '紧张刺激', value: '紧张刺激', icon: '🔥' },
  { label: '温馨治愈', value: '温馨治愈', icon: '🌸' },
  { label: '悬疑烧脑', value: '悬疑烧脑', icon: '🧩' },
  { label: '热血励志', value: '热血励志', icon: '⚡' },
]

const resultSections = [
  { key: 'outline', title: '故事大纲', icon: '📖' },
  { key: 'characters', title: '人物角色设定', icon: '👥' },
  { key: 'structure', title: '三幕式剧情结构', icon: '🎭' },
  { key: 'script', title: '第一集完整剧本', icon: '📝' },
  { key: 'storyboard', title: '影视分镜表 + AI绘图提示词', icon: '🎨' },
]

let pollingTimer = null

function toggleKeyword(kw) {
  const arr = form.keywords ? form.keywords.split(/[,，]/).map(s => s.trim()).filter(Boolean) : []
  const idx = arr.indexOf(kw)
  if (idx >= 0) arr.splice(idx, 1)
  else arr.push(kw)
  form.keywords = arr.join('，')
}

async function handleGenerate() {
  if (!form.theme || !form.keywords) {
    ElMessage.warning('请填写题材和关键词')
    return
  }

  generating.value = true
  showProgress.value = true
  results.value = null

  try {
    const res = await authStore.fetchWithAuth('/api/drama/generate', {
      method: 'POST',
      body: JSON.stringify({
        theme: form.theme,
        keywords: form.keywords,
        genre: form.genre,
        style: form.style,
        provider: form.provider
      })
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.message)

    currentTaskId.value = data.data.taskId
    currentStep.value = 0
    stepStatus.value = '任务已创建，等待处理...'
    startPolling()
  } catch (e) {
    ElMessage.error(e.message)
    generating.value = false
    showProgress.value = false
  }
}

function startPolling() {
  pollingTimer = setInterval(async () => {
    try {
      const res = await authStore.fetchWithAuth(`/api/drama/status/${currentTaskId.value}`)
      const data = await res.json()
      if (!data.success) return

      const { status, currentStep: step, result } = data.data
      currentStep.value = step

      const stepNames = ['准备中', '正在生成故事大纲', '正在设计人物角色', '正在规划剧情结构', '正在撰写完整剧本', '正在制作分镜表']
      stepStatus.value = stepNames[Math.min(step, stepNames.length - 1)] || '处理中'

      if (status === 'completed') {
        clearInterval(pollingTimer)
        showProgress.value = false
        results.value = result
        ElMessage.success('短剧生成完成!')
        generating.value = false
      } else if (status === 'failed') {
        clearInterval(pollingTimer)
        ElMessage.error('生成失败，请重试')
        generating.value = false
        showProgress.value = false
      }
    } catch (e) {
      clearInterval(pollingTimer)
      generating.value = false
    }
  }, 2000)
}
</script>

<style scoped>
.generate-page { max-width: 1200px; margin: 0 auto; }

.page-banner {
  margin-bottom: 20px;
}
.page-banner h2 {
  font-size: 22px;
  font-weight: 700;
  color: #303133;
  margin: 0 0 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.page-banner p {
  font-size: 13px;
  color: #909399;
  margin: 0;
}

.form-card { margin-bottom: 0; }

.form-full {
  /* center align when alone */
  margin: 0 auto;
}

.keyword-chips {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip { cursor: pointer; user-select: none; }
.chip-row {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.generate-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 1px;
}

.full-results { margin-top: 20px; }

@media (max-width: 767px) {
  .generate-page { padding: 0 4px; }
  .page-banner h2 { font-size: 18px; }
  .form-card { margin-bottom: 12px; }
  .generate-btn { height: 44px; font-size: 15px; }
  .generate-page > .el-row {
    flex-direction: column;
  }
  .generate-page > .el-row > .el-col {
    max-width: 100% !important;
    flex: 0 0 100% !important;
    margin-bottom: 12px;
  }
  .full-results { margin-top: 4px; }
}
</style>
