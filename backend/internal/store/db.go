package store

import (
	"log"
	"time"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type MediaAsset struct {
	ID          uint   `gorm:"primaryKey"`
	OwnerID     string `gorm:"size:64;index"`
	Status      string `gorm:"size:32;index"`
	OriginalURL string `gorm:"size:512"`
	Duration    float64
	CreatedAt   time.Time
	UpdatedAt   time.Time
	Variants    []MediaVariant `gorm:"foreignKey:MediaID"`
}

type MediaVariant struct {
	ID        uint   `gorm:"primaryKey"`
	MediaID   uint   `gorm:"index"`
	Quality   string `gorm:"size:32"`
	Format    string `gorm:"size:16"`
	CDNURL    string `gorm:"size:512"`
	CreatedAt time.Time
}

type TranscodeJob struct {
	ID         uint   `gorm:"primaryKey"`
	MediaID    uint   `gorm:"index"`
	State      string `gorm:"size:32;index"`
	RetryCount int
	LogPath    string `gorm:"size:256"`
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

func NewDB(dsn string) (*gorm.DB, error) {
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Warn)})
	if err != nil {
		return nil, err
	}
	if err := db.AutoMigrate(&MediaAsset{}, &MediaVariant{}, &TranscodeJob{}); err != nil {
		return nil, err
	}
	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(50)
	sqlDB.SetConnMaxLifetime(30 * time.Minute)
	log.Printf("database connected")
	return db, nil
}
