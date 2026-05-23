<template>
  <div class="history-page">
    <el-card>
      <template #header>
        <div class="page-header">
          <span>历史记录</span>
          <el-button type="primary" @click="$router.push('/app/generate')">
            <el-icon><Plus /></el-icon>新建剧本
          </el-button>
        </div>
      </template>

      <el-tabs v-model="activeType" @tab-change="onTabChange">
        <el-tab-pane label="剧本" name="drama" />
        <el-tab-pane label="图片" name="image" />
        <el-tab-pane label="视频" name="video" />
      </el-tabs>

      <!-- 剧本历史 -->
      <template v-if="activeType === 'drama'">
          <el-table :data="list" v-loading="loading" stripe style="width:100%">
          <el-table-column prop="userInput.theme" label="题材" min-width="150">
            <template #default="{ row }">{{ row.userInput?.theme || '-' }}</template>
          </el-table-column>
          <el-table-column prop="userInput.keywords" label="关键词" min-width="150">
            <template #default="{ row }">{{ row.userInput?.keywords || '-' }}</template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag v-if="row.status === 'completed'" type="success">已完成</el-tag>
              <el-tag v-else-if="row.status === 'processing'" type="warning">处理中</el-tag>
              <el-tag v-else-if="row.status === 'failed'" type="danger">失败</el-tag>
              <el-tag v-else type="info">等待中</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="currentStep" label="进度" width="80">
            <template #default="{ row }">{{ row.currentStep }}/5</template>
          </el-table-column>
          <el-table-column label="集数" width="70">
            <template #default="{ row }">{{ (row.episodes?.length || 0) + 1 }}集</template>
          </el-table-column>
          <el-table-column label="创建时间" width="170">
            <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString('zh-CN') }}</template>
          </el-table-column>
          <el-table-column label="操作" width="90" fixed="right">
            <template #default="{ row }">
              <el-button v-if="row.status === 'completed'" type="primary" link @click="$router.push(`/app/history/${row.taskId}`)">查看</el-button>
              <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </template>

      <!-- 图片历史 -->
      <template v-else-if="activeType === 'image'">
        <el-empty description="暂无图片生成记录" v-if="!loading && !list.length" />
          <el-table v-else :data="list" v-loading="loading" stripe style="width:100%">
          <el-table-column label="预览" width="100">
            <template #default="{ row }">
              <img v-if="row.imageUrls?.[0]" :src="row.imageUrls[0]" class="thumb-img" />
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="提示词" min-width="180">
            <template #default="{ row }">
              <div class="prompt-cell">
                <span class="prompt-text">{{ row.prompt || '-' }}</span>
                <el-button v-if="row.prompt" size="small" text @click="copyText(row.prompt)">
                  <el-icon><CopyDocument /></el-icon>
                </el-button>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag v-if="row.status === 'completed'" type="success">已完成</el-tag>
              <el-tag v-else-if="row.status === 'processing'" type="warning">处理中</el-tag>
              <el-tag v-else-if="row.status === 'failed'" type="danger">失败</el-tag>
              <el-tag v-else type="info">等待中</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="创建时间" width="170">
            <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString('zh-CN') }}</template>
          </el-table-column>
          <el-table-column label="操作" width="85" fixed="right">
            <template #default="{ row }">
              <el-button v-if="row.imageUrls?.[0]" type="primary" link @click="downloadImage(row.imageUrls[0])">下载</el-button>
              <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </template>

      <!-- 视频历史 -->
      <template v-else-if="activeType === 'video'">
        <el-empty description="暂无视频生成记录" v-if="!loading && !list.length" />
        <div class="video-history-grid" v-else v-loading="loading">
          <div v-for="(item, idx) in list" :key="idx" class="vh-item">
            <div class="vh-thumb">
              <video v-if="item.videoUrl" :src="item.videoUrl" muted />
              <div v-else class="vh-pending">
                <el-icon :size="28" class="rotating"><Loading /></el-icon>
                <span>{{ item.status === 'failed' ? '失败' : '生成中' }}</span>
              </div>
            </div>
            <div class="vh-meta">
              <el-tag size="small">{{ modeLabel(item.mode) }}</el-tag>
              <span class="vh-time">{{ new Date(item.createdAt).toLocaleString('zh-CN') }}</span>
            </div>
            <div class="vh-actions">
              <el-button v-if="item.videoUrl" size="small" text type="primary" @click="downloadVideo(item.videoUrl)">下载</el-button>
              <el-button size="small" text type="danger" @click="handleDelete(item)">删除</el-button>
            </div>
          </div>
        </div>
      </template>

      <div class="pagination-wrapper" v-if="activeType !== 'video' && total > limit">
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
import { CopyDocument } from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const activeType = ref('drama')
const list = ref([])
const loading = ref(false)
const page = ref(1)
const limit = ref(10)
const total = ref(0)

const modeLabel = (m) => ({ 'text-to-video': '文生视频', 'image-to-video': '图生视频', 'reference-to-video': '参考生视频', 'video-edit': '视频编辑' }[m] || m)

function onTabChange() {
  page.value = 1
  list.value = []
  total.value = 0
  fetchList()
}

async function fetchList() {
  loading.value = true
  try {
    let url, res, data
    if (activeType.value === 'drama') {
      url = `/api/history?page=${page.value}&limit=${limit.value}`
      res = await authStore.fetchWithAuth(url)
      data = await res.json()
      if (data.success) {
        list.value = data.data.list
        total.value = data.data.pagination.total
      }
    } else if (activeType.value === 'video') {
      url = `/api/video/history?limit=50`
      res = await authStore.fetchWithAuth(url)
      data = await res.json()
      if (data.success) {
        list.value = data.data.list
        total.value = data.data.list.length
      }
    } else if (activeType.value === 'image') {
      url = `/api/image/history?page=${page.value}&limit=${limit.value}`
      res = await authStore.fetchWithAuth(url)
      data = await res.json()
      if (data.success) {
        list.value = data.data.list
        total.value = data.data.pagination.total
      }
    }
  } catch (e) {
    list.value = []
  } finally {
    loading.value = false
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm('确定要删除吗？', '确认删除', { type: 'warning' })
  } catch { return }
  try {
    let url
    if (activeType.value === 'drama') {
      url = `/api/drama/${row.taskId}`
    } else if (activeType.value === 'video') {
      url = `/api/video/task/${row.taskId}`
    } else if (activeType.value === 'image') {
      url = `/api/image/task/${row._id}`
    } else {
      return
    }
    const res = await authStore.fetchWithAuth(url, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) {
      ElMessage.success('已删除')
      fetchList()
    } else {
      ElMessage.error(data.message || '删除失败')
    }
  } catch (e) {
    // ignore
  }
}

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success('已复制到剪贴板')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}

function downloadImage(url) {
  const a = document.createElement('a'); a.href = url; a.download = 'image.png'; a.target = '_blank'; a.click()
}

function downloadVideo(url) {
  const a = document.createElement('a'); a.href = url; a.download = 'video.mp4'; a.target = '_blank'; a.click()
}

onMounted(fetchList)
</script>

<style scoped>
.history-page { max-width: 1100px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: center; }
.pagination-wrapper { margin-top: 16px; display: flex; justify-content: center; }
.thumb-img { width: 60px; height: 45px; object-fit: cover; border-radius: 4px; }
.video-history-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
.vh-item { border: 1px solid #e4e7ed; border-radius: 8px; overflow: hidden; transition: border-color 0.2s; }
.vh-item:hover { border-color: #7c3aed; }
.prompt-cell { display: flex; align-items: center; gap: 4px; }
.prompt-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0; }
.vh-thumb video { width: 100%; height: 130px; object-fit: cover; display: block; background: #000; }
.vh-pending { height: 130px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; color: #909399; background: #fafbfc; font-size: 13px; }
.vh-meta { padding: 8px 10px; display: flex; align-items: center; gap: 6px; justify-content: space-between; background: #fafbfc; }
.vh-time { font-size: 11px; color: #909399; }
.vh-actions { padding: 0 10px 8px; display: flex; gap: 4px; }
.rotating { animation: spin 2s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 767px) {
  .history-page { padding: 0 4px; }
  .page-header { flex-direction: column; gap: 10px; align-items: flex-start; }
  .video-history-grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
  .vh-item video, .vh-pending { height: 100px; }
  .pagination-wrapper { overflow-x: auto; }
}
</style>
