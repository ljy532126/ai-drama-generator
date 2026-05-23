<template>
  <div class="admin-page">
    <el-card>
      <template #header>
        <div class="page-header">
          <span>用户管理</span>
          <span class="stats-badge">共 {{ total }} 个用户</span>
        </div>
      </template>

      <div class="toolbar">
        <el-input
          v-model="search"
          placeholder="搜索用户名或邮箱"
          clearable
          style="width: 260px"
          @clear="fetchList"
          @keyup.enter="fetchList"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-button type="primary" @click="fetchList">搜索</el-button>
      </div>

      <el-table :data="list" v-loading="loading" stripe :row-class-name="rowClass" style="width:100%">
        <el-table-column prop="username" label="用户名" min-width="120">
          <template #default="{ row }">
            <span>{{ row.username }}</span>
            <el-icon v-if="row.role === 'admin'" color="#e6a23c" style="margin-left:4px;vertical-align:middle"><Avatar /></el-icon>
          </template>
        </el-table-column>
        <el-table-column prop="email" label="邮箱" min-width="200" />
        <el-table-column label="角色" width="110">
          <template #default="{ row }">
            <el-tag v-if="row.role === 'admin'" effect="dark" type="danger" size="small">管理员</el-tag>
            <el-tag v-else type="info" size="default">普通用户</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="注册时间" width="170">
          <template #default="{ row }">
            {{ new Date(row.createdAt).toLocaleString('zh-CN') }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-switch
              :model-value="row.isActive"
              @change="(val) => toggleActive(row, val)"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-dropdown @command="(cmd) => handleAction(row, cmd)">
              <el-button size="small">
                操作 <el-icon><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    v-if="row.role !== 'admin'"
                    command="promote"
                  >提升为管理员</el-dropdown-item>
                  <el-dropdown-item
                    v-else
                    command="demote"
                  >降级为用户</el-dropdown-item>
                  <el-dropdown-item command="delete" divided style="color:#f56c6c">
                    删除用户
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="page"
          :page-size="limit"
          :total="total"
          layout="prev, pager, next, total"
          @current-change="fetchList"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
const list = ref([])
const loading = ref(false)
const search = ref('')
const page = ref(1)
const limit = ref(15)
const total = ref(0)

async function fetchList() {
  loading.value = true
  try {
    const params = new URLSearchParams({ page: page.value, limit: limit.value })
    if (search.value) params.set('search', search.value)
    const res = await authStore.fetchWithAuth(`/api/admin/users?${params}`)
    const data = await res.json()
    if (data.success) {
      list.value = data.data.list
      total.value = data.data.pagination.total
    }
  } catch (e) {
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

async function toggleActive(row, val) {
  try {
    const res = await authStore.fetchWithAuth(`/api/admin/users/${row._id}`, {
      method: 'PUT',
      body: JSON.stringify({ isActive: val })
    })
    const data = await res.json()
    if (data.success) {
      row.isActive = val
      ElMessage.success(val ? '已启用' : '已禁用')
    }
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

async function handleAction(row, command) {
  if (command === 'delete') {
    try {
      await ElMessageBox.confirm(`确定要删除用户 "${row.username}" 吗？该用户的所有任务也会被删除。`, '确认删除', { type: 'warning' })
    } catch { return }
    try {
      const res = await authStore.fetchWithAuth(`/api/admin/users/${row._id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        ElMessage.success('已删除')
        fetchList()
      }
    } catch (e) {
      ElMessage.error('删除失败')
    }
  } else if (command === 'promote' || command === 'demote') {
    const role = command === 'promote' ? 'admin' : 'user'
    try {
      const res = await authStore.fetchWithAuth(`/api/admin/users/${row._id}`, {
        method: 'PUT',
        body: JSON.stringify({ role })
      })
      const data = await res.json()
      if (data.success) {
        row.role = role
        ElMessage.success('角色已更新')
      }
    } catch (e) {
      ElMessage.error('操作失败')
    }
  }
}

function rowClass({ row }) {
  return row.role === 'admin' ? 'admin-row' : ''
}

onMounted(fetchList)
</script>

<style scoped>
.admin-page {
  max-width: 1100px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stats-badge {
  font-size: 13px;
  color: #909399;
}

.toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.pagination-wrapper {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}

:deep(.admin-row) {
  background-color: #fef0f0 !important;
}

@media (max-width: 767px) {
  .admin-page { padding: 0 4px; }
  .toolbar { flex-direction: column; }
  .toolbar .el-input { width: 100% !important; }
}
</style>
