<template>
  <div class="page">
    <div class="page-banner">
      <h2><el-icon><Clock /></el-icon> 任务队列</h2>
      <p>查看正在执行和等待中的异步任务</p>
    </div>

    <el-card>
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span>活跃任务</span>
          <el-button size="small" @click="fetchTasks" :loading="loading">
            <el-icon><Refresh /></el-icon> 刷新
          </el-button>
        </div>
      </template>

      <div class="table-scroll">
        <el-table :data="tasks" v-loading="loading" stripe empty-text="暂无活跃任务">
        <el-table-column label="任务ID" width="100">
          <template #default="{ row }">
            <el-tooltip :content="row.taskId" placement="top">
              <span class="mono">{{ row.taskId?.slice(0, 8) }}...</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.status === 'continue_processing'" type="info" size="small">续写</el-tag>
            <el-tag v-else type="" size="small">生成</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="题材" min-width="150">
          <template #default="{ row }">
            {{ row.userInput?.theme || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.status === 'continue_processing'" size="small" class="tag-continue">
              <el-icon><Loading /></el-icon> 续写中...
            </el-tag>
            <el-tag v-else-if="row.status === 'processing'" type="warning" size="small">
              <el-icon><Loading /></el-icon> 处理中
            </el-tag>
            <el-tag v-else type="info" size="small">等待中</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="进度" width="150">
          <template #default="{ row }">
            <el-progress
              v-if="row.status === 'continue_processing'"
              :percentage="50"
              :indeterminate="true"
              :stroke-width="6"
            />
            <el-progress
              v-else
              :percentage="(row.currentStep / 5) * 100"
              :stroke-width="6"
              :status="row.status === 'processing' ? '' : 'warning'"
            />
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="170">
          <template #default="{ row }">
            {{ new Date(row.createdAt).toLocaleString('zh-CN') }}
          </template>
        </el-table-column>
      </el-table>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const tasks = ref([])
const loading = ref(false)

async function fetchTasks() {
  loading.value = true
  try {
    const res = await authStore.fetchWithAuth('/api/drama/active-tasks')
    const data = await res.json()
    if (data.success) tasks.value = data.data
  } catch { /* ignore */ } finally {
    loading.value = false
  }
}

onMounted(fetchTasks)
</script>

<style scoped>
.page { max-width: 1000px; margin: 0 auto; }
.page-banner { margin-bottom: 20px; }
.page-banner h2 { font-size: 22px; font-weight: 700; color: #303133; display: flex; align-items: center; gap: 8px; margin: 0 0 4px; }
.page-banner p { font-size: 13px; color: #909399; margin: 0; }
.mono { font-family: monospace; font-size: 12px; color: #909399; }
.tag-continue {
  background: #e8f0fe;
  color: #7c3aed;
  border-color: #c4d5f7;
}
.tag-continue .el-icon { animation: spin 2s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 767px) {
  .page { padding: 0 4px; }
  .page-banner h2 { font-size: 18px; }
  .table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .table-scroll .el-table { min-width: 700px; font-size: 12px; }
}
</style>
