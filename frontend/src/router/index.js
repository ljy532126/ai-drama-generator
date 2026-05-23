import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  // 公开首页（无 layout，无 auth）
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue')
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { guest: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/Register.vue'),
    meta: { guest: true }
  },
  // 认证区
  {
    path: '/app',
    component: () => import('../layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    redirect: '/app/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/Dashboard.vue')
      },
      {
        path: 'generate',
        name: 'Generate',
        component: () => import('../views/Generate.vue')
      },
      {
        path: 'generate/image',
        name: 'ImageGenerate',
        component: () => import('../views/ImageGenerate.vue')
      },
      {
        path: 'generate/video',
        name: 'VideoGenerate',
        component: () => import('../views/VideoGenerate.vue')
      },
      {
        path: 'tasks',
        name: 'TasksQueue',
        component: () => import('../views/TasksQueue.vue')
      },
      {
        path: 'chat',
        name: 'Chat',
        component: () => import('../views/Chat.vue')
      },
      {
        path: 'history',
        name: 'History',
        component: () => import('../views/History.vue')
      },
      {
        path: 'history/:taskId',
        name: 'HistoryDetail',
        component: () => import('../views/HistoryDetail.vue')
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('../views/Profile.vue')
      },
      {
        path: 'admin/users',
        name: 'AdminUsers',
        component: () => import('../views/admin/Users.vue'),
        meta: { requiresAdmin: true }
      },
      {
        path: 'admin/keys',
        name: 'AdminKeys',
        component: () => import('../views/admin/Keys.vue'),
        meta: { requiresAdmin: true }
      },
      {
        path: 'admin/dashboard',
        name: 'AdminDashboard',
        component: () => import('../views/admin/Dashboard.vue'),
        meta: { requiresAdmin: true }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    next('/login')
  } else if (to.meta.guest && authStore.isLoggedIn) {
    next('/app/dashboard')
  } else if (to.meta.requiresAdmin && !authStore.isAdmin) {
    next('/app/dashboard')
  } else {
    next()
  }
})

export default router
