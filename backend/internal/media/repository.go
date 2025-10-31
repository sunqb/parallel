package media

import (
	"context"

	"gorm.io/gorm"

	"parallel/internal/store"
)

const (
	StatusProcessing = "PROCESSING"
	StatusReady      = "READY"
	StatusFailed     = "FAILED"
)

type Repository struct {
	db *gorm.DB
}

type Asset struct {
	store.MediaAsset
}

type Variant struct {
	Quality string `json:"quality"`
	Format  string `json:"format"`
	CDNURL  string `json:"cdnUrl"`
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) CreateAsset(ctx context.Context, ownerID, originalURL string) (uint, error) {
	asset := &store.MediaAsset{OwnerID: ownerID, Status: StatusProcessing, OriginalURL: originalURL}
	if err := r.db.WithContext(ctx).Create(asset).Error; err != nil {
		return 0, err
	}
	return asset.ID, nil
}

func (r *Repository) UpdateStatus(ctx context.Context, id uint, status string) error {
	return r.db.WithContext(ctx).Model(&store.MediaAsset{}).Where("id = ?", id).Update("status", status).Error
}

func (r *Repository) SaveVariants(ctx context.Context, id uint, variants []Variant) error {
	dbVariants := make([]store.MediaVariant, 0, len(variants))
	for _, v := range variants {
		dbVariants = append(dbVariants, store.MediaVariant{MediaID: id, Quality: v.Quality, Format: v.Format, CDNURL: v.CDNURL})
	}
	return r.db.WithContext(ctx).Create(&dbVariants).Error
}

func (r *Repository) GetAsset(ctx context.Context, id uint) (*store.MediaAsset, error) {
	var asset store.MediaAsset
	if err := r.db.WithContext(ctx).Preload("Variants").First(&asset, id).Error; err != nil {
		return nil, err
	}
	return &asset, nil
}
