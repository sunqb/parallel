# 双屏同步视频播放器 (Frontend-Only)

纯前端实现的双屏同步视频播放器,无需后端服务,可直接部署到 Cloudflare Workers。

## 功能特性

- 📁 支持本地视频文件上传(拖放或点击选择)
- 🔗 支持输入视频URL直接播放
- 🎬 两个播放器窗口同步播放
- 🎛️ 左侧播放器控制两个窗口(播放/暂停/进度/音量/倍速)
- 📱 响应式设计,支持移动端

## 技术栈

- React 18
- TypeScript
- Vite
- Cloudflare Workers

## 本地开发

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## 部署到 Cloudflare Workers

### 前置要求

1. 安装 Wrangler CLI (已包含在devDependencies中)
2. 登录 Cloudflare 账号

```bash
# 登录 Cloudflare
npx wrangler login
```

### 部署命令

```bash
cd frontend

# 安装依赖
npm install

# 部署到生产环境
npm run deploy

# 部署到预览环境
npm run deploy:preview

# 本地模拟 Workers 环境
npm run cf:dev
```

### 手动部署

```bash
# 1. 构建前端
npm run build

# 2. 部署到 Workers
npx wrangler deploy
```

### 配置说明

`wrangler.toml` 配置文件:

```toml
name = "dual-video-player"        # Workers 名称
main = "src/index.ts"             # Worker 入口文件
compatibility_date = "2024-01-01"

[assets]
directory = "./dist"              # 静态资源目录
```

## 项目结构

```
frontend/
├── src/
│   ├── index.ts               # Cloudflare Worker 入口
│   ├── App.tsx                # React 主应用组件
│   ├── main.tsx               # React 入口文件
│   ├── components/
│   │   └── DualVideoPlayer.tsx # 双播放器组件
│   └── styles/
│       ├── global.css         # 全局样式
│       ├── App.module.css     # App模块样式
│       └── DualVideoPlayer.css # 播放器样式
├── dist/                      # 构建输出目录
├── index.html
├── package.json
├── vite.config.ts
├── wrangler.toml              # Cloudflare Workers 配置
└── tsconfig.json
```

## 支持的视频格式

浏览器原生支持的视频格式:
- MP4 (H.264/H.265)
- WebM (VP8/VP9)
- OGV (Theora)

## 注意事项

1. **跨域限制**: 使用URL加载视频时,目标服务器需要允许跨域访问(CORS)
2. **文件大小**: 本地文件通过 `URL.createObjectURL` 加载,受浏览器内存限制
3. **HLS/DASH**: 此版本不支持HLS/DASH流媒体格式,如需支持请使用主分支版本

## Workers API

Worker 提供以下API端点:

| 路径 | 方法 | 说明 |
|------|------|------|
| `/api/health` | GET | 健康检查,返回 `{status: "ok"}` |
| `/*` | GET | 静态资源,由 Cloudflare Assets 处理 |

## License

MIT
