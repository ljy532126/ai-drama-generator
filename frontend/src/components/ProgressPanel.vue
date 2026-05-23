<template>
  <el-card class="progress-card">
    <template #header>
      <span>生成进度</span>
    </template>

    <el-steps :active="step" finish-status="success" align-center>
      <el-step title="故事大纲" description="Outline Agent" />
      <el-step title="人物设定" description="Character Agent" />
      <el-step title="剧情结构" description="Structure Agent" />
      <el-step title="完整剧本" description="Script Agent" />
      <el-step title="分镜提示词" description="Storyboard Agent" />
    </el-steps>

    <div class="progress-bar-wrapper">
      <el-progress :percentage="percent" :stroke-width="12" :color="colors" />
      <p class="progress-status">{{ status }}</p>
    </div>
  </el-card>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  step: { type: Number, default: 0 },
  status: { type: String, default: '' }
})

const percent = computed(() => (props.step / 5) * 100)

const colors = [
  { color: '#f56c6c', percentage: 20 },
  { color: '#e6a23c', percentage: 40 },
  { color: '#5cb87a', percentage: 60 },
  { color: '#1989fa', percentage: 80 },
  { color: '#6f42c1', percentage: 100 }
]
</script>

<style scoped>
.progress-card {
  margin-bottom: 20px;
}

.progress-bar-wrapper {
  margin-top: 24px;
  text-align: center;
}

.progress-status {
  margin-top: 8px;
  color: #909399;
  font-size: 14px;
}
</style>
