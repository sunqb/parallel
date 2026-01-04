# 双屏同步视频播放器 (Frontend-Only)

纯前端实现的双屏同步视频播放器,无需后端服务,可直接部署到 Cloudflare Pages 等静态托管平台。

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
- 纯CSS样式(无UI框架依赖)

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

## 部署到 Cloudflare Pages

### 方式一: 通过 Git 连接

1. 将代码推送到 GitHub/GitLab
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
3. 进入 Workers & Pages > Create application > Pages
4. 连接你的 Git 仓库
5. 配置构建设置:
   - **Framework preset**: None
   - **Build command**: `cd frontend && npm install && npm run build`
   - **Build output directory**: `frontend/dist`
   - **Root directory**: `/`
6. 点击 Save and Deploy

### 方式二: 直接上传

1. 本地构建:
   ```bash
   cd frontend
   npm run build
   ```
2. 在 Cloudflare Pages 创建项目
3. 选择 "Upload assets"
4. 上传 `frontend/dist` 目录中的所有文件

### 方式三: 使用 Wrangler CLI

```bash
# 安装 Wrangler
npm install -g wrangler

# 登录
wrangler login

# 构建
cd frontend && npm run build

# 部署
wrangler pages deploy dist --project-name=dual-video-player
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

## 项目结构

```
frontend/
├── src/
│   ├── App.tsx                 # 主应用组件
│   ├── main.tsx               # 入口文件
│   ├── components/
│   │   └── DualVideoPlayer.tsx # 双播放器组件
│   └── styles/
│       ├── global.css         # 全局样式
│       ├── App.module.css     # App模块样式
│       └── DualVideoPlayer.css # 播放器样式
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## License

MIT
