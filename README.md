# Parallel - 双屏同步视频播放平台

**Parallel** 是一个创新的视频播放平台，实现将单个视频源在播放端左右并排同步展示的能力。项目采用 Go 后端服务与 React 前端应用架构，支持上传本地文件或提交远程视频 URL 并进行异步转码，最终通过 HLS 流形式供前端双播放器实例完美同步播放。

## 架构概览

- **后端 (Go + Gin)**：
  - 文件上传 / 远程拉取入口，转码任务派发。
  - Redis Stream 维护转码队列，FFmpeg worker 输出多码率 HLS。
  - SQLite/Gorm 存储媒体元数据与转码结果。
  - JWT 鉴权、预留 CDN 防盗链与缓存策略。

- **前端 (React + Vite)**：
  - 上传 / URL 表单、播放资源加载面板。
  - 基于 Video.js + hls.js 的双 `<video>` 并排组件，提供播放、暂停、进度、倍速同步。
  - 支持跨端封装（Tauri / Capacitor）以实现桌面与移动壳。

## 快速开始

> 以下命令假设本地已安装 Go 1.21+、Node.js 18+、FFmpeg、Redis。项目使用SQLite作为轻量级数据库,无需额外安装。

### 克隆项目

```bash
git clone <repository-url>
cd parallel
```

### 后端

1. 进入目录并拉取依赖：
   ```bash
   cd backend
   go mod tidy
   ```
2. 配置环境变量（示例）：
   ```bash
   export DATABASE_PATH="./data/parallel.db"
   export REDIS_URL="redis://127.0.0.1:6379/0"
   export JWT_SECRET="please-change-me"
   export TRANSCODE_OUTPUT="./data/output"
   export UPLOAD_DIR="./data/uploads"
   ```
3. 启动服务：
   ```bash
   go run ./cmd/api
   ```

### 前端

1. 安装依赖并启动：
   ```bash
   cd frontend
   pnpm install   # 或 npm install / yarn install
   pnpm dev       # 默认 http://localhost:5173
   ```
2. 代理配置已将 `/api` 请求转发至 `http://localhost:8080`。

## 核心接口

| 方法 | 路径 | 描述 |
| ---- | ---- | ---- |
| `POST` | `/api/v1/media` | 上传本地视频文件，返回 `mediaId` |
| `POST` | `/api/v1/media/by-url` | 提交远程视频地址，异步下载后转码 |
| `GET` | `/api/v1/media/{id}/play` | 查询转码状态及播放地址列表 |

- 所有请求需在 `Authorization` 头携带 `Bearer <token>`。
- 当转码完成后，前端将同一 `cdnUrl` 绑定左右播放器，利用前端同步逻辑保证两侧一致。

## 目录结构

```
parallel/
  backend/
    cmd/api              # HTTP 入口
    internal/
      media              # 业务服务、仓储
      queue              # Redis Stream 派发器
      transcode          # 调度与 FFmpeg worker
      store              # Gorm 模型与 DB 初始化
    pkg/
      api, auth, config, logger
  frontend/
    src/
      components/DualVideoPlayer.tsx
      App.tsx, main.tsx
      styles/
```

## 测试与扩展

- 建议使用 testcontainers 对上传→转码链路做集成测试，Playwright 验证前端同步误差小于 50ms。
- 转码节点可扩展 GPU Profile、集成对象存储（S3/OSS）与 CDN 刷新逻辑。
- 如需离线/内网部署，可替换前端壳为 Electron/Tauri，同时后端支持本地文件协议输入。

## 安全 & 性能检查

- 输入验证、防盗链 Header、JWT 鉴权已在代码中预留。
- 禁止循环内 IO、采用 Redis Stream 消峰，支持配置化输出目录。
- 建议结合 Prometheus + Grafana/Sentry 做监控与告警。

## Docker 部署

镜像已通过多阶段构建同时包含前后端与 ffmpeg，容器内后端会静态托管 `frontend/dist` 与 `/hls`。

### 部署方式概览

本项目采用单体架构，前后端通过多阶段构建合并到一个镜像中，后端服务直接托管前端静态文件。以下是详细的部署方式：

#### 1. 使用 Docker 直接运行

```bash
docker run -d --name parallel \
  -p 8080:8080 \
  -e DATABASE_PATH='/app/data/parallel.db' \
  -e REDIS_URL='redis://redis-host:6379/0' \
  -e JWT_SECRET='your-secret-key' \
  -e HTTP_ADDR=':8080' \
  -e TRANSCODE_OUTPUT='/app/data/output' \
  -e UPLOAD_DIR='/app/data/uploads' \
  -e FFMPEG_BINARY='ffmpeg' \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/data/uploads:/app/data/uploads \
  -v $(pwd)/data/output:/app/data/output \
  parallel-app:latest
```

#### 2. 使用 Docker Compose

推荐使用 `docker-compose.example.yml` 文件快速启动服务：

```bash
docker compose -f docker-compose.example.yml up -d --build
```

#### 3. 注意事项

- **环境变量**：确保 `JWT_SECRET` 和 `DATABASE_DSN` 等敏感信息已正确配置。
- **持久化存储**：挂载 `/app/data/uploads` 和 `/app/data/output` 到外部卷。
- **健康检查**：服务启动后可通过 `http://127.0.0.1:8080/healthz` 验证运行状态。

### 构建镜像

```bash
docker build -t parallel-app:latest .
# 多架构（可选）
# docker buildx build --platform linux/amd64,linux/arm64 -t your-registry/parallel-app:latest .
```


### 环境变量

- `DATABASE_PATH`：SQLite数据库文件路径，默认 `./data/parallel.db`（容器内为 `/app/data/parallel.db`）
- `REDIS_URL`：Redis 连接串，如 `redis://redis:6379/0`
- `JWT_SECRET`：JWT 密钥；生产务必修改。开发可用 `parallel-dev-secret-2025`
- `QUEUE_STREAM`：Redis Stream 名，默认 `transcode_jobs`
- `FFMPEG_BINARY`：ffmpeg 可执行路径，默认 `ffmpeg`
- `TRANSCODE_OUTPUT`：HLS 输出目录，容器默认 `/app/data/output`
- `UPLOAD_DIR`：上传缓存目录，容器默认 `/app/data/uploads`
- `HTTP_ADDR`：监听地址，默认 `:8080`

### 路径与验证

- 前端入口：`/`（容器内由后端托管 `frontend/dist`）
- 健康检查：`/healthz`
- HLS 静态：`/hls/media-<id>/index.m3u8`
- 成功示例返回（播放接口）：`GET /api/v1/media/{id}/play -> { status: READY, variants: [...] }`

### 生产建议

- 设置强随机 `JWT_SECRET`；对 `/api` 做反向代理层限流与 WAF
- 使用外部持久化卷挂载 `/app/data/{uploads,output}`
- 监控：采集 `/healthz`、容器日志与转码失败日志；为 Redis 设置持久化与备份；定期备份 SQLite 数据库文件
- 如需多实例，建议将 `/hls` 挂到共享存储或对象存储（改写 `CDNURL` 为公网 URL）
