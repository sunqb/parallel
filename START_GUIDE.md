# 启动脚本使用指南

## 快速开始

```bash
# 赋予执行权限(首次运行)
chmod +x start.sh

# 启动服务
./start.sh start

# 查看状态
./start.sh status

# 重启服务
./start.sh restart

# 停止服务
./start.sh stop
```

## 命令说明

| 命令 | 功能 | 说明 |
|------|------|------|
| `./start.sh start` | 启动服务 | 启动前后端服务,会自动检查Redis并创建必要目录 |
| `./start.sh stop` | 停止服务 | 优雅停止前后端服务 |
| `./start.sh restart` | 重启服务 | 先停止再启动,等价于 stop + start |
| `./start.sh status` | 查看状态 | 显示所有服务的运行状态和访问地址 |

## 前置要求

在使用启动脚本前,请确保已安装:

- ✅ Go 1.21+
- ✅ Node.js 18+
- ✅ Redis (需先启动)
- ✅ FFmpeg

如果Redis未运行,请先启动:
```bash
redis-server --daemonize yes
```

## 环境变量

脚本内置以下环境变量配置(可在 [start.sh](start.sh:21-27) 中修改):

```bash
DATABASE_PATH="./data/parallel.db"          # SQLite数据库路径
REDIS_URL="redis://127.0.0.1:6379/0"        # Redis连接地址
JWT_SECRET="parallel-dev-secret-2025"       # JWT密钥(开发环境)
TRANSCODE_OUTPUT="./data/output"            # 转码输出目录
UPLOAD_DIR="./data/uploads"                 # 上传文件目录
HTTP_ADDR=":8080"                           # 后端监听地址
```

## 日志文件

服务运行日志保存在 `logs/` 目录:

- **后端日志**: `logs/backend.log`
- **前端日志**: `logs/frontend.log`

实时查看日志:
```bash
# 查看后端日志
tail -f logs/backend.log

# 查看前端日志
tail -f logs/frontend.log
```

## PID文件

进程ID保存在项目根目录:

- `.backend.pid` - 后端进程ID
- `.frontend.pid` - 前端进程ID

## 故障排查

### 1. 端口被占用

```bash
# 查看端口占用
lsof -i :8080  # 后端端口
lsof -i :5173  # 前端端口

# 杀死占用进程
kill $(lsof -ti:8080)
```

### 2. Redis连接失败

```bash
# 检查Redis状态
redis-cli ping

# 启动Redis
redis-server --daemonize yes
```

### 3. 服务启动失败

查看对应日志文件排查问题:
```bash
cat logs/backend.log
cat logs/frontend.log
```

## 访问地址

服务启动成功后:

- 🌐 **前端应用**: http://localhost:5173
- 🔧 **后端API**: http://localhost:8080
- ❤️ **健康检查**: http://localhost:8080/healthz

## 生产环境部署

生产环境建议使用Docker部署:

```bash
docker compose -f docker-compose.example.yml up -d
```

或使用systemd服务管理,而非此开发脚本。
