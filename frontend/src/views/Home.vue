<template>
  <div class="landing">
    <!-- 自包含导航栏 -->
    <header class="landing-nav">
      <div class="nav-inner">
        <div class="nav-left">
          <img src="/logo.svg" class="nav-logo" alt="Florient" />
          <span class="nav-brand">Florient</span>
          <nav class="nav-links">
            <a href="#features" @click.prevent="scrollTo('features')">功能特色</a>
            <a href="#workflow" @click.prevent="scrollTo('workflow')">创作流程</a>
          </nav>
        </div>
        <div class="nav-right">
          <a :href="githubUrl" target="_blank" class="github-link" title="GitHub">
            <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
          </a>
          <template v-if="authStore.isLoggedIn">
            <el-button type="primary" size="small" round @click="$router.push('/app/dashboard')">进入控制台</el-button>
          </template>
          <template v-else>
            <el-button text size="small" @click="$router.push('/login')">登录</el-button>
            <el-button type="primary" size="small" round @click="$router.push('/register')">免费注册</el-button>
          </template>
        </div>
      </div>
    </header>

    <!-- Hero -->
    <section class="hero">
      <div class="hero-bg">
        <div class="hero-blob blob-1"></div>
        <div class="hero-blob blob-2"></div>
        <div class="hero-blob blob-3"></div>
      </div>
      <div class="hero-content">
        <img src="/logo.svg" class="hero-logo" alt="Florient" />
        <h1 class="hero-title">Florient</h1>
        <p class="hero-desc">一键生成专业短剧剧本，从故事大纲到完整分镜，AI 全流程创作</p>
        <div class="hero-actions">
          <el-button type="primary" size="large" round @click="authStore.isLoggedIn ? $router.push('/app/generate') : $router.push('/login')">
            <el-icon><Edit /></el-icon> 开始剧本生成
          </el-button>
          <el-button size="large" round class="btn-outline" @click="scrollTo('features')">
            了解更多
          </el-button>
        </div>
      </div>
    </section>

    <!-- 统计 -->
    <section class="stats">
      <div class="section-inner">
        <div class="stat-item">
          <div class="stat-num">{{ stats.totalDramas }}</div>
          <div class="stat-label">累计生成</div>
        </div>
        <div class="stat-item">
          <div class="stat-num">{{ stats.completedDramas }}</div>
          <div class="stat-label">已完成</div>
        </div>
        <div class="stat-item">
          <div class="stat-num">{{ stats.totalUsers }}</div>
          <div class="stat-label">注册用户</div>
        </div>
      </div>
    </section>

    <!-- 功能特色 -->
    <section id="features" class="features">
      <div class="section-inner">
        <h2 class="section-title">功能特色</h2>
        <p class="section-sub">覆盖短剧创作的每一个环节</p>
        <div class="feature-grid">
          <div class="feature-card" @click="authStore.isLoggedIn ? $router.push('/app/generate') : $router.push('/login')">
            <div class="feature-icon" style="background:#f5f3ff;color:#7c3aed">🤖</div>
            <h4>AI 剧本生成</h4>
            <p>输入题材和关键词，AI 自动完成从大纲到分镜的全流程创作</p>
          </div>
          <div class="feature-card" @click="authStore.isLoggedIn ? $router.push('/app/generate/image') : $router.push('/login')">
            <div class="feature-icon" style="background:#fef0f0;color:#f56c6c">🖼️</div>
            <h4>AI 图片生成</h4>
            <p>根据提示词生成高质量图片，支持多种尺寸和风格</p>
          </div>
          <div class="feature-card" @click="authStore.isLoggedIn ? $router.push('/app/generate/video') : $router.push('/login')">
            <div class="feature-icon" style="background:#f0f9eb;color:#67c23a">🎬</div>
            <h4>AI 视频生成</h4>
            <p>文生视频、图生视频，轻松创作短视频内容</p>
          </div>
          <div class="feature-card" @click="authStore.isLoggedIn ? $router.push('/app/profile') : $router.push('/login')">
            <div class="feature-icon" style="background:#fdf6ec;color:#e6a23c">🔌</div>
            <h4>多厂商接入</h4>
            <p>支持 OpenAI、Claude、DeepSeek 等厂商，自由切换</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 创作流程 -->
    <section id="workflow" class="workflow">
      <div class="section-inner">
        <h2 class="section-title">创作流程</h2>
        <p class="section-sub">五步完成短剧创作</p>
        <el-steps :active="5" finish-status="success" align-center class="flow-steps">
          <el-step title="输入设定" description="填写题材和关键词" />
          <el-step title="AI 大纲" description="自动生成故事大纲" />
          <el-step title="角色设计" description="创建人物设定" />
          <el-step title="完整剧本" description="生成第一集剧本" />
          <el-step title="分镜表" description="影视分镜+绘图提示词" />
        </el-steps>
      </div>
    </section>

    <!-- Footer -->
    <footer class="landing-footer">
      <div class="footer-inner">
        <a :href="githubUrl" target="_blank" class="footer-gh">
          <svg height="18" width="18" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
          </svg>
          GitHub
        </a>
        <span class="footer-copy">Florient © 2026</span>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const githubUrl = 'https://github.com/your-username/ai-drama-generator'

const stats = ref({ totalDramas: 0, completedDramas: 0, totalUsers: 0 })

function scrollTo(id) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth' })
}

onMounted(async () => {
  try {
    const res = await fetch('/api/analytics/public')
    const data = await res.json()
    if (data.success) stats.value = data.data
  } catch { /* ignore */ }
})
</script>

<style scoped>
.landing {
  min-height: 100vh;
  background: #fff;
}

/* Nav */
.landing-nav {
  position: sticky;
  top: 0;
  z-index: 1000;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  height: 64px;
}
.nav-inner {
  max-width: 1200px;
  margin: 0 auto;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}
.nav-left {
  display: flex;
  align-items: center;
  gap: 24px;
}
.nav-logo {
  width: 32px;
  height: 32px;
}
.nav-brand {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 1.5px;
  background: linear-gradient(135deg, #7c3aed, #a78bfa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.nav-links {
  display: flex;
  gap: 20px;
}
.nav-links a {
  font-size: 14px;
  color: #606266;
  text-decoration: none;
  transition: color 0.2s;
}
.nav-links a:hover { color: #7c3aed; }
.nav-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.nav-right .github-link {
  display: flex;
  align-items: center;
  color: #606266;
  transition: color 0.2s;
}
.nav-right .github-link:hover { color: #303133; }

/* Hero */
.hero {
  position: relative;
  padding: 100px 24px;
  text-align: center;
  overflow: hidden;
  background: #fafbfc;
}
.hero-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.hero-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.45;
  animation: float 12s ease-in-out infinite;
}
.blob-1 {
  width: 360px;
  height: 360px;
  background: #ddd6fe;
  top: -120px;
  left: -80px;
  animation-delay: 0s;
}
.blob-2 {
  width: 300px;
  height: 300px;
  background: #ede9fe;
  top: 40px;
  right: -60px;
  animation-delay: -4s;
}
.blob-3 {
  width: 280px;
  height: 280px;
  background: #c4b5fd;
  bottom: -100px;
  left: 30%;
  animation-delay: -8s;
}
@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -30px) scale(1.08); }
  66% { transform: translate(-20px, 20px) scale(0.94); }
}
.hero-content {
  position: relative;
  z-index: 1;
  max-width: 640px;
  margin: 0 auto;
}
.hero-logo {
  width: 72px;
  height: 72px;
  margin-bottom: 16px;
}
.hero-title {
  font-size: 48px;
  font-weight: 800;
  margin: 0 0 16px;
  background: linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.hero-desc {
  color: #606266;
  font-size: 17px;
  line-height: 1.6;
  margin: 0 0 36px;
}
.hero-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
}
.hero-actions .el-button--primary {
  background: linear-gradient(135deg, #7c3aed, #a78bfa) !important;
  border-color: transparent !important;
  color: #fff !important;
  font-weight: 600;
}
.hero-actions .el-button--primary:hover {
  opacity: 0.9;
}
.btn-outline {
  background: transparent !important;
  color: #7c3aed !important;
  border: 1.5px solid #7c3aed !important;
  font-weight: 600;
}
.btn-outline:hover {
  background: rgba(124, 58, 237, 0.06) !important;
  border-color: #a78bfa !important;
  color: #a78bfa !important;
}

/* Sections */
.section-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 24px;
}
.section-title {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
  text-align: center;
  margin: 0 0 8px;
}
.section-sub {
  font-size: 15px;
  color: #909399;
  text-align: center;
  margin: 0 0 40px;
}

/* Stats */
.stats {
  padding: 48px 0;
  background: #f5f4fa;
  border-bottom: 1px solid #e8e5f0;
}
.stats .section-inner {
  display: flex;
  justify-content: center;
  gap: 48px;
}
.stat-item {
  text-align: center;
}
.stat-num {
  font-size: 36px;
  font-weight: 700;
  color: #7c3aed;
}
.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

/* Features */
.features {
  padding: 72px 0;
  background: #fff;
}
.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}
.feature-card {
  background: #fff;
  border: 1px solid #e8e5f0;
  border-radius: 12px;
  padding: 32px 24px;
  text-align: center;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}
.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(124, 58, 237, 0.08);
}
.feature-card h4 {
  margin: 14px 0 8px;
  font-size: 16px;
  color: #303133;
}
.feature-card p {
  font-size: 13px;
  color: #909399;
  line-height: 1.6;
  margin: 0;
}
.feature-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin: 0 auto;
}

/* Workflow */
.workflow {
  padding: 72px 0;
  background: #f5f4fa;
  border-top: 1px solid #e8e5f0;
}
.flow-steps {
  background: #fff;
  border-radius: 12px;
  padding: 40px 24px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}

/* Footer */
.landing-footer {
  border-top: 1px solid #e8e5f0;
  padding: 32px 24px;
  background: #f5f4fa;
}
.footer-inner {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.footer-gh {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #606266;
  text-decoration: none;
  font-size: 14px;
  transition: color 0.2s;
}
.footer-gh:hover { color: #303133; }
.footer-copy {
  font-size: 13px;
  color: #c0c4cc;
}

/* Mobile */
@media (max-width: 767px) {
  .nav-inner { padding: 0 16px; }
  .nav-links { display: none; }
  .nav-brand { font-size: 16px; }

  .hero { padding: 60px 16px; }
  .hero-title { font-size: 32px; }
  .hero-logo { width: 56px; height: 56px; }
  .hero-desc { font-size: 15px; }
  .hero-actions { flex-direction: column; gap: 10px; align-items: center; }
  .hero-actions .el-button { width: 100%; max-width: 280px; }

  .stats .section-inner { gap: 28px; }
  .stat-num { font-size: 28px; }

  .features, .workflow { padding: 48px 0; }
  .section-title { font-size: 22px; }
  .feature-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .feature-card { padding: 20px 12px; }
  .feature-card h4 { font-size: 14px; }

  .footer-inner { flex-direction: column; gap: 8px; }
}
</style>
