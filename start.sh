#!/bin/bash

# Parallel 项目启动脚本
# 支持命令: start | stop | restart | status

set -e

# 配置
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
DATA_DIR="$PROJECT_ROOT/data"

# PID文件路径
BACKEND_PID_FILE="$PROJECT_ROOT/.backend.pid"
FRONTEND_PID_FILE="$PROJECT_ROOT/.frontend.pid"

# 日志文件路径
LOG_DIR="$PROJECT_ROOT/logs"
BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"

# 环境变量配置
export DATABASE_PATH="$DATA_DIR/parallel.db"
export REDIS_URL="redis://127.0.0.1:6379/0"
export JWT_SECRET="parallel-dev-secret-2025"
export TRANSCODE_OUTPUT="$DATA_DIR/output"
export UPLOAD_DIR="$DATA_DIR/uploads"
export HTTP_ADDR=":8080"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印函数
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查Redis是否运行
check_redis() {
    if ! redis-cli ping > /dev/null 2>&1; then
        error "Redis未运行,请先启动Redis服务"
        echo "启动命令: redis-server --daemonize yes"
        exit 1
    fi
    info "Redis运行正常"
}

# 创建必要的目录
init_dirs() {
    mkdir -p "$DATA_DIR/uploads" "$DATA_DIR/output" "$LOG_DIR"
    info "数据目录已初始化"
}

# 检查并清理端口占用
check_port() {
    local port=$1
    local service_name=$2

    if lsof -Pi :$port -sTCP:LISTEN -t > /dev/null 2>&1; then
        local pid=$(lsof -ti:$port)
        warn "$service_name 端口 $port 被占用 (PID: $pid)"
        warn "正在清理占用进程..."
        kill $pid 2>/dev/null || true
        sleep 1

        # 如果还在运行则强制杀死
        if lsof -Pi :$port -sTCP:LISTEN -t > /dev/null 2>&1; then
            kill -9 $pid 2>/dev/null || true
            sleep 1
        fi

        info "端口 $port 已清理"
    fi
}

# 启动后端
start_backend() {
    if [ -f "$BACKEND_PID_FILE" ]; then
        local pid=$(cat "$BACKEND_PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            warn "后端服务已在运行 (PID: $pid)"
            return 0
        fi
    fi

    # 检查端口占用
    check_port 8080 "后端"

    info "启动后端服务..."
    cd "$BACKEND_DIR"

    # 后台运行Go服务
    nohup go run ./cmd/api > "$BACKEND_LOG" 2>&1 &
    local pid=$!
    echo "$pid" > "$BACKEND_PID_FILE"

    # 等待服务启动
    sleep 2
    if ps -p "$pid" > /dev/null 2>&1; then
        info "后端服务启动成功 (PID: $pid, 端口: 8080)"
        info "日志文件: $BACKEND_LOG"
    else
        error "后端服务启动失败,请查看日志: $BACKEND_LOG"
        rm -f "$BACKEND_PID_FILE"
        exit 1
    fi

    cd "$PROJECT_ROOT"
}

# 启动前端
start_frontend() {
    if [ -f "$FRONTEND_PID_FILE" ]; then
        local pid=$(cat "$FRONTEND_PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            warn "前端服务已在运行 (PID: $pid)"
            return 0
        fi
    fi

    # 检查端口占用
    check_port 5173 "前端"

    info "启动前端服务..."
    cd "$FRONTEND_DIR"

    # 检查依赖
    if [ ! -d "node_modules" ]; then
        info "安装前端依赖..."
        npm install
    fi

    # 后台运行前端开发服务器
    nohup npm run dev > "$FRONTEND_LOG" 2>&1 &
    local pid=$!
    echo "$pid" > "$FRONTEND_PID_FILE"

    # 等待服务启动
    sleep 3
    if ps -p "$pid" > /dev/null 2>&1; then
        info "前端服务启动成功 (PID: $pid, 端口: 5173)"
        info "日志文件: $FRONTEND_LOG"
    else
        error "前端服务启动失败,请查看日志: $FRONTEND_LOG"
        rm -f "$FRONTEND_PID_FILE"
        exit 1
    fi

    cd "$PROJECT_ROOT"
}

# 停止后端
stop_backend() {
    if [ ! -f "$BACKEND_PID_FILE" ]; then
        warn "后端服务未运行"
        return 0
    fi

    local pid=$(cat "$BACKEND_PID_FILE")
    if ps -p "$pid" > /dev/null 2>&1; then
        info "停止后端服务 (PID: $pid)..."
        kill "$pid"

        # 等待进程退出
        local count=0
        while ps -p "$pid" > /dev/null 2>&1 && [ $count -lt 10 ]; do
            sleep 1
            count=$((count + 1))
        done

        if ps -p "$pid" > /dev/null 2>&1; then
            warn "强制停止后端服务..."
            kill -9 "$pid"
        fi

        info "后端服务已停止"
    fi
    rm -f "$BACKEND_PID_FILE"
}

# 停止前端
stop_frontend() {
    if [ ! -f "$FRONTEND_PID_FILE" ]; then
        warn "前端服务未运行"
        return 0
    fi

    local pid=$(cat "$FRONTEND_PID_FILE")
    if ps -p "$pid" > /dev/null 2>&1; then
        info "停止前端服务 (PID: $pid)..."
        kill "$pid"

        # 等待进程退出
        local count=0
        while ps -p "$pid" > /dev/null 2>&1 && [ $count -lt 10 ]; do
            sleep 1
            count=$((count + 1))
        done

        if ps -p "$pid" > /dev/null 2>&1; then
            warn "强制停止前端服务..."
            kill -9 "$pid"
        fi

        info "前端服务已停止"
    fi
    rm -f "$FRONTEND_PID_FILE"
}

# 查看服务状态
show_status() {
    echo "================================"
    echo "  Parallel 服务状态"
    echo "================================"

    # 检查Redis
    echo -n "Redis:    "
    if redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}运行中${NC}"
    else
        echo -e "${RED}未运行${NC}"
    fi

    # 检查后端
    echo -n "后端:     "
    if [ -f "$BACKEND_PID_FILE" ]; then
        local pid=$(cat "$BACKEND_PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            echo -e "${GREEN}运行中${NC} (PID: $pid, 端口: 8080)"
        else
            echo -e "${RED}未运行${NC} (PID文件存在但进程不存在)"
        fi
    else
        echo -e "${RED}未运行${NC}"
    fi

    # 检查前端
    echo -n "前端:     "
    if [ -f "$FRONTEND_PID_FILE" ]; then
        local pid=$(cat "$FRONTEND_PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            echo -e "${GREEN}运行中${NC} (PID: $pid, 端口: 5173)"
        else
            echo -e "${RED}未运行${NC} (PID文件存在但进程不存在)"
        fi
    else
        echo -e "${RED}未运行${NC}"
    fi

    echo "================================"
    echo "访问地址:"
    echo "  前端: http://localhost:5173"
    echo "  后端: http://localhost:8080"
    echo "  健康检查: http://localhost:8080/healthz"
    echo "================================"
}

# 主函数
main() {
    case "${1:-}" in
        start)
            info "启动Parallel项目..."
            init_dirs
            check_redis
            start_backend
            start_frontend
            echo ""
            show_status
            ;;
        stop)
            info "停止Parallel项目..."
            stop_frontend
            stop_backend
            echo ""
            show_status
            ;;
        restart)
            info "重启Parallel项目..."
            stop_frontend
            stop_backend
            sleep 2
            init_dirs
            check_redis
            start_backend
            start_frontend
            echo ""
            show_status
            ;;
        status)
            show_status
            ;;
        *)
            echo "用法: $0 {start|stop|restart|status}"
            echo ""
            echo "命令说明:"
            echo "  start   - 启动前后端服务"
            echo "  stop    - 停止前后端服务"
            echo "  restart - 重启前后端服务"
            echo "  status  - 查看服务状态"
            echo ""
            echo "日志文件:"
            echo "  后端: $BACKEND_LOG"
            echo "  前端: $FRONTEND_LOG"
            exit 1
            ;;
    esac
}

main "$@"
