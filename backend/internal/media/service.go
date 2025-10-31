package media

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"parallel/internal/queue"
	"parallel/pkg/api"
	"parallel/pkg/config"
)

type Service struct {
	repo      *Repository
	scheduler Scheduler
	cfg       config.Config
}

type Scheduler interface {
	Submit(ctx context.Context, payload queue.JobPayload) error
}

type uploadResponse struct {
	MediaID uint `json:"mediaId"`
}

type playbackResponse struct {
	Status   string    `json:"status"`
	Variants []Variant `json:"variants"`
}

func NewService(repo *Repository, scheduler Scheduler, cfg config.Config) *Service {
	return &Service{repo: repo, scheduler: scheduler, cfg: cfg}
}

func (s *Service) HandleUpload(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, api.Error("文件缺失"))
		return
	}
	ownerID := s.ownerIDFromContext(c)

	destName := fmt.Sprintf("upload-%d-%s", time.Now().UnixNano(), sanitizeFilename(file.Filename))
	destPath := filepath.Join(s.cfg.UploadDir, destName)
	if err := c.SaveUploadedFile(file, destPath); err != nil {
		c.JSON(http.StatusInternalServerError, api.Error("保存文件失败"))
		return
	}

	reqCtx := c.Request.Context()
	mediaID, err := s.repo.CreateAsset(reqCtx, ownerID, destPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, api.Error("记录资源失败"))
		return
	}
	payload := queue.JobPayload{MediaID: mediaID, Source: destPath}
	if err := s.scheduler.Submit(context.Background(), payload); err != nil {
		c.JSON(http.StatusInternalServerError, api.Error("投递转码任务失败"))
		return
	}
	status, body := api.Accepted(uploadResponse{MediaID: mediaID})
	c.JSON(status, body)
}

func (s *Service) HandleRemoteFetch(c *gin.Context) {
	var req struct {
		URL string `json:"url"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, api.Error("请求格式错误"))
		return
	}
	req.URL = strings.TrimSpace(req.URL)
	if !strings.HasPrefix(req.URL, "http") {
		c.JSON(http.StatusBadRequest, api.Error("URL 非法"))
		return
	}
	ownerID := s.ownerIDFromContext(c)
	reqCtx := c.Request.Context()
	mediaID, err := s.repo.CreateAsset(reqCtx, ownerID, req.URL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, api.Error("记录资源失败"))
		return
	}
	go s.fetchAndSchedule(context.Background(), mediaID, req.URL)
	status, body := api.Accepted(uploadResponse{MediaID: mediaID})
	c.JSON(status, body)
}

func (s *Service) HandlePlaybackDescriptor(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, api.Error("ID 非法"))
		return
	}
	asset, err := s.repo.GetAsset(c.Request.Context(), uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, api.Error("资源不存在"))
		return
	}
	variants := make([]Variant, 0, len(asset.Variants))
	for _, v := range asset.Variants {
		variants = append(variants, Variant{Quality: v.Quality, Format: v.Format, CDNURL: v.CDNURL})
	}
	status, body := api.Ok(playbackResponse{Status: asset.Status, Variants: variants})
	c.JSON(status, body)
}

func (s *Service) fetchAndSchedule(ctx context.Context, mediaID uint, rawURL string) {
	if err := s.downloadToUpload(ctx, mediaID, rawURL); err != nil {
		_ = s.repo.UpdateStatus(ctx, mediaID, StatusFailed)
	}
}

func (s *Service) downloadToUpload(ctx context.Context, mediaID uint, rawURL string) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return err
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		return fmt.Errorf("下载失败: status=%d", resp.StatusCode)
	}
	name := fmt.Sprintf("remote-%d-%d.mp4", mediaID, time.Now().UnixNano())
	dest := filepath.Join(s.cfg.UploadDir, name)
	f, err := os.Create(dest)
	if err != nil {
		return err
	}
	defer f.Close()
	if _, err := io.Copy(f, resp.Body); err != nil {
		return err
	}
	payload := queue.JobPayload{MediaID: mediaID, Source: dest}
	return s.scheduler.Submit(context.Background(), payload)
}

func (s *Service) ownerIDFromContext(c *gin.Context) string {
	return "demo-user"
}

func sanitizeFilename(name string) string {
	name = strings.ReplaceAll(name, " ", "-")
	name = strings.ToLower(name)
	return name
}
