package logger

import (
	"log"
	"os"
)

func New(env string) *log.Logger {
	logger := log.New(os.Stdout, "", log.LstdFlags|log.Lshortfile)
	if env == "production" {
		logger.SetFlags(log.LstdFlags)
	}
	return logger
}
