-- Initial schema for media processing
-- MySQL 8.0+, UTF8MB4

CREATE TABLE IF NOT EXISTS `media_assets` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `owner_id` varchar(64) DEFAULT NULL,
  `status` varchar(32) DEFAULT NULL,
  `original_url` varchar(512) DEFAULT NULL,
  `duration` double DEFAULT NULL,
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_media_assets_owner_id` (`owner_id`),
  KEY `idx_media_assets_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `media_variants` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `media_id` bigint(20) unsigned DEFAULT NULL,
  `quality` varchar(32) DEFAULT NULL,
  `format` varchar(16) DEFAULT NULL,
  `cdn_url` varchar(512) DEFAULT NULL,
  `created_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_media_variants_media_id` (`media_id`),
  -- 业务层保证关联一致性，不落库外键约束
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `transcode_jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `media_id` bigint(20) unsigned DEFAULT NULL,
  `state` varchar(32) DEFAULT NULL,
  `retry_count` bigint(20) DEFAULT NULL,
  `log_path` varchar(256) DEFAULT NULL,
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_transcode_jobs_media_id` (`media_id`),
  KEY `idx_transcode_jobs_state` (`state`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
