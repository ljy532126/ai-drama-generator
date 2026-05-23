<p align="center">
  <img src="frontend/public/logo.svg" width="100" height="100" alt="Florient Logo" />
</p>

<h1 align="center">Florient — AI 短剧生成平台</h1>

<p align="center">
  输入题材和关键词，AI 自动生成完整短剧剧本 + 分镜表
</p>

<p align="center">
  <img src="https://img.shields.io/badge/vue-3.4-brightgreen?logo=vue.js" />
  <img src="https://img.shields.io/badge/node-18+-green?logo=node.js" />
  <img src="https://img.shields.io/badge/mongodb-7-green?logo=mongodb" />
  <img src="https://img.shields.io/badge/docker-ready-blue?logo=docker" />
  <img src="https://img.shields.io/badge/license-MIT-blue" />
</p>

---

## 一键部署（Docker）

只要电脑装了 Docker，复制下面三条命令就能跑起来：

```bash
# 1. 克隆项目
git clone https://github.com/ljy532126/ai-drama-generator.git
cd ai-drama-generator

# 2. 配置 LLM API Key（至少配一个，推荐 DeepSeek 便宜）
cp .env.example .env
# 编辑 .env，把下面这行改成你的真实 Key：
#   DEEPSEEK_API_KEY=sk-xxxxx

# 3. 一键启动
docker-compose up -d
```

打开浏览器访问 **http://localhost:3011**，注册账号就能用了。

> **停止服务**: `docker-compose down`
> **更新代码**: `git pull && docker-compose build --no-cache && docker-compose up -d`

**不需要**装 Node.js、不需要装 MongoDB，Docker 全包了。

---

## 支持的大模型

| 厂商 | 获取 Key 地址 | 费用 |
|------|-------------|------|
| DeepSeek | [platform.deepseek.com](https://platform.deepseek.com/api_keys) | 极低 |
| 通义千问 | [dashscope.console.aliyun.com](https://dashscope.console.aliyun.com/apiKey) | 新用户免费 |
| OpenAI | [platform.openai.com](https://platform.openai.com/api-keys) | 按量 |
| Anthropic | [console.anthropic.com](https://console.anthropic.com/settings/keys) | 按量 |
| Gemini | [aistudio.google.com](https://aistudio.google.com/app/apikey) | 有免费额度 |

---

## 功能特性

| 功能 | 说明 |
|------|------|
| 🎬 剧本生成 | 输入题材 + 关键词，AI 五步工作流自动创作完整短剧 |
| 📝 剧本续写 | 基于已有剧情续写后续集数，保持主线一致 |
| 🖼️ 图片生成 | 文本生图，多厂商、多尺寸 |
| 🎥 视频生成 | 文生视频 / 图生视频 / 视频编辑 |
| 💬 AI 聊天 | 多模型对话，历史会话 |
| 👤 用户系统 | 注册 / 登录 / JWT 认证 |
| 🔑 Key 管理 | 个人 Key + 全局 Key，一键批量检测连通性 |
| 📊 数据看板 | 生成趋势、题材分布、服务器状态 |
| 🛡️ 管理后台 | 用户管理、系统分析（地区/设备/厂商） |
| 📱 移动端 | 全页面响应式 |

---

## 本地开发（不需要 Docker）

### 环境要求
- Node.js >= 18
- MongoDB >= 5.0（本地运行）

```bash
# 1. 安装依赖
npm install
cd frontend && npm install && cd ..

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，填入 API Key，改 PORT=3010

# 3. 启动
npm run dev              # 终端1: 后端 (端口 3010)
cd frontend && npx vite --port 3011 --host 0.0.0.0   # 终端2: 前端 (端口 3011)
```

访问 `http://localhost:3011`

---

## 项目结构

```
Florient/
├── backend/                # Express.js 后端
│   ├── config/             # 数据库、环境变量、日志
│   ├── middleware/          # JWT 认证、错误处理
│   ├── models/             # Drama, User, ApiKey 等
│   ├── routes/             # 10 个路由模块
│   ├── services/           # Agent 工作流、LLM 工厂、任务队列
│   └── server.js           # 入口文件
├── frontend/               # Vue 3 + Element Plus
│   ├── src/components/     # 通用组件
│   ├── src/views/          # 页面视图 + admin/
│   ├── src/router/         # 路由
│   ├── src/stores/         # Pinia 状态管理
│   └── vite.config.js      # Vite 配置
├── docker-compose.yml      # Docker 编排
├── Dockerfile              # 多阶段构建
├── .env.example            # 环境变量模板
└── package.json            # 后端依赖
```

---

## 环境变量

所有可用环境变量见 [.env.example](.env.example)。

**必填项**（至少选一个）：

```bash
LLM_PROVIDER=deepseek              # 默认提供商
DEEPSEEK_API_KEY=sk-your-key       # DeepSeek Key
# 或者
OPENAI_API_KEY=sk-your-key         # OpenAI Key
# 或者
ANTHROPIC_API_KEY=sk-your-key      # Anthropic Key
# 或者
QWEN_API_KEY=sk-your-key           # 通义千问 Key
# 或者
GEMINI_API_KEY=your-key            # Gemini Key
```

**Docker 部署**直接在 `docker-compose.yml` 的 `environment` 里配，或者通过环境变量传入。

---

## API 概览

| 功能 | 方法 | 路径 |
|------|------|------|
| 注册 | POST | `/api/auth/register` |
| 登录 | POST | `/api/auth/login` |
| 剧本生成 | POST | `/api/drama/generate` |
| 查询结果 | GET | `/api/drama/status/:taskId` |
| 续写 | POST | `/api/drama/continue` |
| 图片生成 | POST | `/api/image/generate` |
| 视频生成 | POST | `/api/video/generate` |
| Key 批量检测 | POST | `/api/keys/batch-test` |
| 个人统计 | GET | `/api/analytics/user` |
| 服务器状态 | GET | `/api/analytics/server` |

---

## 常见问题

**MongoDB 连接失败？**
Docker 部署不会遇到这个问题。本地开发确保 MongoDB 已启动。

**Docker 端口冲突？**
修改 `docker-compose.yml` 中 `ports` 为 `"3999:3011"`。

**LLM 调用失败？**
在个人中心 → API Key 管理 → 点"一键检测"诊断连通性。

---

## 许可证

MIT License
