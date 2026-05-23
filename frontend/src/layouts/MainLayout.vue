<template>
  <!-- Desktop layout -->
  <el-container class="layout-container" v-if="!appStore.isMobile">
    <el-aside :width="sidebarWidth" class="layout-aside">
      <Sidebar />
    </el-aside>
    <el-container>
      <el-header class="layout-header">
        <AppHeader />
      </el-header>
      <el-main class="layout-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>

  <!-- Mobile layout -->
  <div class="layout-mobile" v-else>
    <el-drawer
      v-model="appStore.mobileDrawerOpen"
      direction="ltr"
      size="260px"
      :with-header="false"
      :close-on-click-modal="true"
      @close="appStore.closeMobileDrawer"
    >
      <Sidebar @navigate="appStore.closeMobileDrawer" />
    </el-drawer>
    <div class="mobile-main">
      <div class="mobile-header">
        <AppHeader />
      </div>
      <div class="mobile-body">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '../stores/app'
import Sidebar from '../components/Sidebar.vue'
import AppHeader from '../components/AppHeader.vue'

const route = useRoute()
const appStore = useAppStore()
const sidebarWidth = computed(() => appStore.sidebarCollapsed ? '64px' : '220px')

watch(() => route.path, () => {
  if (appStore.isMobile) appStore.closeMobileDrawer()
})
</script>

<style scoped>
.layout-container {
  height: 100vh;
}

.layout-aside {
  background: #faf9fd;
  transition: width 0.3s;
  overflow: hidden;
  box-shadow: 1px 0 0 #e8e5f0;
}

.layout-header {
  background: #fff;
  border-bottom: 1px solid #e8e5f0;
  padding: 0 20px;
  display: flex;
  align-items: center;
  height: 60px;
}

.layout-main {
  background: #f5f4fa;
  padding: 20px;
  overflow-y: auto;
}

/* Mobile */
.layout-mobile {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.mobile-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.mobile-header {
  background: #fff;
  border-bottom: 1px solid #e8e5f0;
  padding: 0 12px;
  height: 52px;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.mobile-body {
  flex: 1;
  overflow-y: auto;
  background: #f5f4fa;
  padding: 12px;
  -webkit-overflow-scrolling: touch;
}
</style>
