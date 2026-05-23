<template>
  <div class="admin-dashboard">
    <h2 style="margin-bottom:20px">系统分析</h2>

    <!-- 概览卡片 -->
    <el-row :gutter="16" class="stat-row">
      <el-col :xs="12" :sm="8" :md="4">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-num">{{ overview.totalUsers }}</div>
          <div class="stat-label">总用户</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="8" :md="4">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-num">{{ overview.totalTasks }}</div>
          <div class="stat-label">总任务</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="8" :md="4">
        <el-card shadow="hover" class="stat-card stat-info">
          <div class="stat-num">{{ overview.todayTasks }}</div>
          <div class="stat-label">今日任务</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="8" :md="4">
        <el-card shadow="hover" class="stat-card stat-success">
          <div class="stat-num">{{ overview.successRate }}%</div>
          <div class="stat-label">成功率</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="8" :md="4">
        <el-card shadow="hover" class="stat-card stat-warning">
          <div class="stat-num">{{ overview.newUsersToday }}</div>
          <div class="stat-label">今日新用户</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="8" :md="4">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-num">{{ overview.completedTasks }}</div>
          <div class="stat-label">已完成</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 任务分类 -->
    <el-row :gutter="16" class="stat-row">
      <el-col :xs="12" :sm="8" :md="8">
        <el-card shadow="hover" class="stat-card breakdown drama">
          <div class="stat-num">{{ overview.totalDramas || 0 }}</div>
          <div class="stat-label">剧本任务</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="8" :md="8">
        <el-card shadow="hover" class="stat-card breakdown image">
          <div class="stat-num">{{ overview.totalImages || 0 }}</div>
          <div class="stat-label">图片任务</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="8" :md="8">
        <el-card shadow="hover" class="stat-card breakdown video">
          <div class="stat-num">{{ overview.totalVideos || 0 }}</div>
          <div class="stat-label">视频任务</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 趋势图 -->
    <el-card style="margin-bottom:16px">
      <template #header>30天任务趋势</template>
      <div :ref="setRef('trendChart')" style="height:320px"></div>
    </el-card>

    <!-- 三饼图 -->
    <el-row :gutter="16">
      <el-col :xs="24" :sm="8" :md="8">
        <el-card><template #header>设备分布</template><div :ref="setRef('deviceChart')" style="height:260px"></div></el-card>
      </el-col>
      <el-col :xs="24" :sm="8" :md="8">
        <el-card><template #header>浏览器分布</template><div :ref="setRef('browserChart')" style="height:260px"></div></el-card>
      </el-col>
      <el-col :xs="24" :sm="8" :md="8">
        <el-card><template #header>OS分布</template><div :ref="setRef('osChart')" style="height:260px"></div></el-card>
      </el-col>
    </el-row>

    <!-- 厂商 + 地区 -->
    <el-row :gutter="16" style="margin-top:16px">
      <el-col :xs="24" :sm="24" :md="12">
        <el-card><template #header>厂商使用分布</template><div :ref="setRef('providerChart')" style="height:300px"></div></el-card>
      </el-col>
      <el-col :xs="24" :sm="24" :md="12">
        <el-card>
          <template #header>地区分布 (Top 15)</template>
          <div class="table-scroll">
            <el-table :data="geoData" size="small" max-height="300">
            <el-table-column prop="country" label="国家/地区" />
            <el-table-column prop="region" label="区域" />
            <el-table-column prop="count" label="请求数" width="80" />
          </el-table>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
const overview = ref({ totalUsers: 0, totalTasks: 0, todayTasks: 0, completedTasks: 0, totalDramas: 0, totalImages: 0, totalVideos: 0, newUsersToday: 0, successRate: 0, trend: [] })
const deviceData = ref({ browsers: [], os: [], devices: [] })
const geoData = ref([])
const providerData = ref([])

const chartRefs = {}
const setRef = (name) => (el) => { chartRefs[name] = el }

onMounted(async () => {
  const [ov, dev, geo, prov] = await Promise.all([
    authStore.fetchWithAuth('/api/admin/analytics/overview').then(r => r.json()),
    authStore.fetchWithAuth('/api/admin/analytics/devices').then(r => r.json()),
    authStore.fetchWithAuth('/api/admin/analytics/geo').then(r => r.json()),
    authStore.fetchWithAuth('/api/admin/analytics/providers').then(r => r.json())
  ])
  if (ov.success) overview.value = ov.data
  if (dev.success) deviceData.value = dev.data
  if (geo.success) geoData.value = geo.data
  if (prov.success) providerData.value = prov.data

  await nextTick()
  renderCharts()
})

function makePie(data) {
  return { tooltip: { trigger: 'item' }, series: [{ type: 'pie', radius: ['40%', '70%'], data }] }
}

function renderCharts() {
  const trendChart = chartRefs.trendChart
  if (trendChart) {
    const c = echarts.init(trendChart)
    c.setOption({
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: overview.value.trend.map(t => t._id) },
      yAxis: { type: 'value' },
      series: [
        { name: '总数', type: 'bar', data: overview.value.trend.map(t => t.count), itemStyle: { color: '#7c3aed' } },
        { name: '完成', type: 'line', data: overview.value.trend.map(t => t.completed), itemStyle: { color: '#67c23a' } }
      ]
    })
  }

  for (const [key, data] of [
    ['deviceChart', deviceData.value.devices],
    ['browserChart', deviceData.value.browsers],
    ['osChart', deviceData.value.os]
  ]) {
    const el = chartRefs[key]
    if (el && data.length) echarts.init(el).setOption(makePie(data))
  }

  const provEl = chartRefs.providerChart
  if (provEl && providerData.value.length) {
    const c = echarts.init(provEl)
    c.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['剧本', '图片', '视频'], bottom: 0 },
      xAxis: { type: 'category', data: providerData.value.map(p => p.provider) },
      yAxis: { type: 'value' },
      series: [
        { name: '剧本', type: 'bar', stack: 'total', data: providerData.value.map(p => p.dramaCount || 0), itemStyle: { color: '#409eff' } },
        { name: '图片', type: 'bar', stack: 'total', data: providerData.value.map(p => p.imageCount || 0), itemStyle: { color: '#a78bfa' } },
        { name: '视频', type: 'bar', stack: 'total', data: providerData.value.map(p => p.videoCount || 0), itemStyle: { color: '#9b59b6' } }
      ]
    })
  }
}
</script>

<style scoped>
.admin-dashboard { max-width: 1200px; margin: 0 auto; }
.stat-row { margin-bottom: 16px; }
.stat-card { text-align: center; padding: 4px 0; }
.stat-num { font-size: 24px; font-weight: 700; color: #303133; }
.stat-label { font-size: 12px; color: #909399; margin-top: 4px; }
.stat-success .stat-num { color: #67c23a; }
.stat-info .stat-num { color: #7c3aed; }
.stat-warning .stat-num { color: #e6a23c; }
.breakdown.drama .stat-num { color: #409eff; }
.breakdown.image .stat-num { color: #7c3aed; }
.breakdown.video .stat-num { color: #9b59b6; }

@media (max-width: 767px) {
  .admin-dashboard { padding: 0 4px; }
  .admin-dashboard h2 { font-size: 18px; }
  .stat-row { margin-bottom: 8px; }
  .stat-row .el-col { margin-bottom: 8px; }
  .stat-card { padding: 2px 0; }
  .stat-num { font-size: 20px; }
  .table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
}
</style>
