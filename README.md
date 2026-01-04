# 双屏同步视频播放器

纯前端实现的双屏同步视频播放器,支持部署到 Cloudflare Workers。

## 功能特性

- 📁 **本地文件上传** - 支持拖放或点击选择视频文件
- 🔗 **URL播放** - 支持输入视频URL直接播放
- 🎬 **双屏同步** - 两个播放器窗口无间隙同步播放
- 🎛️ **统一控制** - 左侧播放器控制两个窗口(播放/暂停/进度/音量/倍速)
- 📱 **响应式设计** - 支持桌面和移动端
- ⚡ **轻量部署** - 纯静态资源,可部署到Cloudflare Workers

## 技术栈

- React 18
- TypeScript
- Vite
- Cloudflare Workers

## 快速开始

### 本地开发

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
# 访问 http://localhost:5173

# 构建生产版本
npm run build
```

## 部署到 Cloudflare Workers

### 步骤 1: 安装 Wrangler

Wrangler 已包含在项目依赖中,也可以全局安装:

```bash
npm install -g wrangler
```

### 步骤 2: 登录 Cloudflare

```bash
cd frontend
npx wrangler login
```

这会打开浏览器进行授权。

### 步骤 3: 部署

```bash
cd frontend

# 一键构建并部署
npm run deploy
```

部署成功后会显示访问地址,如: `https://dual-video-player.<your-subdomain>.workers.dev`

### 其他部署命令

```bash
# 部署到预览环境
npm run deploy:preview

# 本地模拟 Workers 环境测试
npm run cf:dev
```

### 自定义域名

1. 在 Cloudflare Dashboard 中进入 Workers & Pages
2. 选择你的 Worker
3. 点击 "Custom Domains" 添加自定义域名

### 配置文件说明

`frontend/wrangler.toml`:

```toml
name = "dual-video-player"        # Worker 名称(可修改)
main = "src/index.ts"             # Worker 入口
compatibility_date = "2024-01-01"

[assets]
directory = "./dist"              # 静态资源目录(Vite构建输出)
```

## 项目结构

```
parallel/
├── frontend/
│   ├── src/
│   │   ├── index.ts               # Cloudflare Worker 入口
│   │   ├── App.tsx                # React 主组件
│   │   ├── main.tsx               # React 入口
│   │   ├── components/
│   │   │   └── DualVideoPlayer.tsx # 双播放器组件
│   │   └── styles/
│   │       ├── global.css
│   │       ├── App.module.css
│   │       └── DualVideoPlayer.css
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── wrangler.toml              # Cloudflare Workers 配置
│   └── tsconfig.json
├── .gitignore
└── README.md
```

## 支持的视频格式

浏览器原生支持的格式:
- **MP4** (H.264/H.265) - 推荐
- **WebM** (VP8/VP9)
- **OGV** (Theora)

## 注意事项

1. **跨域限制**: 使用URL加载视频时,目标服务器需要设置 `Access-Control-Allow-Origin` 头
2. **文件大小**: 本地文件通过浏览器内存加载,大文件可能影响性能
3. **HTTPS**: Cloudflare Workers 默认提供 HTTPS

## API 端点

| 路径 | 方法 | 说明 |
|------|------|------|
| `/api/health` | GET | 健康检查 `{"status":"ok"}` |
| `/*` | GET | 静态资源 |

## License

MIT
