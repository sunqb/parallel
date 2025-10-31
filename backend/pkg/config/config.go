package config

import (
	"log"
	"os"
	"path/filepath"
)

type Config struct {
	Env                string
	HTTPAddr           string
	DatabaseDSN        string
	RedisURL           string
	QueueStream        string
	JWTSecret          string
	FFmpegBinary       string
	TranscodeOutputDir string
	UploadDir          string
}

func Load() Config {
	cfg := Config{
		Env:                getenv("APP_ENV", "development"),
		HTTPAddr:           getenv("HTTP_ADDR", ":8080"),
		DatabaseDSN:        getenv("DATABASE_DSN", "root:123456@tcp(10.2.128.120:3306)/parallel?parseTime=true"),
		RedisURL:           getenv("REDIS_URL", "redis://localhost:6379/0"),
		QueueStream:        getenv("QUEUE_STREAM", "transcode_jobs"),
		JWTSecret:          getenv("JWT_SECRET", "dev-secret"),
		FFmpegBinary:       getenv("FFMPEG_BINARY", "ffmpeg"),
		TranscodeOutputDir: getenv("TRANSCODE_OUTPUT", "./data/output"),
		UploadDir:          getenv("UPLOAD_DIR", "./data/uploads"),
	}
	if cfg.JWTSecret == "" {
		log.Fatal("JWT_SECRET 未配置")
	}
	mustEnsureDir(cfg.TranscodeOutputDir)
	mustEnsureDir(cfg.UploadDir)
	return cfg
}

func mustEnsureDir(path string) {
	if err := os.MkdirAll(path, 0o755); err != nil {
		log.Fatalf("创建目录失败: %s, err=%v", path, err)
	}
}

func getenv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	if filepath.IsAbs(def) {
		return def
	}
	return def
}
