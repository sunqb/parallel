# 双屏同步视频播放器

纯前端实现的双屏同步视频播放器,支持多种部署方式。

## 功能特性

- 📁 **本地文件上传** - 支持拖放或点击选择视频文件
- 🔗 **URL播放** - 支持输入视频URL直接播放
- 🎬 **双屏同步** - 两个播放器窗口无间隙同步播放
- 🎛️ **统一控制** - 左侧播放器控制两个窗口(播放/暂停/进度/音量/倍速)
- 📱 **响应式设计** - 支持桌面和移动端

## 部署方式

### 方式一: Cloudflare Workers (推荐)

**一个JS文件,直接在Cloudflare控制台操作,无需任何命令行工具。**

#### 步骤:

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages**
3. 点击 **Create Worker**
4. 复制 `worker.js` 文件的全部内容,粘贴到编辑器中
5. 点击 **Deploy**
6. 完成! 访问分配的 `*.workers.dev` 地址即可使用

#### 自定义域名 (可选):

1. 在 Worker 详情页点击 **Settings** > **Triggers**
2. 点击 **Add Custom Domain**
3. 输入你的域名(需要已接入Cloudflare)

---

### 方式二: Docker 部署

```bash
# 使用 docker-compose (推荐)
docker-compose up -d

# 或者手动构建运行
docker build -t dual-video-player .
docker run -d -p 8080:80 --name dual-video-player dual-video-player
```

访问 http://localhost:8080

---

### 方式三: 本地开发

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问 http://localhost:5173
```

构建生产版本:

```bash
npm run build
# 输出在 frontend/dist 目录
```

## 项目结构

```
parallel/
├── worker.js              # Cloudflare Workers 单文件(直接复制部署)
├── Dockerfile             # Docker 构建配置
├── docker-compose.yml     # Docker Compose 配置
├── nginx.conf             # Nginx 配置
├── frontend/              # React 前端源码
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── components/
│   │   └── styles/
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
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
3. **HTTPS**: 生产环境建议使用HTTPS

## License

MIT
