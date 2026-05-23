<template>
  <div class="dashboard-page">
    <h2 style="margin-bottom:20px">我的数据看板</h2>

    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stat-row">
      <el-col :xs="12" :sm="12" :md="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-num">{{ stats.totalTasks }}</div>
          <div class="stat-label">总生成次数</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="12" :md="6">
        <el-card shadow="hover" class="stat-card stat-success">
          <div class="stat-num">{{ stats.successRate }}%</div>
          <div class="stat-label">成功率</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="12" :md="6">
        <el-card shadow="hover" class="stat-card stat-info">
          <div class="stat-num">{{ stats.completedDramas + (stats.completedImages||0) + (stats.completedVideos||0) }}</div>
          <div class="stat-label">已完成</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="12" :md="6">
        <el-card shadow="hover" class="stat-card stat-warning">
          <div class="stat-num">{{ avgTime }}</div>
          <div class="stat-label">剧本平均耗时(秒)</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 趋势图 -->
    <el-row :gutter="16">
      <el-col :xs="24" :sm="24" :md="12">
        <el-card>
          <template #header>7天生成趋势</template>
          <div ref="trendChart" style="height:260px"></div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="24" :md="12">
        <el-card>
          <template #header>题材分布</template>
          <div ref="themeChart" style="height:260px"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 最近活动 -->
    <el-card style="margin-top:16px">
      <template #header>最近活动</template>
      <el-timeline>
        <el-timeline-item
          v-for="item in stats.recentActivity"
          :key="item.taskId"
          :timestamp="new Date(item.createdAt).toLocaleString('zh-CN')"
          :type="item.status === 'completed' ? 'success' : item.status === 'failed' ? 'danger' : 'warning'"
        >
          {{ item.theme }}
          <el-tag size="small" style="margin-left:8px">{{ item.status === 'completed' ? '完成' : item.status === 'failed' ? '失败' : '处理中' }}</el-tag>
        </el-timeline-item>
      </el-timeline>
      <el-empty v-if="!stats.recentActivity?.length" description="暂无活动" />
    </el-card>

    <!-- 服务器状态 -->
    <el-card v-if="server" style="margin-top:16px">
      <template #header>服务器状态</template>
      <el-row :gutter="16">
        <el-col :xs="12" :sm="12" :md="6">
          <div class="server-item">
            <div class="server-label">应用版本</div>
            <div class="server-val">{{ server.app?.version || '-' }}</div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="12" :md="6">
          <div class="server-item">
            <div class="server-label">Node.js</div>
            <div class="server-val">{{ server.app?.nodeVersion || '-' }}</div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="12" :md="6">
          <div class="server-item">
            <div class="server-label">进程运行时间</div>
            <div class="server-val">{{ server.process?.uptime || '-' }}</div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="12" :md="6">
          <div class="server-item">
            <div class="server-label">系统运行时间</div>
            <div class="server-val">{{ server.system?.uptime || '-' }}</div>
          </div>
        </el-col>
      </el-row>
      <el-divider style="margin:12px 0" />
      <el-row :gutter="16">
        <el-col :xs="24" :sm="12" :md="12">
          <div class="server-info-row">
            <span class="server-info-label">CPU</span>
            <span class="server-info-text">{{ server.system?.cpuModel || '-' }} · {{ server.system?.cpuCores || 0 }} 核</span>
          </div>
          <div class="server-info-row">
            <span class="server-info-label">负载</span>
            <span class="server-info-text">{{ (server.system?.loadAvg || []).join(' / ') }}</span>
          </div>
        </el-col>
        <el-col :xs="24" :sm="12" :md="12">
          <div class="server-info-row">
            <span class="server-info-label">系统内存</span>
            <span class="server-info-text">
              {{ server.system?.totalMemory || '-' }} 总量 · {{ server.system?.freeMemory || '-' }} 空闲
              <el-tag size="small" :type="server.system?.memoryUsagePercent > 80 ? 'danger' : server.system?.memoryUsagePercent > 60 ? 'warning' : 'success'" style="margin-left:6px">
                {{ server.system?.memoryUsagePercent || 0 }}%
              </el-tag>
            </span>
          </div>
          <div class="server-info-row">
            <span class="server-info-label">堆内存</span>
            <span class="server-info-text">
              {{ server.heap?.usedMB || 0 }} MB / {{ server.heap?.totalMB || 0 }} MB · RSS {{ server.heap?.rssMB || 0 }} MB
              <el-tag size="small" type="info" style="margin-left:6px">{{ server.heap?.usagePercent || 0 }}%</el-tag>
            </span>
          </div>
        </el-col>
      </el-row>
      <div class="server-footer">
        <span>PID {{ server.process?.pid || '-' }} · {{ server.app?.platform || '-' }} {{ server.app?.arch || '-' }}</span>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const stats = ref({
  totalDramas: 0, completedDramas: 0, failedDramas: 0,
  successRate: 0, avgExecutionTime: 0,
  themeDistribution: [], trend: [], recentActivity: []
})
const avgTime = ref(0)
const trendChart = ref(null)
const themeChart = ref(null)
const server = ref(null)

onMounted(async () => {
  try {
    const res = await authStore.fetchWithAuth('/api/analytics/user')
    const data = await res.json()
    if (data.success) {
      stats.value = data.data
      avgTime.value = data.data.avgExecutionTime > 0 ? (data.data.avgExecutionTime / 1000).toFixed(0) : 0
    }
  } catch {}

  // 服务器状态
  try {
    const sRes = await authStore.fetchWithAuth('/api/analytics/server')
    const sData = await sRes.json()
    if (sData.success) server.value = sData.data
  } catch {}

  await nextTick()
  renderCharts()
})

function renderCharts() {
  if (trendChart.value) {
    const chart = echarts.init(trendChart.value)
    chart.setOption({
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: stats.value.trend.map(t => t._id) },
      yAxis: { type: 'value' },
      series: [
        { name: '总数', type: 'line', data: stats.value.trend.map(t => t.count), smooth: true, itemStyle: { color: '#7c3aed' } },
        { name: '完成', type: 'line', data: stats.value.trend.map(t => t.completed), smooth: true, itemStyle: { color: '#67c23a' } }
      ]
    })
  }

  if (themeChart.value) {
    const chart = echarts.init(themeChart.value)
    chart.setOption({
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        data: stats.value.themeDistribution.map(t => ({ name: t.name, value: t.value }))
      }]
    })
  }
}
</script>

<style scoped>
.dashboard-page { max-width: 1100px; margin: 0 auto; }
.stat-row { margin-bottom: 16px; }
.stat-card { text-align: center; padding: 8px 0; }
.stat-num { font-size: 28px; font-weight: 700; color: #303133; }
.stat-label { font-size: 13px; color: #909399; margin-top: 4px; }
.stat-success .stat-num { color: #67c23a; }
.stat-info .stat-num { color: #7c3aed; }
.stat-warning .stat-num { color: #e6a23c; }

/* Server stats */
.server-item { padding: 8px 0; }
.server-label { font-size: 12px; color: #909399; margin-bottom: 4px; }
.server-val { font-size: 16px; font-weight: 600; color: #303133; }
.server-info-row { display: flex; align-items: center; gap: 10px; padding: 6px 0; }
.server-info-label { font-size: 12px; color: #909399; min-width: 56px; flex-shrink: 0; }
.server-info-text { font-size: 13px; color: #606266; }
.server-footer { margin-top: 12px; font-size: 11px; color: #c0c4cc; }

@media (max-width: 767px) {
  .dashboard-page { padding: 0 4px; }
  .dashboard-page h2 { font-size: 18px; }
  .stat-row { margin-bottom: 8px; }
  .stat-card { padding: 4px 0; }
  .stat-num { font-size: 22px; }
  .el-row { flex-wrap: wrap; }
  .el-col { margin-bottom: 8px; }
  .el-card { margin-bottom: 8px; }
}
</style>
