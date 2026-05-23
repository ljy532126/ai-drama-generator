<template>
  <div class="app-header">
    <div class="header-left">
      <el-button
        text
        @click="appStore.toggleSidebar"
        class="collapse-btn"
        :aria-label="appStore.isMobile ? '菜单' : (appStore.sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏')"
      >
        <el-icon :size="20">
          <Fold v-if="!appStore.isMobile && !appStore.sidebarCollapsed" />
          <Expand v-else-if="!appStore.isMobile" />
          <Menu v-else />
        </el-icon>
      </el-button>
      <el-breadcrumb separator="/" class="breadcrumb-desk">
        <el-breadcrumb-item :to="{ path: '/app/dashboard' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item v-if="route.meta.title">{{ route.meta.title }}</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <div class="header-right">
      <a :href="githubUrl" target="_blank" class="github-link" title="GitHub">
        <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
        </svg>
      </a>
      <el-dropdown trigger="click">
        <span class="user-area">
          <el-avatar :size="appStore.isMobile ? 28 : 32" :src="authStore.user?.avatar || ''">
            <el-icon><UserFilled /></el-icon>
          </el-avatar>
          <span class="username">{{ authStore.user?.nickname || authStore.user?.username || '' }}</span>
          <el-icon class="arrow-icon"><ArrowDown /></el-icon>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item @click="$router.push('/app/dashboard')">
              <el-icon><DataAnalysis /></el-icon>数据看板
            </el-dropdown-item>
            <el-dropdown-item divided @click="handleLogout">
              <el-icon><SwitchButton /></el-icon>退出登录
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const authStore = useAuthStore()
const githubUrl = 'https://github.com/ljy532126/ai-drama-generator'

function handleLogout() {
  authStore.logout()
  router.push('/')
}
</script>

<style scoped>
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.collapse-btn {
  padding: 0;
  flex-shrink: 0;
  color: #6b6b80;
}
.collapse-btn:hover {
  color: #7c3aed;
}

.header-right {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 12px;
}

.github-link {
  display: flex;
  align-items: center;
  color: #9d9db5;
  transition: color 0.2s;
}
.github-link:hover {
  color: #7c3aed;
}

.user-area {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
  white-space: nowrap;
  transition: background 0.15s;
}
.user-area:hover {
  background: #f5f3ff;
}

.username {
  font-size: 14px;
  color: #2d2d3a;
  font-weight: 500;
}

.arrow-icon {
  font-size: 12px;
  color: #9d9db5;
}

@media (max-width: 767px) {
  .breadcrumb-desk { display: none; }
  .username { display: none; }
  .arrow-icon { display: none; }
  .user-area { padding: 2px 4px; }
}
</style>
