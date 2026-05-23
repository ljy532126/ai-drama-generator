<template>
  <div class="profile-page">
    <h2 style="margin-bottom:20px">个人中心</h2>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="基本信息" name="info">
        <el-card>
          <template #header>账号信息</template>

          <!-- 头像 + 昵称 -->
          <div class="avatar-section">
            <el-avatar :size="80" :src="avatarSrc" class="avatar-img">
              <el-icon :size="40"><UserFilled /></el-icon>
            </el-avatar>
            <div class="avatar-actions">
              <el-upload
                :show-file-list="false"
                :before-upload="beforeAvatarUpload"
                :http-request="uploadAvatar"
                accept="image/*"
              >
                <el-button size="small" type="primary">更换头像</el-button>
              </el-upload>
              <span class="avatar-hint">支持 JPG/PNG，不超过 2MB</span>
            </div>
          </div>

          <div class="nickname-row">
            <span class="nickname-label">昵称</span>
            <el-input
              v-model="nickname"
              maxlength="30"
              show-word-limit
              size="small"
              style="width: 220px"
              placeholder="设置昵称"
            />
            <el-button size="small" type="primary" :loading="savingNickname" @click="saveNickname">保存</el-button>
          </div>

          <el-divider />

          <el-descriptions :column="isMobile ? 1 : 2" border>
            <el-descriptions-item label="用户名">{{ authStore.user?.username }}</el-descriptions-item>
            <el-descriptions-item label="邮箱">{{ authStore.user?.email }}</el-descriptions-item>
            <el-descriptions-item label="角色">
              <el-tag v-if="authStore.isAdmin" type="danger" effect="dark">管理员</el-tag>
              <el-tag v-else type="info">普通用户</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="注册时间">{{ new Date(authStore.user?.createdAt).toLocaleString('zh-CN') }}</el-descriptions-item>
          </el-descriptions>

          <el-divider />

          <h4 style="margin-bottom:16px">修改密码</h4>
          <el-form :model="pwdForm" label-width="100px" style="max-width:400px">
            <el-form-item label="当前密码">
              <el-input v-model="pwdForm.oldPassword" type="password" show-password />
            </el-form-item>
            <el-form-item label="新密码">
              <el-input v-model="pwdForm.newPassword" type="password" show-password />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="changePassword" :loading="pwdLoading">修改密码</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="API Key 管理" name="keys">
        <el-card>
          <template #header>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span>我的 API Keys</span>
              <span style="font-size:12px;color:#909399">设置自己的Key后，生成时将优先使用你的Key</span>
            </div>
          </template>

          <el-tabs v-model="keyTypeTab">
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

          <div class="key-table-wrap">
            <el-table :data="currentKeyList" stripe style="width:100%">
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
            <el-table-column label="状态" width="120">
              <template #default="{ row }">
                <template v-if="batchResults[row.provider]">
                  <el-tag v-if="batchResults[row.provider].connected" type="success" size="small">连通 {{ batchResults[row.provider].latency }}ms</el-tag>
                  <el-tag v-else-if="batchResults[row.provider].hasKey" type="danger" size="small">失败</el-tag>
                  <el-tag v-else type="info" size="small">未配置</el-tag>
                </template>
                <template v-else>
                  <el-tag v-if="row.hasUserKey" type="success" size="small">已配置</el-tag>
                  <el-tag v-else-if="row.hasGlobalKey" type="warning" size="small">使用全局Key</el-tag>
                  <el-tag v-else type="info" size="small">未配置</el-tag>
                </template>
              </template>
            </el-table-column>
            <el-table-column label="当前模型" width="160">
              <template #default="{ row }">
                {{ row.userKey?.model || row.globalKey?.model || '-' }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="130" fixed="right">
              <template #default="{ row }">
                <el-button size="small" type="primary" @click="openKeyDialog(row)">设置</el-button>
                <el-button v-if="row.hasUserKey" size="small" type="danger" @click="deleteKey(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <!-- Key 编辑弹窗 -->
    <el-dialog v-model="keyDialog.visible" :title="'设置 ' + keyDialog.provider + ' Key'" :width="isMobile ? '95%' : '500px'">
      <el-form :model="keyDialog" label-width="100px">
        <el-form-item v-if="keyDialog.isCustom" label="厂商标识">
          <el-input v-model="keyDialog.customKey" placeholder="例如：my-provider" />
        </el-form-item>
        <el-form-item label="API Key">
          <el-input v-model="keyDialog.apiKey" type="password" show-password placeholder="输入你的API Key" />
          <a v-if="keyDialog.keyUrl" :href="keyDialog.keyUrl" target="_blank" class="key-link">
            <el-icon><Link /></el-icon> 前往获取 API Key
          </a>
        </el-form-item>
        <el-form-item label="模型">
          <div style="display:flex;gap:8px;width:100%">
            <el-select v-model="keyDialog.model" placeholder="选择或输入模型名" filterable allow-create clearable style="flex:1" :loading="keyDialog.fetchingModels" :disabled="keyDialog.fetchingModels">
              <el-option v-for="m in keyDialog.modelList" :key="m" :label="m" :value="m" />
            </el-select>
            <el-button size="small" text type="primary" :loading="keyDialog.fetchingModels" @click="fetchModels" style="flex-shrink:0">
              <el-icon><Refresh /></el-icon> 拉取可用模型
            </el-button>
          </div>
        </el-form-item>
        <el-form-item>
          <el-button type="warning" :loading="keyDialog.testing" @click="testConnection" :disabled="!keyDialog.apiKey">
            <el-icon><Connection /></el-icon> 测试连接
          </el-button>
          <span v-if="keyDialog.testResult" :class="keyDialog.testResult.ok ? 'test-ok' : 'test-fail'">{{ keyDialog.testResult.msg }}</span>
        </el-form-item>
        <el-form-item label="Base URL">
          <el-input v-model="keyDialog.baseURL" :placeholder="keyDialog.defaultBaseURL || '自定义接口地址，如 https://api.example.com/v1'" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="keyDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="saveKey" :loading="keyDialog.loading">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Connection } from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'
import { useAppStore } from '../stores/app'

const authStore = useAuthStore()
const appStore = useAppStore()
const isMobile = computed(() => appStore.isMobile)
const activeTab = ref('info')
const keyTypeTab = ref('text')
const allKeys = ref({ text: [], image: [], video: [] })

// 一键检测
const batchTesting = ref(false)
const batchResults = ref({})
const batchSummary = ref(null)

watch(keyTypeTab, () => {
  batchResults.value = {}
  batchSummary.value = null
})

const currentKeyList = computed(() => allKeys.value[keyTypeTab.value] || [])

const pwdForm = reactive({ oldPassword: '', newPassword: '' })
const pwdLoading = ref(false)

const nickname = ref('')
const savingNickname = ref(false)

const avatarSrc = computed(() => {
  const avatar = authStore.user?.avatar
  return avatar || ''
})

const keyDialog = reactive({
  visible: false,
  provider: '',
  providerKey: '',
  isCustom: false,
  customKey: '',
  apiKey: '',
  model: '',
  baseURL: '',
  defaultBaseURL: '',
  keyUrl: '',
  modelList: [],
  testing: false,
  testResult: null,
  fetchingModels: false,
  loading: false
})

watch(activeTab, (val) => {
  if (val === 'info') {
    nickname.value = authStore.user?.nickname || ''
  }
})

async function fetchKeys() {
  try {
    const res = await authStore.fetchWithAuth('/api/keys')
    const data = await res.json()
    if (data.success) allKeys.value = data.data
  } catch { /* ignore */ }
}

async function batchTestKeys() {
  batchTesting.value = true
  batchResults.value = {}
  batchSummary.value = null
  try {
    const res = await authStore.fetchWithAuth('/api/keys/batch-test', {
      method: 'POST',
      body: JSON.stringify({ type: keyTypeTab.value })
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

function openKeyDialog(row) {
  keyDialog.visible = true
  keyDialog.provider = row.label
  keyDialog.providerKey = row.provider
  keyDialog.isCustom = row.isCustom || false
  keyDialog.customKey = ''
  keyDialog.keyUrl = row.keyUrl || ''
  keyDialog.defaultBaseURL = row.baseURL || ''
  keyDialog.modelList = row.modelList || []
  keyDialog.testResult = null
  keyDialog.apiKey = ''
  keyDialog.model = row.userKey?.model || ''
  keyDialog.baseURL = row.userKey?.baseURL || ''
  keyDialog.loading = false
  // 已配置则自动从厂商API拉取最新模型列表
  if (row.hasUserKey || row.hasGlobalKey) {
    nextTick(() => fetchModels())
  }
}

async function testConnection() {
  const baseURL = keyDialog.baseURL || keyDialog.defaultBaseURL || 'https://api.openai.com/v1'
  keyDialog.testing = true
  keyDialog.testResult = null
  try {
    const res = await authStore.fetchWithAuth('/api/keys/test', {
      method: 'POST',
      body: JSON.stringify({
        apiKey: keyDialog.apiKey,
        baseURL,
        model: keyDialog.model
      })
    })
    const data = await res.json()
    keyDialog.testResult = {
      ok: data.data?.connected || false,
      msg: data.data?.message || data.message || '未知结果'
    }
  } catch (e) {
    keyDialog.testResult = { ok: false, msg: '请求失败: ' + e.message }
  } finally {
    keyDialog.testing = false
  }
}

async function fetchModels() {
  keyDialog.fetchingModels = true
  try {
    const body = {
      provider: keyDialog.providerKey,
      type: keyTypeTab.value
    }
    // 用户手动输入了Key就用输入的，否则后端从数据库查已存储的Key
    if (keyDialog.apiKey) {
      body.apiKey = keyDialog.apiKey
    }
    if (keyDialog.baseURL) {
      body.baseURL = keyDialog.baseURL
    }
    const res = await authStore.fetchWithAuth('/api/keys/fetch-models', {
      method: 'POST',
      body: JSON.stringify(body)
    })
    const data = await res.json()
    if (data.success && data.data.models?.length) {
      const apiModels = data.data.models.map(m => m.id)
      // 合并静态列表和API返回的模型，去重
      const merged = [...new Set([...apiModels, ...keyDialog.modelList])]
      keyDialog.modelList = merged
      ElMessage.success(`获取到 ${data.data.total} 个模型`)
    } else {
      ElMessage.warning(data.message || '未获取到模型列表')
    }
  } catch (e) {
    ElMessage.error('获取模型列表失败: ' + e.message)
  } finally {
    keyDialog.fetchingModels = false
  }
}

async function saveKey() {
  if (!keyDialog.apiKey) {
    ElMessage.warning('请输入API Key')
    return
  }
  const provider = keyDialog.isCustom ? (keyDialog.customKey.trim() || 'custom') : keyDialog.providerKey
  if (keyDialog.isCustom && !keyDialog.customKey.trim()) {
    ElMessage.warning('请输入自定义厂商标识')
    return
  }
  keyDialog.loading = true
  try {
    const res = await authStore.fetchWithAuth('/api/keys', {
      method: 'POST',
      body: JSON.stringify({
        provider,
        type: keyTypeTab.value,
        apiKey: keyDialog.apiKey,
        model: keyDialog.model,
        baseURL: keyDialog.baseURL
      })
    })
    const data = await res.json()
    if (data.success) {
      ElMessage.success('Key已保存')
      keyDialog.visible = false
      fetchKeys()
    } else {
      ElMessage.error(data.message || '保存失败')
    }
  } catch (e) {
    ElMessage.error('保存失败')
  } finally {
    keyDialog.loading = false
  }
}

async function deleteKey(row) {
  try {
    await ElMessageBox.confirm(`确定要删除 ${row.label} 的Key吗？`, '确认', { type: 'warning' })
  } catch { return }
  try {
    const res = await authStore.fetchWithAuth(`/api/keys/${row.userKey._id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) {
      ElMessage.success('已删除')
      fetchKeys()
    }
  } catch (e) {
    ElMessage.error('删除失败')
  }
}

async function changePassword() {
  if (!pwdForm.oldPassword || !pwdForm.newPassword) {
    ElMessage.warning('请填写完整密码信息')
    return
  }
  if (pwdForm.newPassword.length < 6) {
    ElMessage.warning('新密码至少6个字符')
    return
  }
  pwdLoading.value = true
  try {
    const res = await authStore.fetchWithAuth('/api/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify(pwdForm)
    })
    const data = await res.json()
    if (data.success) {
      ElMessage.success('密码修改成功')
      pwdForm.oldPassword = ''
      pwdForm.newPassword = ''
    } else {
      ElMessage.error(data.message || '修改失败')
    }
  } catch (e) {
    ElMessage.error('修改失败')
  } finally {
    pwdLoading.value = false
  }
}

function beforeAvatarUpload(file) {
  if (!file.type.startsWith('image/')) {
    ElMessage.warning('请选择图片文件')
    return false
  }
  if (file.size > 2 * 1024 * 1024) {
    ElMessage.warning('图片大小不能超过 2MB')
    return false
  }
  return true
}

async function uploadAvatar({ file }) {
  const formData = new FormData()
  formData.append('avatar', file)
  try {
    const res = await authStore.fetchWithAuth('/api/auth/avatar', {
      method: 'POST',
      body: formData
    })
    const data = await res.json()
    if (data.success) {
      authStore.user.avatar = data.data.avatar
      localStorage.setItem('drama_auth_user', JSON.stringify(authStore.user))
      ElMessage.success('头像已更新')
    }
  } catch (e) {
    ElMessage.error('上传失败')
  }
}

async function saveNickname() {
  savingNickname.value = true
  try {
    const res = await authStore.fetchWithAuth('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ nickname: nickname.value })
    })
    const data = await res.json()
    if (data.success) {
      authStore.user.nickname = data.data.user.nickname
      localStorage.setItem('drama_auth_user', JSON.stringify(authStore.user))
      ElMessage.success('昵称已保存')
    }
  } catch (e) {
    ElMessage.error('保存失败')
  } finally {
    savingNickname.value = false
  }
}

onMounted(() => {
  nickname.value = authStore.user?.nickname || ''
  fetchKeys()
})
</script>

<style scoped>
.profile-page { max-width: 900px; margin: 0 auto; }

.provider-icon { margin-right: 4px; font-size: 16px; }

.avatar-section {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
}
.avatar-img { flex-shrink: 0; }
.avatar-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.avatar-hint { font-size: 12px; color: #909399; }

.nickname-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.nickname-label { font-size: 14px; color: #606266; white-space: nowrap; }

.key-link { display: inline-flex; align-items: center; gap: 4px; margin-top: 6px; font-size: 12px; color: #409eff; text-decoration: none; }
.key-link:hover { color: #66b1ff; }
.test-ok { color: #67c23a; font-size: 13px; margin-left: 10px; }
.test-fail { color: #f56c6c; font-size: 13px; margin-left: 10px; }
.batch-summary { font-size: 13px; color: #606266; }
.batch-summary .test-ok { color: #67c23a; margin-left: 0; }
.batch-summary .test-fail { color: #f56c6c; margin-left: 0; }

/* 去掉操作列按钮之间的默认间距 */
:deep(.el-table .el-button + .el-button) {
  margin-left: 0 !important;
}

@media (max-width: 767px) {
  .profile-page { padding: 0 4px; }
  .profile-page h2 { font-size: 18px; }
  .avatar-section { flex-direction: column; align-items: flex-start; gap: 12px; }
  .nickname-row { flex-wrap: wrap; }
  .nickname-row .el-input { width: 100% !important; }
  .el-descriptions { font-size: 12px; }
}
</style>
