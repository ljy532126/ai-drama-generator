<template>
  <div class="auth-page">
    <!-- 装饰背景 -->
    <div class="auth-bg">
      <div class="bg-blob blob-1"></div>
      <div class="bg-blob blob-2"></div>
      <div class="bg-blob blob-3"></div>
    </div>

    <div class="auth-card">
      <div class="auth-header">
        <router-link to="/" class="auth-logo">Florient</router-link>
        <p>登录您的账号</p>
      </div>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent="handleLogin"
      >
        <el-form-item label="账号" prop="account">
          <el-input
            v-model="form.account"
            placeholder="请输入用户名或邮箱"
            :prefix-icon="User"
            size="large"
          />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            :prefix-icon="Lock"
            size="large"
            show-password
          />
        </el-form-item>

        <el-alert v-if="errorMsg" :title="errorMsg" type="error" show-icon @close="errorMsg = ''" style="margin-bottom:12px" />

        <el-form-item>
          <el-button type="primary" size="large" native-type="submit" :loading="loading" style="width: 100%">
            登录
          </el-button>
        </el-form-item>
      </el-form>

      <div class="auth-footer">
        还没有账号？<router-link to="/register">立即注册</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { User, Lock } from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const form = reactive({ account: '', password: '' })
const rules = {
  account: [{ required: true, message: '请输入用户名或邮箱', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}
const loading = ref(false)
const errorMsg = ref('')

async function handleLogin() {
  errorMsg.value = ''
  loading.value = true
  try {
    await authStore.login(form.account, form.password)
    router.push('/app/dashboard')
  } catch (e) {
    errorMsg.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f4fa 0%, #ede9fe 50%, #f5f3ff 100%);
  position: relative;
  overflow: hidden;
}

/* 装饰浮动圆块 */
.auth-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}
.bg-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.35;
  animation: authFloat 14s ease-in-out infinite;
}
.blob-1 {
  width: 350px; height: 350px;
  background: #ddd6fe;
  top: -80px; right: -60px;
  animation-delay: 0s;
}
.blob-2 {
  width: 280px; height: 280px;
  background: #c4b5fd;
  bottom: -60px; left: -50px;
  animation-delay: -4s;
}
.blob-3 {
  width: 200px; height: 200px;
  background: #ede9fe;
  top: 40%; left: 60%;
  animation-delay: -8s;
}
@keyframes authFloat {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -40px) scale(1.08); }
  66% { transform: translate(-20px, 30px) scale(0.94); }
}

.auth-card {
  position: relative;
  z-index: 1;
  width: 420px;
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(124, 58, 237, 0.08);
  border-radius: 16px;
  padding: 44px 40px 36px;
  box-shadow: 0 8px 40px rgba(124, 58, 237, 0.08);
}

.auth-header {
  text-align: center;
  margin-bottom: 32px;
}

.auth-logo {
  display: inline-block;
  font-size: 28px;
  font-weight: 800;
  background: linear-gradient(135deg, #7c3aed, #a78bfa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-decoration: none;
  margin-bottom: 6px;
}

.auth-header p {
  color: #9d9db5;
  font-size: 14px;
  margin: 4px 0 0;
}

.auth-footer {
  text-align: center;
  margin-top: 20px;
  font-size: 14px;
  color: #9d9db5;
}

.auth-footer a {
  color: #7c3aed;
  text-decoration: none;
  font-weight: 500;
}

@media (max-width: 767px) {
  .auth-card {
    width: calc(100vw - 32px);
    padding: 32px 20px 28px;
    border-radius: 14px;
  }
  .auth-logo { font-size: 24px; }
  .blob-1 { width: 200px; height: 200px; }
  .blob-2 { width: 180px; height: 180px; }
  .blob-3 { width: 140px; height: 140px; }
}
</style>
