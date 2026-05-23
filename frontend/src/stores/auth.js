import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const AUTH_TOKEN_KEY = 'drama_auth_token'
const AUTH_USER_KEY = 'drama_auth_user'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem(AUTH_TOKEN_KEY) || '')
  const user = ref(JSON.parse(localStorage.getItem(AUTH_USER_KEY) || 'null'))

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  async function login(account, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account, password })
    })
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.message || '登录失败')
    token.value = data.data.token
    user.value = data.data.user
    localStorage.setItem(AUTH_TOKEN_KEY, data.data.token)
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.data.user))
    return data.data
  }

  async function register(username, email, password) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    })
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.message || '注册失败')
    token.value = data.data.token
    user.value = data.data.user
    localStorage.setItem(AUTH_TOKEN_KEY, data.data.token)
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.data.user))
    return data.data
  }

  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(AUTH_USER_KEY)
  }

  async function fetchMe() {
    const res = await fetchWithAuth('/api/auth/me')
    const data = await res.json()
    if (data.success) {
      user.value = data.data.user
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.data.user))
    }
  }

  async function fetchWithAuth(url, options = {}) {
    const isFormData = options.body instanceof FormData
    const headers = {}
    if (options.headers) {
      Object.assign(headers, options.headers)
    }
    if (!isFormData) {
      headers['Content-Type'] = 'application/json'
    }
    if (token.value) {
      headers['Authorization'] = `Bearer ${token.value}`
    }
    const res = await fetch(url, { ...options, headers })
    if (res.status === 401) {
      logout()
      window.location.href = '/login'
      throw new Error('登录已过期')
    }
    return res
  }

  return { token, user, isLoggedIn, isAdmin, login, register, logout, fetchMe, fetchWithAuth }
})
