# ============================================
# Florient - AI短剧生成平台 Docker 镜像
# 多阶段构建: 先编译前端，再打包后端
# ============================================

# ---- Stage 1: 构建前端 ----
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# 安装前端依赖
COPY frontend/package*.json ./
RUN npm ci && npm cache clean --force

# 复制前端源码并构建
COPY frontend/ ./
RUN npm run build

# ---- Stage 2: 生产运行镜像 ----
FROM node:18-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3011

# 安装后端生产依赖
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# 复制后端代码
COPY backend/ ./backend/

# 从 Stage 1 复制构建好的前端产物
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist
COPY frontend/public/ ./frontend/public/

# 创建必要目录
RUN mkdir -p /app/logs /app/backend/uploads && chmod 755 /app/logs /app/backend/uploads

EXPOSE 3011

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3011/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "backend/server.js"]
