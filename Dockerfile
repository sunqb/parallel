# Multi-stage build: frontend (Vite) + backend (Go) + runtime with ffmpeg

############################################
# 1) Build frontend
############################################
FROM node:18-alpine AS frontend-builder
WORKDIR /frontend

# Copy frontend sources
COPY frontend/ ./

# Install deps and build
RUN set -eux; \
    if [ -f package-lock.json ]; then \
      npm ci; \
    else \
      npm install --no-audit --no-fund; \
    fi; \
    npm run build

############################################
# 2) Build backend
############################################
FROM golang:1.21-alpine AS backend-builder
WORKDIR /src/backend

RUN apk add --no-cache git

COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ ./
# Build static binary (no CGO)
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags "-s -w" -o /out/api ./cmd/api

############################################
# 3) Runtime
############################################
FROM alpine:3.19 AS runtime
WORKDIR /app

# ffmpeg for transcode, ca-certs for https requests, tzdata for correct time
RUN apk add --no-cache ffmpeg ca-certificates tzdata curl && \
    addgroup -S app && adduser -S app -G app

# Copy backend binary and frontend dist
COPY --from=backend-builder /out/api ./api
COPY --from=frontend-builder /frontend/dist ./frontend/dist

# Default envs (override in docker run/compose)
ENV HTTP_ADDR=":8080" \
    JWT_SECRET="parallel-dev-secret-2025" \
    REDIS_URL="redis://redis:6379/0" \
    DATABASE_DSN="root:123456@tcp(db:3306)/parallel?parseTime=true" \
    QUEUE_STREAM="transcode_jobs" \
    FFMPEG_BINARY="ffmpeg" \
    TRANSCODE_OUTPUT="/app/data/output" \
    UPLOAD_DIR="/app/data/uploads"

# Prepare data dirs and permissions
RUN mkdir -p /app/data/output /app/data/uploads && \
    chown -R app:app /app

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8080/healthz || exit 1

USER app
ENTRYPOINT ["./api"]

