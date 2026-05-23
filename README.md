<p align="center">
  <img src="frontend/public/logo.svg" width="100" height="100" alt="Florient Logo" />
</p>

<h1 align="center">Florient — AI 短剧生成平台</h1>

<p align="center">
  基于 <strong>LangGraph 多 Agent 工作流</strong> 的全自动 AI 短剧创作系统
</p>

<p align="center">
  <img src="https://img.shields.io/badge/vue-3.4-brightgreen?logo=vue.js" alt="Vue" />
  <img src="https://img.shields.io/badge/node-18+-green?logo=node.js" alt="Node" />
  <img src="https://img.shields.io/badge/mongodb-7-green?logo=mongodb" alt="MongoDB" />
  <img src="https://img.shields.io/badge/docker-compose-blue?logo=docker" alt="Docker" />
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License" />
</p>

---

## 目录

- [项目简介](#项目简介)
- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [本地开发](#本地开发)
- [Docker 一键部署](#docker-一键部署)
- [环境变量参考](#环境变量参考)
- [API 概览](#api-概览)
- [LLM 厂商配置](#llm-厂商配置)
- [常见问题](#常见问题)

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
| 📝 剧本续写 | 基于已有大纲、角色和剧情自动续写后续集数 |
| 🖼️ 图片生成 | 文本生图，支持多厂商 AI 模型、多种尺寸风格 |
| 🎥 视频生成 | 文生视频 / 参考生视频 / 视频编辑，接入字节 Seedance |
| 💬 AI 聊天 | 多模型对话，历史会话管理 |
| 👤 用户系统 | 注册 / 登录 / JWT 认证 / 角色权限 |
| 🔑 Key 管理 | 个人 API Key 配置 + 管理员全局 Key，一键批量检测连通性 |
| 📊 数据看板 | 7 天趋势图、题材分布、服务器状态监控 |
| 📱 移动端 | 全页面响应式设计，手机端流畅使用 |
| 🛡️ 管理后台 | 用户管理、全局 Key 管理、系统分析（地区/设备/厂商分布） |

---

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | Vue 3 (Composition API) | 响应式 UI 框架 |
| UI 组件 | Element Plus | 企业级组件库 |
| 状态管理 | Pinia | Vue 3 官方状态管理 |
| 图表 | ECharts 6 | 数据可视化 |
| 构建工具 | Vite 5 | 开发与构建 |
| 后端框架 | Express.js | Node.js Web 框架 |
| AI 工作流 | LangGraph | 多 Agent 编排 |
| LLM 支持 | OpenAI / Anthropic / DeepSeek / Qwen / Gemini | 多厂商适配 |
| 数据库 | MongoDB + Mongoose | 文档数据库 |
| 认证 | JWT | 无状态认证 |
| 文件上传 | Multer | 多媒体处理 |
| 日志 | Winston | 结构化日志 |
| 部署 | Docker + Docker Compose | 容器化 |

---

## 项目结构

```
Florient/
├── backend/
│   ├── config/                 # env.js, database.js, logger.js
│   ├── middleware/              # auth.js, errorHandler.js, cors.js
│   ├── models/                 # Drama, User, ApiKey, ImageTask, VideoTask
│   ├── routes/                 # 10 个路由模块
│   ├── services/               # agentWorkflow, llmFactory, taskQueue, geoLookup
│   ├── scripts/                # seedAdmin.js
│   ├── uploads/                # 上传文件目录
│   └── server.js               # Express 入口
├── frontend/
│   ├── public/                 # logo.svg
│   ├── src/
│   │   ├── components/         # 9 个通用组件
│   │   ├── views/              # 13 个页面 + admin/
│   │   ├── router/             # Vue Router
│   │   ├── stores/             # Pinia stores
│   │   ├── App.vue
│   │   └── main.js
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── .env.example                # 环境变量模板
├── .dockerignore
├── package.json                # 后端依赖
├── Dockerfile                  # 多阶段构建
├── docker-compose.yml          # 一键部署编排
└── README.md
```

---

## 本地开发

### 环境要求

- **Node.js** >= 18.0.0
- **MongoDB** >= 5.0（本地运行或 Docker）

### 1. 克隆项目

```bash
git clone <your-repo-url>
cd ai-drama-generator
```

### 2. 安装依赖

```bash
# 后端依赖（根目录）
npm install

# 前端依赖
cd frontend && npm install && cd ..
```

### 3. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`，至少配置一项 LLM 提供商的 API Key：

```bash
# 必需的 LLM 配置（选一个）
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=sk-your-key-here

# 本地 MongoDB
MONGODB_URI=mongodb://localhost:27017/ai_drama

# 后端端口（与前端 Vite 代理一致，见 vite.config.js）
PORT=3010
```

### 4. 启动开发服务

```bash
# 终端 1 — 启动后端（端口 3010）
npm run dev

# 终端 2 — 启动前端（端口 3011，代理到后端 3010）
cd frontend && npx vite --port 3011 --host 0.0.0.0
```

打开浏览器访问：

| 地址 | 说明 |
|------|------|
| `http://localhost:3011` | 前端页面（含公开首页） |
| `http://localhost:3010/api/health` | 后端健康检查 |

> **提示**：前端 Vite 开发服务器代理 `/api/*` 到后端 `localhost:3010`（见 `frontend/vite.config.js`）。

---

## Docker 一键部署

使用 Docker Compose 一键启动全部服务（MongoDB + 应用），无需手动安装 Node.js 或 MongoDB。

### 前置要求

- **Docker** >= 20.10
- **Docker Compose** >= 2.0

### 部署步骤

#### 1. 准备环境变量

创建 `.env` 文件（或直接导出环境变量），填入 LLM API Key：

```bash
# 必填：至少配置一个 LLM 提供商的 Key
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=sk-your-key-here

# 强烈建议：修改 JWT 密钥
JWT_SECRET=your-random-secret-string
```

#### 2. 一键启动

```bash
docker-compose up -d
```

#### 3. 查看状态

```bash
# 查看容器运行状态
docker-compose ps

# 查看应用日志
docker-compose logs -f app
```

#### 4. 访问

打开浏览器访问 `http://localhost:3011`

首次启动会自动：
- 创建 MongoDB 数据库 `ai_drama`
- 初始化默认管理员账号（如已配置）

#### 常用命令

```bash
# 停止服务
docker-compose down

# 停止并清除数据（注意：会删除数据库！）
docker-compose down -v

# 重新构建镜像（代码更新后）
docker-compose build --no-cache
docker-compose up -d

# 查看所有日志
docker-compose logs -f
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

- **mongo**：MongoDB 7.0，数据持久化到 Docker Volume `mongo-data`
- **app**：Node.js 应用，内置 Express 后端 + Vue 前端静态文件，暴露 3011 端口
- 应用通过 Docker 内部网络 `florient-net` 连接 MongoDB

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

| 变量 | 说明 |
|------|------|
| `LLM_PROVIDER` | 默认提供商：`openai` / `anthropic` / `deepseek` / `qwen` / `gemini` |

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
| PUT | `/api/auth/profile` | JWT | 更新资料（昵称） |
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

## LLM 厂商配置

### 获取 API Key

| 厂商 | 获取地址 | 价格参考 |
|------|----------|----------|
| OpenAI | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | 按量付费 |
| Anthropic | [console.anthropic.com](https://console.anthropic.com/settings/keys) | 按量付费 |
| DeepSeek | [platform.deepseek.com](https://platform.deepseek.com/api_keys) | 极低价格 |
| 通义千问 | [dashscope.console.aliyun.com](https://dashscope.console.aliyun.com/apiKey) | 新用户免费额度 |
| Gemini | [aistudio.google.com](https://aistudio.google.com/app/apikey) | 免费额度 |

### 自定义 Base URL

支持通过环境变量或前端 Key 管理页面配置自定义 API 地址，适用于：
- API 代理/中转服务
- 兼容 OpenAI 接口的第三方模型

个人用户可在 **个人中心 → API Key 管理** 中为每个厂商单独配置 Base URL 和模型。

---

## 常见问题

### MongoDB 连接失败

```bash
# 检查本地 MongoDB 是否运行
systemctl status mongod      # Linux
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

修改 `.env` 中的 `PORT` 或 `docker-compose.yml` 中的端口映射即可。

### Docker 构建失败

```bash
# 清除缓存重新构建
docker-compose build --no-cache
docker-compose up -d
```

### 前端页面 404

Docker 部署时确保 `frontend/dist/` 目录存在。如果从源码构建，Dockerfile 的多阶段构建会自动编译前端。

### LLM API 调用失败

- 确认 `.env` 中 API Key 已正确填写
- 检查网络能否访问 API 地址（某些厂商需要代理）
- 在个人中心的 Key 管理页面使用"一键检测"诊断所有 Key 的连通性
- 查看 `logs/` 目录获取详细错误日志

---

## 许可证

MIT License
