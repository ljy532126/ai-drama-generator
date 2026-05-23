import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAppStore = defineStore('app', () => {
  const sidebarCollapsed = ref(localStorage.getItem('sidebar_collapsed') === 'true')
  const mobileDrawerOpen = ref(false)
  const isMobile = ref(window.innerWidth < 768)

  function toggleSidebar() {
    if (isMobile.value) {
      mobileDrawerOpen.value = !mobileDrawerOpen.value
    } else {
      sidebarCollapsed.value = !sidebarCollapsed.value
      localStorage.setItem('sidebar_collapsed', sidebarCollapsed.value)
    }
  }

  function closeMobileDrawer() {
    mobileDrawerOpen.value = false
  }

  window.addEventListener('resize', () => {
    isMobile.value = window.innerWidth < 768
    if (!isMobile.value) mobileDrawerOpen.value = false
  })

  return { sidebarCollapsed, mobileDrawerOpen, isMobile, toggleSidebar, closeMobileDrawer }
})
