<template>
  <el-card class="log-card">
    <template #header>
      <div class="log-header">
        <span>实时日志</span>
        <div class="log-controls">
          <span :class="['log-dot', connected ? 'connected' : 'disconnected']"></span>
          <span class="log-status-text">{{ connected ? '已连接' : '未连接' }}</span>
          <el-button size="small" @click="collapsed = !collapsed">
            {{ collapsed ? '展开' : '收起' }}
          </el-button>
          <el-button size="small" @click="clearLogs">清空</el-button>
        </div>
      </div>
    </template>
    <div v-show="!collapsed" ref="logContainer" class="log-container">
      <div v-for="(line, i) in logLines" :key="i" :class="['log-line', `log-${line.level}`]">
        <span class="log-time">{{ line.timestamp }}</span>
        <span class="log-lvl">[{{ line.level.toUpperCase() }}]</span>
        {{ line.message }}
        <span v-if="line.meta" class="log-meta">{{ JSON.stringify(line.meta) }}</span>
      </div>
    </div>
  </el-card>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

const collapsed = ref(true)
const connected = ref(false)
const logLines = ref([])
const logContainer = ref(null)

const MAX_LINES = 200
let eventSource = null

function addLine(entry) {
  logLines.value.push(entry)
  if (logLines.value.length > MAX_LINES) logLines.value.shift()
  nextTick(() => {
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight
    }
  })
}

function clearLogs() {
  logLines.value = []
}

function connect() {
  eventSource = new EventSource('/api/logs/stream')
  eventSource.onopen = () => { connected.value = true }
  eventSource.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data)
      if (data.type === 'log') {
        const ts = data.timestamp ? data.timestamp.split(' ')[1] : new Date().toISOString().split('T')[1].split('.')[0]
        addLine({ timestamp: ts, level: data.level || 'info', message: data.message, meta: data.meta })
      }
    } catch {}
  }
  eventSource.onerror = () => { connected.value = false }
}

onMounted(() => {
  connect()
  loadRecent()
})

onUnmounted(() => {
  if (eventSource) eventSource.close()
})

async function loadRecent() {
  try {
    const res = await fetch('/api/logs/recent?lines=30')
    const data = await res.json()
    if (data.success && data.data.lines) {
      for (const line of data.data.lines) {
        const match = line.match(/^\[(.+?)\]\s+(\w+):\s+(.+)$/)
        if (match) {
          addLine({ timestamp: match[1].split(' ')[1], level: match[2].toLowerCase(), message: match[3] })
        }
      }
    }
  } catch {}
}
</script>

<style scoped>
.log-card {
  margin-top: 20px;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.log-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.log-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.log-dot.connected { background: #67c23a; }
.log-dot.disconnected { background: #f56c6c; }

.log-status-text {
  font-size: 12px;
  color: #909399;
}

.log-container {
  background: #0d1117;
  border-radius: 6px;
  padding: 12px;
  max-height: 300px;
  overflow-y: auto;
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.6;
}

.log-line {
  padding: 2px 6px;
  color: #c9d1d9;
}

.log-line.log-error { color: #f85149; }
.log-line.log-warn { color: #d2991d; }
.log-line.log-info { color: #c9d1d9; }
.log-line.log-debug { color: #8b949e; }

.log-time {
  color: #58a6ff;
  margin-right: 8px;
}

.log-lvl {
  margin-right: 8px;
  font-weight: 500;
}

.log-meta {
  color: #8b949e;
  font-size: 12px;
}
</style>
