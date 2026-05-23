<template>
  <el-select
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    placeholder="选择AI厂商"
    style="width: 100%"
    size="large"
  >
    <el-option
      v-for="p in providers"
      :key="p.value"
      :label="p.label"
      :value="p.value"
    >
      <span class="opt-icon">{{ p.icon }}</span>
      <span>{{ p.label }}</span>
      <el-tag v-if="p.configured" size="small" type="success" style="margin-left:8px">已配置</el-tag>
      <el-tag v-else size="small" type="info" style="margin-left:8px">未配置</el-tag>
    </el-option>
  </el-select>
  <div v-if="!selectedConfigured" class="provider-hint">
    <el-icon><Warning /></el-icon>
    该厂商尚未配置Key，将尝试使用系统默认配置
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '../stores/auth'

const props = defineProps({
  modelValue: { type: String, default: 'deepseek' }
})

defineEmits(['update:modelValue'])

const authStore = useAuthStore()
const providers = ref([])

const selectedConfigured = computed(() => {
  const p = providers.value.find(p => p.value === props.modelValue)
  return p?.configured ?? false
})

async function loadProviders() {
  try {
    const res = await authStore.fetchWithAuth('/api/keys')
    const data = await res.json()
    if (data.success && data.data.text) {
      providers.value = data.data.text.map(p => ({
        value: p.provider,
        label: p.label,
        icon: p.icon || '',
        configured: p.available
      }))
    }
  } catch {}
}

onMounted(loadProviders)
</script>

<style scoped>
.opt-icon { margin-right: 4px; }
.provider-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #e6a23c;
  font-size: 12px;
  margin-top: 4px;
}
</style>
