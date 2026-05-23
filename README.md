<p align="center">
  <img src="frontend/public/logo.svg" width="100" height="100" alt="Florient Logo" />
</p>

<h1 align="center">Florient — AI 短剧生成平台</h1>

<p align="center">
  基于 <strong>LangGraph 多 Agent 工作流</strong> 的全自动 AI 短剧创作系统
</p>

<p align="center">
  <img src="https://img.shields.io/badge/vue-3.4-brightgreen?logo=vue.js" />
  <img src="https://img.shields.io/badge/node-18+-green?logo=node.js" />
  <img src="https://img.shields.io/badge/mongodb-7-green?logo=mongodb" />
  <img src="https://img.shields.io/badge/docker-ready-blue?logo=docker" />
  <img src="https://img.shields.io/badge/license-MIT-blue" />
</p>

---

## 目录

- [一键部署](#一键部署)
- [项目简介](#项目简介)
- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [本地开发](#本地开发)
- [Docker 部署详解](#docker-部署详解)
- [支持的大模型](#支持的大模型)
- [环境变量参考](#环境变量参考)
- [API 概览](#api-概览)
- [常见问题](#常见问题)
- [许可证](#许可证)

---

```
默认用户名：admin
密码：admin23456

tips：自行在个人中心更改密码
```

## 一键部署

### Docker 部署（推荐）

无需安装 Node.js 和 MongoDB，Docker 全包，一条命令启动，**只占用一个端口 3011**。

```bash
# 1. 克隆项目
git clone https://github.com/ljy532126/ai-drama-generator.git && cd ai-drama-generator

# 2. 配置 Key（编辑 .env，填入大模型 API Key）
cp .env.example .env

# 3. 一键启动
docker-compose up -d
```

打开 **http://localhost:3011** 即可使用。

### 本地部署（不用 Docker）

需要提前安装 Node.js 18+ 和 MongoDB 5+。本地开发时前后端分开运行（Vite 热更新 + Express），所以占用**两个端口**：
- 后端 API：`3010`
- 前端页面：`3011`（自动代理 API 请求到 3010）

```bash
# 1. 克隆项目
git clone https://github.com/ljy532126/ai-drama-generator.git && cd ai-drama-generator

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，将 MONGODB_URI 改为本地地址: mongodb://localhost:27017/ai_drama

# 3. 安装依赖
npm install && cd frontend && npm install && cd ..

# 4. 启动后端（端口 3010）
npm run dev

# 5. 另开终端，启动前端（端口 3011）
cd frontend && npx vite --port 3011 --host 0.0.0.0
```

打开 **http://localhost:3011** 即可使用。

> **注意：** 本地开发务必访问 `3011` 端口（Vite dev server）。不要直接访问 `3010`，那只是后端 API，没有前端页面。如果确实想只用 3010 一个端口，需要先构建前端：`cd frontend && npm run build`。

> 推荐使用 [DeepSeek](https://platform.deepseek.com/api_keys) 的 API Key，价格极低，注册即用，新用户有免费额度。

---

## 项目简介

Florient 是一个生产级 AI 短剧创作平台。输入题材与关键词，AI 自动完成从**故事大纲 → 角色设定 → 剧情结构 → 完整剧本 → 分镜提示词**的全流程创作。

### 五步 Agent 工作流

```
OutlineAgent → CharactersAgent → StructureAgent → ScriptAgent → StoryboardAgent
    大纲            角色设计          剧情结构           剧本撰写        分镜 + AI绘图提示词
```

每个 Agent 基于前序所有输出进行推理，保证故事一致性。完成后支持**续写后续集数**，AI 基于已有剧情自动延续。

---

## 功能特性

| 功能 | 说明 |
|------|------|
| 🎬 剧本生成 | 五步 LangGraph 工作流，输入题材关键词自动生成完整短剧 |
| 📝 剧本续写 | 基于已有大纲、角色和剧情自动续写后续集数，保持主线一致 |
| 🖼️ 图片生成 | 文本生图，支持多厂商 AI 模型、多种尺寸风格 |
| 🎥 视频生成 | 文生视频 / 参考生视频 / 视频编辑，接入字节 Seedance |
| 💬 AI 聊天 | 多模型对话，历史会话管理 |
| 👤 用户系统 | 注册 / 登录 / JWT 认证 / 角色权限 |
| 🔑 Key 管理 | 个人 API Key 配置 + 管理员全局 Key，一键批量检测连通性 |
| 📊 数据看板 | ECharts 可视化，7 天趋势图、题材分布、服务器状态监控 |
| 🛡️ 管理后台 | 用户管理、全局 Key 管理、系统分析（地区/设备/厂商分布） |
| 📱 移动端适配 | 全页面响应式设计，手机端完美体验 |

---

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **前端框架** | Vue 3 (Composition API) | 现代化响应式 UI 框架 |
| **UI 组件库** | Element Plus | 企业级桌面端组件库 |
| **状态管理** | Pinia | Vue 3 官方状态管理 |
| **图表** | ECharts 6 | 数据可视化 |
| **构建工具** | Vite 5 | 极速开发与构建 |
| **后端框架** | Express.js | Node.js Web 框架 |
| **AI 工作流** | LangGraph | 多 Agent 串行工作流编排 |
| **LLM 支持** | OpenAI / Anthropic / DeepSeek / Qwen / Gemini | 多厂商模型适配 |
| **数据库** | MongoDB + Mongoose ODM | 文档数据库 |
| **认证** | JWT (JSON Web Token) | 无状态用户认证 |
| **文件上传** | Multer | 多媒体文件处理 |
| **日志** | Winston | 结构化日志 |
| **部署** | Docker + Docker Compose | 容器化一键部署 |

---

## 项目结构

```
Florient/
├── backend/
│   ├── config/                 # 配置模块
│   │   ├── database.js         # MongoDB 连接
│   │   ├── env.js              # 环境变量管理
│   │   └── logger.js           # Winston 日志
│   ├── middleware/              # 中间件
│   │   ├── auth.js             # JWT 认证
│   │   └── errorHandler.js     # 全局错误处理
│   ├── models/                 # 数据模型
│   │   ├── Drama.js            # 短剧 Schema
│   │   ├── ImageTask.js        # 图片任务
│   │   ├── VideoTask.js        # 视频任务
│   │   ├── User.js             # 用户模型
│   │   └── ApiKey.js           # API Key（AES-256-GCM 加密存储）
│   ├── routes/                 # API 路由
│   │   ├── dramaRoutes.js      # 剧本生成 + 续写
│   │   ├── imageRoutes.js      # 图片生成
│   │   ├── videoRoutes.js      # 视频生成
│   │   ├── chatRoutes.js       # AI 聊天
│   │   ├── authRoutes.js       # 用户认证
│   │   ├── historyRoutes.js    # 历史记录
│   │   ├── adminRoutes.js      # 管理接口
│   │   ├── analyticsRoutes.js  # 数据分析
│   │   ├── keyRoutes.js        # Key 管理 + 批量检测
│   │   └── logRoutes.js        # 日志查询
│   ├── services/               # 业务逻辑
│   │   ├── agentWorkflow.js    # LangGraph 五步工作流
│   │   ├── llmFactory.js       # LLM 模型工厂
│   │   ├── taskQueue.js        # 异步任务队列
│   │   └── geoLookup.js        # IP 地理位置解析
│   ├── scripts/                # 工具脚本
│   ├── uploads/                # 上传文件目录
│   └── server.js               # 服务入口
├── frontend/
│   ├── public/
│   │   └── logo.svg            # Florient Logo
│   ├── src/
│   │   ├── components/         # 通用组件
│   │   │   ├── Sidebar.vue
│   │   │   ├── AppHeader.vue
│   │   │   ├── ProgressPanel.vue
│   │   │   ├── ResultCard.vue
│   │   │   ├── ResultPreview.vue
│   │   │   ├── RichPromptEditor.vue
│   │   │   ├── MediaUploadPanel.vue
│   │   │   ├── ProviderSelect.vue
│   │   │   └── LogPanel.vue
│   │   ├── views/              # 页面视图
│   │   │   ├── Home.vue        # 公开首页
│   │   │   ├── Generate.vue    # 剧本生成
│   │   │   ├── ImageGenerate.vue
│   │   │   ├── VideoGenerate.vue
│   │   │   ├── Chat.vue
│   │   │   ├── History.vue     # 历史记录
│   │   │   ├── HistoryDetail.vue
│   │   │   ├── Dashboard.vue   # 数据看板
│   │   │   ├── Profile.vue     # 个人中心
│   │   │   ├── TasksQueue.vue  # 任务队列
│   │   │   ├── Login.vue / Register.vue
│   │   │   └── admin/          # 管理后台
│   │   ├── layouts/            # 布局组件
│   │   ├── router/             # Vue Router
│   │   ├── stores/             # Pinia 状态
│   │   ├── App.vue
│   │   └── main.js
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── docker-compose.yml          # Docker 编排
├── Dockerfile                  # 多阶段构建
├── .dockerignore
├── .env.example                # 环境变量模板
├── package.json                # 后端依赖
└── README.md
```

---

## 本地开发

### 环境要求

- **Node.js** >= 18.0.0
- **MongoDB** >= 5.0（本地运行）

### 1. 安装依赖

```bash
# 后端依赖（根目录）
npm install

# 前端依赖
cd frontend && npm install && cd ..
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`，至少配置一个 LLM 提供商：

```bash
PORT=3010                              # 后端端口
MONGODB_URI=mongodb://localhost:27017/ai_drama
LLM_PROVIDER=deepseek                  # 默认提供商
DEEPSEEK_API_KEY=sk-xxxxx              # 你的 Key
```

### 3. 启动开发服务

```bash
# 终端 1 — 启动后端（端口 3010）
npm run dev

# 终端 2 — 启动前端（端口 3011，自动代理 API 到 3010）
cd frontend && npx vite --port 3011 --host 0.0.0.0
```

访问：

| 地址 | 说明 |
|------|------|
| `http://localhost:3011` | 前端页面 |
| `http://localhost:3010/api/health` | 后端健康检查 |

---

## Docker 部署详解

### 前置要求

- Docker >= 20.10
- Docker Compose >= 2.0

### 部署步骤

#### 1. 克隆项目

```bash
git clone https://github.com/ljy532126/ai-drama-generator.git
cd ai-drama-generator
```

#### 2. 配置 API Key

创建 `.env` 文件，填入 LLM 提供商的 API Key（至少配一个）：

```bash
cp .env.example .env
# 编辑 .env，例如使用 DeepSeek：
#   LLM_PROVIDER=deepseek
#   DEEPSEEK_API_KEY=sk-你的Key
```

#### 3. 一键启动

```bash
docker-compose up -d
```

首次启动会自动拉取 MongoDB 镜像、构建应用镜像、初始化数据库。

#### 4. 访问

打开 **http://localhost:3011**，注册账号即可使用。

#### 常用命令

```bash
docker-compose ps              # 查看容器状态
docker-compose logs -f app     # 查看应用日志
docker-compose down            # 停止服务
docker-compose down -v         # 停止并清除数据库（慎用！）

# 代码更新后重新部署
git pull
docker-compose build --no-cache app
docker-compose up -d
```

### Docker 架构

```
┌─────────────────────────────────────┐
│  Docker Compose                     │
│                                     │
│  ┌──────────┐    ┌──────────────┐   │
│  │  mongo   │    │     app      │   │
│  │  :27017  │◄───│    :3011     │   │
│  │  (内网)   │    │  (对外端口)   │   │
│  └──────────┘    └──────────────┘   │
│       │                │            │
│  mongo-data        ./logs           │
│  (持久化卷)      (日志挂载)          │
└─────────────────────────────────────┘
```

- **mongo**：MongoDB 7.0，数据持久化到 Docker Volume
- **app**：Express 后端 + Vue 前端静态文件，多阶段构建，单端口 3011

---

## 支持的大模型

| 厂商 | 获取 Key 地址 | 环境变量 |
|------|-------------|----------|
| DeepSeek （推荐） | [platform.deepseek.com](https://platform.deepseek.com/api_keys) | `DEEPSEEK_API_KEY` |
| 阿里通义千问 | [dashscope.console.aliyun.com](https://dashscope.console.aliyun.com/apiKey) | `QWEN_API_KEY` |
| OpenAI | [platform.openai.com](https://platform.openai.com/api-keys) | `OPENAI_API_KEY` |
| Anthropic Claude | [console.anthropic.com](https://console.anthropic.com/settings/keys) | `ANTHROPIC_API_KEY` |
| Google Gemini | [aistudio.google.com](https://aistudio.google.com/app/apikey) | `GEMINI_API_KEY` |

也支持**自定义 API 地址**（如中转代理），在个人中心的 Key 管理页面配置 Base URL。

---

## 环境变量参考

### 服务配置

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3011` | 后端监听端口 |
| `NODE_ENV` | `development` | 运行环境 |
| `CORS_ORIGIN` | `*` | 跨域允许来源 |
| `JWT_SECRET` | 内置默认值 | JWT 签名密钥（**生产环境务必修改**） |

### 数据库

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `MONGODB_URI` | `mongodb://localhost:27017/ai_drama` | MongoDB 连接串 |

### LLM 提供商

#### OpenAI

| 变量 | 默认值 |
|------|--------|
| `OPENAI_API_KEY` | (必填) |
| `OPENAI_MODEL` | `gpt-4o` |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` |

#### Anthropic Claude

| 变量 | 默认值 |
|------|--------|
| `ANTHROPIC_API_KEY` | (必填) |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-20250514` |

#### DeepSeek

| 变量 | 默认值 |
|------|--------|
| `DEEPSEEK_API_KEY` | (必填) |
| `DEEPSEEK_MODEL` | `deepseek-chat` |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` |

#### 阿里通义千问

| 变量 | 默认值 |
|------|--------|
| `QWEN_API_KEY` | (必填) |
| `QWEN_MODEL` | `qwen-turbo` |

#### Google Gemini

| 变量 | 默认值 |
|------|--------|
| `GEMINI_API_KEY` | (必填) |
| `GEMINI_MODEL` | `gemini-2.0-flash` |

### 任务队列

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `MAX_CONCURRENT_TASKS` | `5` | 最大并发任务数 |
| `TASK_TIMEOUT` | `300000` | 单任务超时 (ms) |

### 模型参数

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `MODEL_TEMPERATURE` | `0.7` | LLM 温度 |
| `MODEL_MAX_TOKENS` | `4000` | 最大输出 Token |

### 日志

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `LOG_LEVEL` | `info` | 日志级别 (debug/info/warn/error) |
| `LOG_FILE_PATH` | `./logs` | 日志输出目录 |

---

## API 概览

### 用户认证

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/api/auth/register` | 无 | 注册 |
| POST | `/api/auth/login` | 无 | 登录 |
| GET | `/api/auth/me` | JWT | 当前用户信息 |
| PUT | `/api/auth/change-password` | JWT | 修改密码 |
| PUT | `/api/auth/profile` | JWT | 更新资料 |
| POST | `/api/auth/avatar` | JWT | 上传头像 |

### 剧本生成

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/api/drama/generate` | JWT | 创建生成任务 |
| GET | `/api/drama/status/:taskId` | JWT | 查询任务状态/结果 |
| POST | `/api/drama/continue` | JWT | 续写下一集 |
| GET | `/api/drama/active-tasks` | JWT | 当前活跃任务 |

### 图片生成

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/api/image/generate` | JWT | 创建图片生成任务 |
| GET | `/api/image/history` | JWT | 历史记录 |

### 视频生成

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/api/video/generate` | JWT | 创建视频生成任务 |
| GET | `/api/video/history` | JWT | 历史记录 |

### Key 管理

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/api/keys` | JWT | 获取我的 Key 列表 |
| POST | `/api/keys` | JWT | 添加/更新我的 Key |
| DELETE | `/api/keys/:keyId` | JWT | 删除我的 Key |
| POST | `/api/keys/test` | JWT | 测试单个 Key 连通性 |
| POST | `/api/keys/batch-test` | JWT | 一键批量检测连通性 |
| POST | `/api/keys/fetch-models` | JWT | 拉取可用模型列表 |

### 数据分析

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/api/analytics/public` | 无 | 公开统计（首页用） |
| GET | `/api/analytics/user` | JWT | 个人使用统计 |
| GET | `/api/analytics/server` | JWT | 服务器运行状态 |

---

## 常见问题

### MongoDB 连接失败

Docker 部署不会遇到此问题。本地开发时：

```bash
# 检查 MongoDB 是否运行
systemctl status mongod          # Linux
brew services list | grep mongo  # macOS

# Docker 方式启动 MongoDB
docker run -d --name mongo -p 27017:27017 mongo:7.0
```

### 端口被占用

```bash
# Windows
netstat -ano | findstr :3011

# Linux / macOS
lsof -i :3011
```

修改 `.env` 中 `PORT` 或 `docker-compose.yml` 中端口映射即可。

### Docker 构建失败

```bash
docker-compose build --no-cache app
docker-compose up -d
```

### 前端页面 404

Dockerfile 使用多阶段构建自动编译前端。本地开发需确保 `frontend/dist/` 存在或启动 Vite dev server。

### LLM API 调用失败

- 确认 Key 已正确填写
- 检查网络能否访问 API 地址
- 在**个人中心 → API Key 管理 → 一键检测**诊断所有 Key 的连通性
- 查看 `logs/` 目录获取详细错误信息

---

## 许可证

MIT License
