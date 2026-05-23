<template>
  <div class="admin-page">
    <el-card>
      <template #header>
        <div class="page-header">
          <span>全局Key管理</span>
          <span class="hint">管理员在此配置各厂商的全局API Key，用户可使用全局Key或设置自己的Key</span>
        </div>
      </template>

      <el-tabs v-model="activeType">
        <el-tab-pane label="文本模型" name="text" />
        <el-tab-pane label="图片模型" name="image" />
        <el-tab-pane label="视频模型" name="video" />
      </el-tabs>

      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <el-button size="small" type="warning" :loading="batchTesting" @click="batchTestKeys">
          <el-icon><Connection /></el-icon> 一键检测
        </el-button>
        <span v-if="batchSummary" class="batch-summary">
          已测 <b>{{ batchSummary.tested }}</b>/{{ batchSummary.total }}，
          <span class="test-ok">{{ batchSummary.connected }} 连通</span>
          <span v-if="batchSummary.failed"> · </span>
          <span v-if="batchSummary.failed" class="test-fail">{{ batchSummary.failed }} 失败</span>
        </span>
      </div>

      <el-table :data="currentList" v-loading="loading" stripe style="width:100%">
        <el-table-column label="厂商" width="180">
          <template #default="{ row }">
            <span class="provider-icon">{{ row.icon }}</span>
            <el-tag>{{ row.label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="支持模型" min-width="180">
          <template #default="{ row }">
            <span style="font-size:12px;color:#909399">{{ row.models }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <template v-if="batchResults[row.provider]">
              <el-tag v-if="batchResults[row.provider].connected" type="success" size="small">连通 {{ batchResults[row.provider].latency }}ms</el-tag>
              <el-tag v-else-if="batchResults[row.provider].hasKey" type="danger" size="small">失败</el-tag>
              <el-tag v-else type="info" size="small">未配置</el-tag>
            </template>
            <template v-else>
              <el-tag v-if="row.configured" type="success" size="small">已配置</el-tag>
              <el-tag v-else type="info" size="small">未配置</el-tag>
            </template>
          </template>
        </el-table-column>
        <el-table-column prop="key.model" label="当前模型" min-width="150">
          <template #default="{ row }">
            {{ row.key?.model || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="openDialog(row)">
              {{ row.configured ? '编辑' : '配置' }}
            </el-button>
            <el-button
              v-if="row.configured"
              size="small"
              type="danger"
              @click="deleteKey(row)"
            >删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="`配置 - ${currentProvider}`"
      width="500px"
    >
      <el-form :model="keyForm" label-position="top">
        <el-form-item v-if="isCustom" label="厂商标识" required>
          <el-input v-model="keyForm.customKey" placeholder="例如：my-provider" />
          <span class="hint-text">自定义厂商的唯一标识，用于区分不同来源</span>
        </el-form-item>
        <el-form-item label="API Key" required>
          <el-input
            v-model="keyForm.apiKey"
            type="password"
            show-password
            placeholder="sk-..."
          />
          <a v-if="currentKeyUrl" :href="currentKeyUrl" target="_blank" class="key-link">
            <el-icon><Link /></el-icon> 前往获取 API Key
          </a>
        </el-form-item>
        <el-form-item label="模型 (可选)">
          <div style="display:flex;gap:8px;width:100%">
            <el-select v-model="keyForm.model" placeholder="选择或输入模型名" filterable allow-create clearable style="flex:1" :loading="fetchingModels" :disabled="fetchingModels">
              <el-option v-for="m in currentModelList" :key="m" :label="m" :value="m" />
            </el-select>
            <el-button size="small" text type="primary" :loading="fetchingModels" @click="fetchModels" style="flex-shrink:0">
              <el-icon><Refresh /></el-icon> 拉取可用模型
            </el-button>
          </div>
        </el-form-item>
        <el-form-item>
          <el-button type="warning" :loading="testing" @click="testConnection" :disabled="!keyForm.apiKey">
            <el-icon><Connection /></el-icon> 测试连接
          </el-button>
          <span v-if="testResult" :class="testResult.ok ? 'test-ok' : 'test-fail'">{{ testResult.msg }}</span>
        </el-form-item>
        <el-form-item label="Base URL (可选)">
          <el-input v-model="keyForm.baseURL" :placeholder="currentBaseURL || '自定义接口地址，如 https://api.example.com/v1'" />
          <span v-if="!currentBaseURL" class="hint-text">自定义厂商需要填写完整接口地址</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveKey">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Connection } from '@element-plus/icons-vue'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
const allKeys = ref({ text: [], image: [], video: [] })
const loading = ref(false)
const dialogVisible = ref(false)
const saving = ref(false)
const activeType = ref('text')

// 一键检测
const batchTesting = ref(false)
const batchResults = ref({})
const batchSummary = ref(null)

watch(activeType, () => {
  batchResults.value = {}
  batchSummary.value = null
})

const currentProvider = ref('')
const currentProviderKey = ref('')
const currentKeyUrl = ref('')
const currentBaseURL = ref('')
const currentModelList = ref([])
const isCustom = ref(false)
const testing = ref(false)
const testResult = ref(null)
const fetchingModels = ref(false)
const keyForm = ref({ apiKey: '', model: '', baseURL: '', customKey: '' })

const currentList = computed(() => allKeys.value[activeType.value] || [])

async function fetchKeys() {
  loading.value = true
  try {
    const res = await authStore.fetchWithAuth('/api/admin/keys')
    const data = await res.json()
    if (data.success) allKeys.value = data.data
  } catch (e) {
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

async function batchTestKeys() {
  batchTesting.value = true
  batchResults.value = {}
  batchSummary.value = null
  try {
    const res = await authStore.fetchWithAuth('/api/keys/batch-test', {
      method: 'POST',
      body: JSON.stringify({ type: activeType.value })
    })
    const data = await res.json()
    if (data.success) {
      const map = {}
      for (const r of data.data.results) {
        map[r.provider] = r
      }
      batchResults.value = map
      batchSummary.value = data.data.summary
    }
  } catch { /* ignore */ } finally {
    batchTesting.value = false
  }
}

function openDialog(row) {
  currentProvider.value = row.label
  currentProviderKey.value = row.provider
  currentKeyUrl.value = row.keyUrl || ''
  currentBaseURL.value = row.baseURL || ''
  currentModelList.value = row.modelList || []
  isCustom.value = row.isCustom || false
  testResult.value = null
  keyForm.value = {
    apiKey: '',
    model: row.key?.model || '',
    baseURL: row.key?.baseURL || row.baseURL || '',
    customKey: ''
  }
  dialogVisible.value = true
  // 已配置则自动从厂商API拉取最新模型列表
  if (row.configured) {
    nextTick(() => fetchModels())
  }
}

async function testConnection() {
  const baseURL = keyForm.value.baseURL || currentBaseURL.value || 'https://api.openai.com/v1'
  testing.value = true
  testResult.value = null
  try {
    const res = await authStore.fetchWithAuth('/api/keys/test', {
      method: 'POST',
      body: JSON.stringify({
        apiKey: keyForm.value.apiKey,
        baseURL,
        model: keyForm.value.model
      })
    })
    const data = await res.json()
    testResult.value = {
      ok: data.data?.connected || false,
      msg: data.data?.message || data.message || '未知结果'
    }
  } catch (e) {
    testResult.value = { ok: false, msg: '请求失败: ' + e.message }
  } finally {
    testing.value = false
  }
}

async function fetchModels() {
  fetchingModels.value = true
  try {
    const body = {
      provider: currentProviderKey.value,
      type: activeType.value
    }
    // 用户手动输入了Key就用输入的，否则后端从数据库查已存储的Key
    if (keyForm.value.apiKey.trim()) {
      body.apiKey = keyForm.value.apiKey
    }
    if (keyForm.value.baseURL) {
      body.baseURL = keyForm.value.baseURL
    }
    const res = await authStore.fetchWithAuth('/api/keys/fetch-models', {
      method: 'POST',
      body: JSON.stringify(body)
    })
    const data = await res.json()
    if (data.success && data.data.models?.length) {
      const apiModels = data.data.models.map(m => m.id)
      // 合并静态列表和API返回的模型，去重
      const merged = [...new Set([...apiModels, ...currentModelList.value])]
      currentModelList.value = merged
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

async function saveKey() {
  if (!keyForm.value.apiKey.trim()) {
    ElMessage.warning('请输入API Key')
    return
  }
  const provider = isCustom.value ? (keyForm.value.customKey.trim() || 'custom') : currentProviderKey.value
  if (isCustom.value && !keyForm.value.customKey.trim()) {
    ElMessage.warning('请输入自定义厂商标识')
    return
  }
  saving.value = true
  try {
    const res = await authStore.fetchWithAuth('/api/admin/keys', {
      method: 'POST',
      body: JSON.stringify({
        provider,
        type: activeType.value,
        apiKey: keyForm.value.apiKey,
        model: keyForm.value.model,
        baseURL: keyForm.value.baseURL
      })
    })
    const data = await res.json()
    if (data.success) {
      ElMessage.success('保存成功')
      dialogVisible.value = false
      fetchKeys()
    }
  } catch (e) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

async function deleteKey(row) {
  try {
    await ElMessageBox.confirm(`确定删除 ${row.label} 的全局Key吗？`, '确认', { type: 'warning' })
  } catch { return }
  try {
    await authStore.fetchWithAuth(`/api/admin/keys/${row.key._id}`, { method: 'DELETE' })
    ElMessage.success('已删除')
    fetchKeys()
  } catch (e) {
    ElMessage.error('删除失败')
  }
}

onMounted(fetchKeys)
</script>

<style scoped>
.admin-page { max-width: 1000px; margin: 0 auto; }
.page-header { display: flex; flex-direction: column; gap: 4px; }
.hint { font-size: 13px; color: #909399; font-weight: normal; }
.hint-text { font-size: 11px; color: #909399; margin-top: 2px; display: block; }
.provider-icon { margin-right: 4px; font-size: 16px; }
.key-link { display: inline-flex; align-items: center; gap: 4px; margin-top: 6px; font-size: 12px; color: #409eff; text-decoration: none; }
.key-link:hover { color: #66b1ff; }
.test-ok { color: #67c23a; font-size: 13px; margin-left: 10px; }
.test-fail { color: #f56c6c; font-size: 13px; margin-left: 10px; }
.batch-summary { font-size: 13px; color: #606266; }
.batch-summary .test-ok { color: #67c23a; margin-left: 0; }
.batch-summary .test-fail { color: #f56c6c; margin-left: 0; }

@media (max-width: 767px) {
  .admin-page { padding: 0 4px; }
  .page-header { flex-direction: column; }
  .el-button+.el-button {
    margin-left: 0px !important;
}
}
</style>
