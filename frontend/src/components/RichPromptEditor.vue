<template>
  <div class="rich-editor" :class="{ 'is-disabled': disabled, 'is-focused': focused }">
    <div class="rich-editor-inner">
      <div
        class="rich-editor-backdrop"
        ref="backdropRef"
        aria-hidden="true"
        v-html="highlightedHtml"
      />
      <textarea
        class="rich-editor-textarea"
        ref="textareaRef"
        :value="modelValue"
        :placeholder="placeholder"
        :rows="rows"
        :disabled="disabled"
        :readonly="disabled"
        @input="onInput"
        @scroll="syncScroll"
        @focus="focused = true"
        @blur="focused = false"
        @keydown="onKeydown"
        @compositionstart="composing = true"
        @compositionend="onCompositionEnd"
      />
    </div>
    <div class="rich-editor-hint" v-if="hintLabels.length">
      <span class="hint-label">可用引用：</span>
      <span
        v-for="lbl in hintLabels"
        :key="lbl.label"
        :class="['hint-tag', `hint-${lbl.type}`]"
        @click="$emit('insert-label', lbl.label)"
      >@{{ lbl.label }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '描述你想生成的视频...' },
  rows: { type: Number, default: 8 },
  references: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'insert-label'])

const textareaRef = ref(null)
const backdropRef = ref(null)
const focused = ref(false)
const composing = ref(false)

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const highlightedHtml = computed(() => {
  let text = props.modelValue || ''
  if (!text) return ''

  let html = escapeHtml(text)

  // Highlight @图像\d+, @视频\d+, @音频\d+ with different colors
  html = html.replace(/(@图像\d+)/g, '<span class="ref-img">$1</span>')
  html = html.replace(/(@视频\d+)/g, '<span class="ref-vid">$1</span>')
  html = html.replace(/(@音频\d+)/g, '<span class="ref-aud">$1</span>')

  // Replace newlines with <br> for proper line-height
  html = html.replace(/\n/g, '<br>')

  // Add a trailing space to prevent last line collapse
  return html + '\n'
})

const hintLabels = computed(() => {
  return (props.references || []).map(r => ({ label: r.label, type: r.type }))
})

function onInput(e) {
  emit('update:modelValue', e.target.value)
  nextTick(() => syncScroll())
}

function onCompositionEnd(e) {
  composing.value = false
  emit('update:modelValue', e.target.value)
  nextTick(() => syncScroll())
}

function syncScroll() {
  if (backdropRef.value && textareaRef.value) {
    backdropRef.value.scrollTop = textareaRef.value.scrollTop
    backdropRef.value.scrollLeft = textareaRef.value.scrollLeft
  }
}

function onKeydown(e) {
  // Tab key: insert 2 spaces
  if (e.key === 'Tab') {
    e.preventDefault()
    const ta = textareaRef.value
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const val = ta.value
    const newVal = val.substring(0, start) + '  ' + val.substring(end)
    emit('update:modelValue', newVal)
    nextTick(() => {
      ta.selectionStart = ta.selectionEnd = start + 2
      syncScroll()
    })
  }
}

function insertAtCursor(text) {
  const ta = textareaRef.value
  if (!ta) return
  const start = ta.selectionStart
  const end = ta.selectionEnd
  const val = ta.value

  // Add a leading space if not at start and previous char is not space/newline
  const prefix = start > 0 && !/[\s\n]/.test(val.charAt(start - 1)) ? ' ' : ''
  const newVal = val.substring(0, start) + prefix + text + val.substring(end)
  emit('update:modelValue', newVal)

  nextTick(() => {
    const pos = start + prefix.length + text.length
    ta.focus()
    ta.selectionStart = ta.selectionEnd = pos
    syncScroll()
  })
}

function focus() {
  textareaRef.value?.focus()
}

defineExpose({ insertAtCursor, focus })
</script>

<style scoped>
.rich-editor {
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  transition: border-color 0.2s, box-shadow 0.2s;
  background: #fff;
}
.rich-editor.is-focused {
  border-color: #7c3aed;
  box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.12);
}
.rich-editor.is-disabled {
  background: #f5f7fa;
  opacity: 0.7;
}

.rich-editor-inner {
  position: relative;
  min-height: 120px;
}

.rich-editor-backdrop,
.rich-editor-textarea {
  font-family: 'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: 14px;
  line-height: 1.7;
  letter-spacing: 0;
  word-spacing: 0;
  padding: 12px 14px;
  margin: 0;
  border: none;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-wrap: break-word;
  box-sizing: border-box;
  width: 100%;
  min-height: inherit;
}

.rich-editor-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  pointer-events: none;
  user-select: none;
  color: #303133;
}

.rich-editor-textarea {
  position: relative;
  z-index: 1;
  display: block;
  resize: vertical;
  outline: none;
  background: transparent;
  color: transparent;
  caret-color: #303133;
  -webkit-text-fill-color: transparent;
}

.rich-editor-textarea::placeholder {
  color: #c0c4cc;
  -webkit-text-fill-color: #c0c4cc;
}

/* @reference highlight colors */
:deep(.ref-img) {
  color: #409eff;
  background: rgba(64, 158, 255, 0.1);
  border-radius: 3px;
  padding: 0 2px;
  font-weight: 500;
}
:deep(.ref-vid) {
  color: #9b59b6;
  background: rgba(155, 89, 182, 0.1);
  border-radius: 3px;
  padding: 0 2px;
  font-weight: 500;
}
:deep(.ref-aud) {
  color: #67c23a;
  background: rgba(103, 194, 58, 0.1);
  border-radius: 3px;
  padding: 0 2px;
  font-weight: 500;
}

/* Hint / available reference labels */
.rich-editor-hint {
  padding: 8px 14px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.hint-label {
  font-size: 12px;
  color: #c0c4cc;
}
.hint-tag {
  display: inline-block;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: opacity 0.15s;
  user-select: none;
}
.hint-tag:hover { opacity: 0.8; }
.hint-image {
  color: #409eff;
  background: rgba(64, 158, 255, 0.1);
  border: 1px solid rgba(64, 158, 255, 0.25);
}
.hint-video {
  color: #9b59b6;
  background: rgba(155, 89, 182, 0.1);
  border: 1px solid rgba(155, 89, 182, 0.25);
}
.hint-audio {
  color: #67c23a;
  background: rgba(103, 194, 58, 0.1);
  border: 1px solid rgba(103, 194, 58, 0.25);
}

@media (max-width: 767px) {
  .rich-editor-backdrop,
  .rich-editor-textarea {
    font-size: 13px;
    padding: 10px 12px;
  }
  .rich-editor-hint {
    padding: 6px 10px;
    gap: 4px;
  }
  .hint-tag {
    font-size: 11px;
    padding: 2px 6px;
  }
}
</style>
