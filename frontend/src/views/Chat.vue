<template>
  <div class="chat-page">
    <!-- 左侧：模型选择 -->
    <div class="chat-sidebar">
      <div class="chat-sidebar-header">
        <h3><el-icon><ChatDotRound /></el-icon> AI 聊天</h3>
      </div>

      <div class="model-selector">
        <div class="selector-label">对话模型</div>
        <el-select v-model="selectedProvider" placeholder="选择厂商" size="default" style="width:100%" @change="onProviderChange">
          <el-option v-for="p in textProviders" :key="p.value" :label="p.label" :value="p.value">
            <span>{{ p.icon }} {{ p.label }}</span>
          </el-option>
        </el-select>

        <div style="margin-top:10px">
          <div class="selector-label">模型名称</div>
          <el-select
            v-model="selectedModel"
            placeholder="选择或输入模型"
            filterable
            allow-create
            size="default"
            style="width:100%"
          >
            <el-option v-for="m in currentModelOptions" :key="m" :label="m" :value="m" />
          </el-select>
          <el-button size="small" text type="primary" :loading="fetchingModels" @click="fetchModels" style="margin-top:6px">
            <el-icon><Refresh /></el-icon> 拉取可用模型
          </el-button>
        </div>
      </div>

      <div class="chat-sidebar-footer">
        <el-button size="small" text @click="clearChat">
          <el-icon><Delete /></el-icon> 清空对话
        </el-button>
      </div>
    </div>

    <!-- 右侧：聊天区域 -->
    <div class="chat-main">
      <!-- 消息列表 -->
      <div class="chat-messages" ref="msgContainer">
        <div v-if="messages.length === 0" class="chat-empty">
          <el-icon :size="48" color="#c0c4cc"><ChatDotRound /></el-icon>
          <p>开始和 AI 对话吧</p>
          <p class="empty-hint">在左侧选择模型后，输入消息开始聊天</p>
        </div>

        <div v-for="(msg, idx) in messages" :key="idx" :class="['chat-msg', msg.role]">
          <div class="msg-avatar">
            <el-avatar v-if="msg.role === 'user'" :size="32" icon="UserFilled" />
            <el-avatar v-else :size="32" :style="{ background: '#7c3aed' }">
              {{ selectedProviderIcon || 'AI' }}
            </el-avatar>
          </div>
          <div class="msg-body">
            <div class="msg-role">{{ msg.role === 'user' ? '我' : (selectedProviderLabel || 'AI') }}</div>
            <div class="msg-content" v-html="formatContent(msg.content)"></div>
          </div>
        </div>

        <div v-if="sending" class="chat-msg assistant">
          <div class="msg-avatar">
            <el-avatar :size="32" :style="{ background: '#7c3aed' }">AI</el-avatar>
          </div>
          <div class="msg-body">
            <div class="typing-dots"><span></span><span></span><span></span></div>
          </div>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="chat-input-area">
        <el-input
          v-model="inputText"
          type="textarea"
          :rows="2"
          placeholder="输入消息，Enter 发送，Shift+Enter 换行..."
          @keydown.enter.exact="handleSend"
          :disabled="sending"
          resize="none"
        />
        <el-button
          type="primary"
          :loading="sending"
          :disabled="!inputText.trim() || !selectedProvider"
          @click="handleSend"
          class="send-btn"
        >
          <el-icon><Promotion /></el-icon> 发送
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const msgContainer = ref(null)
const textProviders = ref([])
const selectedProvider = ref('')
const selectedProviderLabel = computed(() => textProviders.value.find(p => p.value === selectedProvider.value)?.label || '')
const selectedProviderIcon = computed(() => textProviders.value.find(p => p.value === selectedProvider.value)?.icon || '')
const selectedModel = ref('')
const currentModelOptions = ref([])

const messages = ref([])
const inputText = ref('')
const sending = ref(false)
const fetchingModels = ref(false)

async function loadProviders() {
  try {
    const res = await authStore.fetchWithAuth('/api/keys')
    const data = await res.json()
    if (data.success && data.data.text) {
      textProviders.value = data.data.text
        .filter(p => p.available && !p.isCustom)
        .map(p => ({
          value: p.provider,
          label: p.label,
          icon: p.icon || ''
        }))
      // 默认选第一个可用厂商并自动拉取模型
      if (textProviders.value.length && !selectedProvider.value) {
        selectedProvider.value = textProviders.value[0].value
        nextTick(() => fetchModels())
      }
    }
  } catch {}
}

function onProviderChange(val) {
  selectedModel.value = ''
  currentModelOptions.value = []
  if (val) {
    nextTick(() => fetchModels())
  }
}

async function fetchModels() {
  if (!selectedProvider.value) return
  fetchingModels.value = true
  try {
    const res = await authStore.fetchWithAuth('/api/keys/fetch-models', {
      method: 'POST',
      body: JSON.stringify({
        provider: selectedProvider.value,
        type: 'text'
      })
    })
    const data = await res.json()
    if (data.success && data.data.models?.length) {
      currentModelOptions.value = data.data.models.map(m => m.id)
      if (!selectedModel.value) selectedModel.value = currentModelOptions.value[0]
      ElMessage.success(`获取到 ${data.data.total} 个模型`)
    } else {
      ElMessage.warning(data.message || '未获取到模型列表')
    }
  } catch (e) {
    ElMessage.error('获取模型列表失败: ' + e.message)
  } finally {
    fetchingModels.value = false
  }
}

function formatContent(text) {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
    .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
}

function scrollToBottom() {
  nextTick(() => {
    const el = msgContainer.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

async function handleSend() {
  const text = inputText.value.trim()
  if (!text || sending.value || !selectedProvider.value) return

  messages.value.push({ role: 'user', content: text })
  inputText.value = ''
  scrollToBottom()

  sending.value = true
  try {
    const res = await authStore.fetchWithAuth('/api/chat/send', {
      method: 'POST',
      body: JSON.stringify({
        provider: selectedProvider.value,
        model: selectedModel.value,
        messages: messages.value.map(m => ({ role: m.role, content: m.content }))
      })
    })
    const data = await res.json()
    if (data.success) {
      messages.value.push(data.data.message)
    } else {
      messages.value.push({ role: 'assistant', content: '**错误:** ' + (data.message || '请求失败') })
    }
  } catch (e) {
    messages.value.push({ role: 'assistant', content: '**请求失败:** ' + e.message })
  } finally {
    sending.value = false
    scrollToBottom()
  }
}

function clearChat() {
  messages.value = []
}

onMounted(loadProviders)
</script>

<style scoped>
.chat-page {
  display: flex;
  height: calc(100vh - 120px);
  gap: 0;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}

/* 左侧面板 */
.chat-sidebar {
  width: 240px;
  background: #fafbfc;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  padding: 16px;
  flex-shrink: 0;
}

.chat-sidebar-header h3 {
  margin: 0 0 16px;
  font-size: 15px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #303133;
}

.selector-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 6px;
}

.model-selector {
  flex: 1;
}

.chat-sidebar-footer {
  border-top: 1px solid #e4e7ed;
  padding-top: 12px;
}

/* 主聊天区域 */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.chat-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #c0c4cc;
}

.chat-empty p {
  margin: 8px 0 0;
  font-size: 15px;
}

.empty-hint {
  font-size: 12px !important;
  color: #dcdfe6;
}

/* 消息气泡 */
.chat-msg {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.chat-msg.user {
  flex-direction: row-reverse;
}

.msg-avatar {
  flex-shrink: 0;
}

.msg-body {
  max-width: 75%;
}

.chat-msg.user .msg-body {
  text-align: right;
}

.msg-role {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.msg-content {
  display: inline-block;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
  text-align: left;
}

.chat-msg.user .msg-content {
  background: #7c3aed;
  color: #fff;
  border-bottom-right-radius: 4px;
}

.chat-msg.assistant .msg-content {
  background: #f4f5f7;
  color: #303133;
  border-bottom-left-radius: 4px;
}

.msg-content :deep(code) {
  background: rgba(0,0,0,0.08);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
}

.msg-content :deep(pre) {
  background: #1d1e2c;
  color: #e4e7ed;
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 8px 0;
}

.msg-content :deep(pre code) {
  background: transparent;
  padding: 0;
}

/* 打字动画 */
.typing-dots {
  display: flex;
  gap: 4px;
  padding: 14px 18px;
}

.typing-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #c0c4cc;
  animation: typing 1.4s infinite;
}

.typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.typing-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing {
  0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-4px); }
}

/* 输入区域 */
.chat-input-area {
  display: flex;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid #e4e7ed;
  align-items: flex-end;
}

.send-btn {
  flex-shrink: 0;
  height: 40px;
}

@media (max-width: 767px) {
  .chat-page {
    flex-direction: column;
    height: calc(100vh - 100px);
    border-radius: 0;
    box-shadow: none;
  }
  .chat-sidebar {
    width: 100%;
    flex-shrink: 0;
    padding: 10px 12px;
    border-right: none;
    border-bottom: 1px solid #e4e7ed;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
  .chat-sidebar-header { display: none; }
  .model-selector { flex: 1; min-width: 0; }
  .chat-sidebar-footer { border-top: none; padding-top: 0; margin-left: auto; }
  .chat-messages { padding: 12px; }
  .msg-body { max-width: 85%; }
  .chat-input-area { padding: 10px 12px; gap: 8px; }
  .send-btn { height: 36px; padding: 0 14px; }
}
</style>
