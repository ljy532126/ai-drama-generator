<template>
  <div class="media-panel">
    <!-- 参考图像区域 -->
    <div class="media-section">
      <div class="section-header">
        <span class="section-title"><el-icon><Picture /></el-icon> 参考图像</span>
        <div class="section-actions">
          <el-input
            v-model="imageUrlInput"
            size="small"
            placeholder="输入图片URL，回车添加"
            style="width:200px"
            clearable
            @keyup.enter="addImageUrl"
          >
            <template #append>
              <el-button :icon="Plus" size="small" @click="addImageUrl" />
            </template>
          </el-input>
          <el-upload
            :auto-upload="false"
            :show-file-list="false"
            :on-change="onImageFilesChange"
            accept="image/*"
            multiple
          >
            <el-button size="small" text type="primary">
              <el-icon><Upload /></el-icon> 上传
            </el-button>
          </el-upload>
        </div>
      </div>
      <div class="media-cards" v-if="imageItems.length">
        <div v-for="item in imageItems" :key="item.id" class="media-card">
          <div class="card-thumb">
            <img v-if="item.previewUrl" :src="item.previewUrl" />
            <el-icon v-else :size="24"><Picture /></el-icon>
          </div>
          <el-tag
            :class="['card-label', `tag-image`]"
            size="small"
            @click="$emit('insert-label', item.label)"
          >{{ item.label }}</el-tag>
          <el-button
            :icon="Close"
            circle
            size="small"
            class="card-remove"
            @click="removeItem(item.id)"
          />
        </div>
      </div>
      <div v-else class="media-empty">上传或输入图片URL，将自动标记为 图像1, 图像2...</div>
    </div>

    <!-- 参考视频区域 -->
    <div class="media-section">
      <div class="section-header">
        <span class="section-title"><el-icon><VideoCamera /></el-icon> 参考视频</span>
        <div class="section-actions">
          <el-input
            v-model="videoUrlInput"
            size="small"
            placeholder="输入视频URL，回车添加"
            style="width:200px"
            clearable
            @keyup.enter="addVideoUrl"
          >
            <template #append>
              <el-button :icon="Plus" size="small" @click="addVideoUrl" />
            </template>
          </el-input>
          <el-upload
            :auto-upload="false"
            :show-file-list="false"
            :on-change="onVideoFileChange"
            accept="video/*"
          >
            <el-button size="small" text type="primary" :disabled="videoItems.length >= 1">
              <el-icon><Upload /></el-icon> 上传
            </el-button>
          </el-upload>
        </div>
      </div>
      <div class="media-cards" v-if="videoItems.length">
        <div v-for="item in videoItems" :key="item.id" class="media-card">
          <div class="card-thumb video-thumb">
            <video v-if="item.previewUrl" :src="item.previewUrl" muted />
            <el-icon v-else :size="24"><VideoCamera /></el-icon>
          </div>
          <el-tag
            :class="['card-label', `tag-video`]"
            size="small"
            @click="$emit('insert-label', item.label)"
          >{{ item.label }}</el-tag>
          <span class="card-name">{{ item.name }}</span>
          <el-button
            :icon="Close"
            circle
            size="small"
            class="card-remove"
            @click="removeItem(item.id)"
          />
        </div>
      </div>
      <div v-else class="media-empty">上传或输入视频URL，将标记为 视频1</div>
    </div>

    <!-- 参考音频区域 -->
    <div class="media-section">
      <div class="section-header">
        <span class="section-title"><el-icon><Headset /></el-icon> 参考音频</span>
        <div class="section-actions">
          <el-input
            v-model="audioUrlInput"
            size="small"
            placeholder="输入音频URL，回车添加"
            style="width:200px"
            clearable
            @keyup.enter="addAudioUrl"
          >
            <template #append>
              <el-button :icon="Plus" size="small" @click="addAudioUrl" />
            </template>
          </el-input>
          <el-upload
            :auto-upload="false"
            :show-file-list="false"
            :on-change="onAudioFileChange"
            accept="audio/*"
          >
            <el-button size="small" text type="primary" :disabled="audioItems.length >= 1">
              <el-icon><Upload /></el-icon> 上传
            </el-button>
          </el-upload>
        </div>
      </div>
      <div class="media-cards" v-if="audioItems.length">
        <div v-for="item in audioItems" :key="item.id" class="media-card">
          <div class="card-thumb audio-thumb">
            <el-icon :size="24"><Headset /></el-icon>
          </div>
          <el-tag
            :class="['card-label', `tag-audio`]"
            size="small"
            @click="$emit('insert-label', item.label)"
          >{{ item.label }}</el-tag>
          <span class="card-name">{{ item.name }}</span>
          <el-button
            :icon="Close"
            circle
            size="small"
            class="card-remove"
            @click="removeItem(item.id)"
          />
        </div>
      </div>
      <div v-else class="media-empty">上传或输入音频URL，将标记为 音频1</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { Picture, VideoCamera, Headset, Upload, Plus, Close } from '@element-plus/icons-vue'

let nextImageIdx = 1
let nextVideoIdx = 1
let nextAudioIdx = 1

// Store raw File objects outside Vue reactivity to prevent proxy corruption
const fileStore = new Map()

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'insert-label'])

// URL input fields
const imageUrlInput = ref('')
const videoUrlInput = ref('')
const audioUrlInput = ref('')

const imageItems = computed(() => props.modelValue.filter(m => m.type === 'image'))
const videoItems = computed(() => props.modelValue.filter(m => m.type === 'video'))
const audioItems = computed(() => props.modelValue.filter(m => m.type === 'audio'))

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8) }

function addFileItem(file, type) {
  let label
  if (type === 'image') {
    label = `图像${nextImageIdx++}`
  } else if (type === 'video') {
    label = `视频${nextVideoIdx++}`
  } else {
    label = `音频${nextAudioIdx++}`
  }
  const id = genId()
  // Store raw File in non-reactive Map to avoid Vue proxy corruption
  fileStore.set(id, file)
  const item = {
    id,
    label,
    type,
    hasFile: true,
    url: '',
    previewUrl: type !== 'audio' ? URL.createObjectURL(file) : '',
    name: file.name
  }
  emit('update:modelValue', [...props.modelValue, item])
}

function addUrlItem(url, type) {
  if (!url || !url.trim()) return
  const trimmed = url.trim()
  let label
  if (type === 'image') {
    label = `图像${nextImageIdx++}`
  } else if (type === 'video') {
    label = `视频${nextVideoIdx++}`
  } else {
    label = `音频${nextAudioIdx++}`
  }
  const item = {
    id: genId(),
    label,
    type,
    hasFile: false,
    url: trimmed,
    previewUrl: type === 'image' ? trimmed : '',
    name: trimmed.split('/').pop()?.split('?')[0] || trimmed
  }
  emit('update:modelValue', [...props.modelValue, item])
}

function removeItem(id) {
  fileStore.delete(id)
  URL.revokeObjectURL(props.modelValue.find(m => m.id === id)?.previewUrl || '')
  emit('update:modelValue', props.modelValue.filter(m => m.id !== id))
}

// Image handlers
function onImageFilesChange(file) { addFileItem(file.raw, 'image') }
function addImageUrl() { addUrlItem(imageUrlInput.value, 'image'); imageUrlInput.value = '' }

// Video handlers
function onVideoFileChange(file) { addFileItem(file.raw, 'video') }
function addVideoUrl() { addUrlItem(videoUrlInput.value, 'video'); videoUrlInput.value = '' }

// Audio handlers
function onAudioFileChange(file) { addFileItem(file.raw, 'audio') }
function addAudioUrl() { addUrlItem(audioUrlInput.value, 'audio'); audioUrlInput.value = '' }

// Build FormData with files and return fileLabels JSON
function buildFormData(fd) {
  const fileLabels = {}
  let imgIdx = 0
  let vidIdx = 0
  let audIdx = 0

  for (const item of props.modelValue) {
    if (item.hasFile) {
      const file = fileStore.get(item.id)
      if (!file) continue
      // Local file upload — use raw File from non-reactive Map
      if (item.type === 'image') {
        fd.append('images', file)
        fileLabels[item.label] = { type: 'image', field: 'images', index: imgIdx++ }
      } else if (item.type === 'video') {
        fd.append('referenceVideo', file)
        fileLabels[item.label] = { type: 'video', field: 'referenceVideo', index: vidIdx++ }
      } else if (item.type === 'audio') {
        fd.append('referenceAudio', file)
        fileLabels[item.label] = { type: 'audio', field: 'referenceAudio', index: audIdx++ }
      }
    } else if (item.url) {
      // URL reference
      fileLabels[item.label] = { type: item.type, url: item.url }
    }
  }

  return JSON.stringify(fileLabels)
}

function clear() {
  fileStore.clear()
  emit('update:modelValue', [])
}

defineExpose({ buildFormData, clear, addFileItem, addUrlItem })
</script>

<style scoped>
.media-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.media-section {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 10px 12px;
  background: #fafbfc;
  transition: border-color 0.2s;
}
.media-section:hover {
  border-color: #c8ccd4;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  gap: 8px;
}
.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.section-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.media-cards {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.media-card {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  background: #fff;
  transition: border-color 0.15s;
}
.media-card:hover {
  border-color: #7c3aed;
}

.card-thumb {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f2f5;
  color: #909399;
  flex-shrink: 0;
}
.card-thumb img, .card-thumb video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.audio-thumb { background: rgba(103, 194, 58, 0.1); color: #67c23a; }
.video-thumb { background: rgba(155, 89, 182, 0.1); color: #9b59b6; }

.card-label {
  cursor: pointer !important;
  user-select: none;
}
.card-label:hover { opacity: 0.8; }
.tag-image { border-color: rgba(64, 158, 255, 0.5); color: #409eff; background: rgba(64, 158, 255, 0.08); }
.tag-video { border-color: rgba(155, 89, 182, 0.5); color: #9b59b6; background: rgba(155, 89, 182, 0.08); }
.tag-audio { border-color: rgba(103, 194, 58, 0.5); color: #67c23a; background: rgba(103, 194, 58, 0.08); }

.card-name {
  font-size: 11px;
  color: #909399;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-remove {
  flex-shrink: 0;
}

.media-empty {
  font-size: 12px;
  color: #c0c4cc;
  padding: 4px 0;
}

@media (max-width: 767px) {
  .section-header { flex-wrap: wrap; }
  .section-actions { flex-wrap: wrap; }
  .section-actions .el-input { width: 140px !important; }
  .card-name { max-width: 60px; }
}
</style>
