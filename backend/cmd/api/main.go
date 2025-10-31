package main

import (
    "context"
    "net/http"
    "strings"
    "time"

    "github.com/gin-gonic/gin"

    "parallel/internal/media"
    "parallel/internal/queue"
    "parallel/internal/store"
    "parallel/internal/transcode"
    "parallel/pkg/auth"
    "parallel/pkg/config"
    "parallel/pkg/logger"
)

func main() {
	cfg := config.Load()
	log := logger.New(cfg.Env)

	db, err := store.NewDB(cfg.DatabaseDSN)
	if err != nil {
		log.Fatalf("init db: %v", err)
	}
	redisClient := queue.NewRedis(cfg.RedisURL)
	dispatcher := queue.NewDispatcher(redisClient, cfg.QueueStream)

	repo := media.NewRepository(db)
	worker := transcode.NewFFmpeg(cfg.FFmpegBinary, cfg.TranscodeOutputDir, repo)
	scheduler := transcode.NewScheduler(dispatcher, worker, log)

	if err := scheduler.Start(context.Background()); err != nil {
		log.Fatalf("start scheduler: %v", err)
	}

	router := gin.New()
	router.Use(gin.Recovery())

    // Serve HLS outputs as static files without auth
    // Example: /hls/media-123/index.m3u8
    router.Static("/hls", cfg.TranscodeOutputDir)

    // Serve frontend (built by Vite) in production from frontend/dist
    // Allows accessing the app via the same :8080 origin.
    // Note: run `npm run build` in frontend/ first to generate dist/.
    router.Static("/assets", "./frontend/dist/assets")
    router.GET("/", func(c *gin.Context) {
        c.File("./frontend/dist/index.html")
    })
    // Liveness probe
    router.GET("/healthz", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{"ok": true})
    })
    // SPA fallback for non-API, non-HLS routes.
    router.NoRoute(func(c *gin.Context) {
        p := c.Request.URL.Path
        if strings.HasPrefix(p, "/api") || strings.HasPrefix(p, "/hls") {
            c.Status(http.StatusNotFound)
            return
        }
        c.File("./frontend/dist/index.html")
    })

	// Protected API group
	apiGroup := router.Group("/api")
	apiGroup.Use(auth.JWTMiddleware(cfg.JWTSecret))

	mediaSvc := media.NewService(repo, scheduler, cfg)
	apiGroup.POST("/v1/media", mediaSvc.HandleUpload)
	apiGroup.POST("/v1/media/by-url", mediaSvc.HandleRemoteFetch)
	apiGroup.GET("/v1/media/:id/play", mediaSvc.HandlePlaybackDescriptor)

	srv := &http.Server{
		Addr:         cfg.HTTPAddr,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
	}

	log.Printf("http server listening on %s", cfg.HTTPAddr)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server error: %v", err)
	}
}
