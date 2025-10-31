package transcode

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"

	"parallel/internal/media"
	"parallel/internal/queue"
)

type FFmpeg struct {
	binary    string
	outputDir string
	repo      *media.Repository
}

func NewFFmpeg(binary, outputDir string, repo *media.Repository) *FFmpeg {
	return &FFmpeg{binary: binary, outputDir: outputDir, repo: repo}
}

func (f *FFmpeg) Process(ctx context.Context, payload queue.JobPayload) error {
	if _, err := os.Stat(payload.Source); err != nil {
		// 标记失败以避免一直停留在 PROCESSING
		_ = f.repo.UpdateStatus(ctx, payload.MediaID, media.StatusFailed)
		return fmt.Errorf("源文件不可访问: %w", err)
	}
	outDir := filepath.Join(f.outputDir, fmt.Sprintf("media-%d", payload.MediaID))
	if err := os.MkdirAll(outDir, 0o755); err != nil {
		// 标记失败
		_ = f.repo.UpdateStatus(ctx, payload.MediaID, media.StatusFailed)
		return err
	}
	// 使用可选的音频映射（0:a:0?），当源没有音轨时不会报错
	cmd := exec.CommandContext(ctx, f.binary,
		"-y", "-i", payload.Source,
		"-preset", "veryfast",
		"-map", "0:v:0", "-map", "0:a:0?",
		"-c:v", "h264", "-c:a", "aac",
		"-b:v", "4000k",
		"-f", "hls",
		"-hls_time", "4",
		"-hls_playlist_type", "vod",
		filepath.Join(outDir, "index.m3u8"),
	)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		// 标记失败并返回错误（stderr 便于排查）
		_ = f.repo.UpdateStatus(ctx, payload.MediaID, media.StatusFailed)
		return fmt.Errorf("ffmpeg 失败: %v, stderr=%s", err, stderr.String())
	}
	// Expose via backend static path /hls
	relURL := filepath.ToSlash(filepath.Join("/hls", fmt.Sprintf("media-%d", payload.MediaID), "index.m3u8"))
	variants := []media.Variant{{Quality: "1080p", Format: "HLS", CDNURL: relURL}}
	if err := f.repo.SaveVariants(ctx, payload.MediaID, variants); err != nil {
		return err
	}
	if err := f.repo.UpdateStatus(ctx, payload.MediaID, media.StatusReady); err != nil {
		return err
	}
	return nil
}
