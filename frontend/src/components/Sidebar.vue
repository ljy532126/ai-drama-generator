<template>
  <div class="sidebar">
    <div class="sidebar-logo" @click="$router.push('/app/dashboard')">
      <img src="/logo.svg" class="logo-img" :class="{ collapsed: appStore.sidebarCollapsed }" alt="Logo" />
      <span v-if="!appStore.sidebarCollapsed" class="logo-text">Florient</span>
    </div>

    <el-menu
      :default-active="activeMenu"
      :collapse="appStore.sidebarCollapsed"
      background-color="transparent"
      text-color="#5b5b78"
      active-text-color="#7c3aed"
      router
      class="sidebar-menu"
      @click="emitNavigate"
    >
      <el-menu-item index="/app/dashboard">
        <el-icon><HomeFilled /></el-icon>
        <template #title>首页</template>
      </el-menu-item>

      <el-sub-menu index="/app/ai-create">
        <template #title>
          <el-icon><MagicStick /></el-icon>
          <span>AI 创作</span>
        </template>
        <el-menu-item index="/app/generate">
          <el-icon><Edit /></el-icon>
          <template #title>剧本生成</template>
        </el-menu-item>
        <el-menu-item index="/app/generate/image">
          <el-icon><Picture /></el-icon>
          <template #title>图片生成</template>
        </el-menu-item>
        <el-menu-item index="/app/generate/video">
          <el-icon><VideoCamera /></el-icon>
          <template #title>视频生成</template>
        </el-menu-item>
        <el-menu-item index="/app/chat">
          <el-icon><ChatDotRound /></el-icon>
          <template #title>AI 聊天</template>
        </el-menu-item>
        <el-menu-item index="/app/history">
          <el-icon><Document /></el-icon>
          <template #title>历史记录</template>
        </el-menu-item>
        <el-menu-item index="/app/tasks">
          <el-icon><Clock /></el-icon>
          <template #title>任务队列</template>
        </el-menu-item>
      </el-sub-menu>

      <el-menu-item index="/app/profile">
        <el-icon><Setting /></el-icon>
        <template #title>个人中心</template>
      </el-menu-item>

      <template v-if="authStore.isAdmin">
        <div class="sidebar-divider"></div>

        <el-menu-item index="/app/admin/users">
          <el-icon><User /></el-icon>
          <template #title>用户管理</template>
        </el-menu-item>

        <el-menu-item index="/app/admin/keys">
          <el-icon><Key /></el-icon>
          <template #title>Key管理</template>
        </el-menu-item>

        <el-menu-item index="/app/admin/dashboard">
          <el-icon><PieChart /></el-icon>
          <template #title>系统分析</template>
        </el-menu-item>
      </template>
    </el-menu>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '../stores/app'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const appStore = useAppStore()
const authStore = useAuthStore()

const emit = defineEmits(['navigate'])
const activeMenu = computed(() => {
  if (route.path.startsWith('/app/generate')) return route.path
  if (route.path.startsWith('/app/history')) return '/app/history'
  if (route.path.startsWith('/app/admin')) return route.path
  return route.path
})

function emitNavigate() {
  emit('navigate')
}
</script>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #faf9fd;
}

.sidebar-logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;
  background: #fff;
  border-bottom: 1px solid #e8e5f0;
  padding: 0 16px;
}

.logo-text {
  font-size: 17px;
  font-weight: 800;
  letter-spacing: 1.5px;
  white-space: nowrap;
  background: linear-gradient(135deg, #7c3aed, #a78bfa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.logo-img {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  transition: width 0.3s, height 0.3s;
}

.logo-img.collapsed {
  width: 34px;
  height: 34px;
}

.sidebar-menu {
  border-right: none;
  flex: 1;
  padding: 8px;
}

.sidebar-menu :deep(.el-menu-item) {
  border-radius: 8px;
  margin-bottom: 2px;
  height: 44px;
  line-height: 44px;
  font-size: 14px;
  transition: all 0.15s;
}

.sidebar-menu :deep(.el-menu-item:hover) {
  background: #ede9fe !important;
  color: #7c3aed !important;
}

.sidebar-menu :deep(.el-menu-item.is-active) {
  background: linear-gradient(135deg, #ede9fe, #f5f3ff) !important;
  color: #7c3aed !important;
  font-weight: 600;
  border-left: none;
  box-shadow: inset 3px 0 0 #7c3aed;
}

.sidebar-menu :deep(.el-sub-menu__title) {
  border-radius: 8px;
  margin-bottom: 2px;
  height: 44px;
  line-height: 44px;
  font-size: 14px;
  transition: all 0.15s;
}

.sidebar-menu :deep(.el-sub-menu__title:hover) {
  background: #ede9fe !important;
  color: #7c3aed !important;
}

.sidebar-menu :deep(.el-sub-menu.is-opened .el-sub-menu__title) {
  color: #7c3aed;
  font-weight: 600;
}

.sidebar-menu :deep(.el-sub-menu .el-menu) {
  background: transparent;
}

.sidebar-menu :deep(.el-sub-menu .el-menu-item) {
  padding-left: 56px !important;
  font-size: 13px;
  height: 38px;
  line-height: 38px;
}

.sidebar-divider {
  height: 1px;
  background: #e8e5f0;
  margin: 8px 16px;
}
</style>
