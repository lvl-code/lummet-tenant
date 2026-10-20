-- =====================================================
-- 0002: Media library
-- =====================================================
-- Uploaded files (R2 keys and URLs), their folders, and the legacy media
-- table.
--
-- Final schema: every statement is idempotent (IF NOT EXISTS), so the file is
-- safe on a new database and on a live one that already has these tables.

-- ----- media_folders
CREATE TABLE IF NOT EXISTS media_folders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  parent_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES media_folders(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_media_folders_parent ON media_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_media_folders_slug ON media_folders(slug);

-- ----- media_library
CREATE TABLE IF NOT EXISTS media_library (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  alt_text TEXT,
  width INTEGER,
  height INTEGER,
  mime_type TEXT,
  size INTEGER,
  folder TEXT DEFAULT 'general',
  uploaded_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  r2_key TEXT,
  original_filename TEXT,
  type TEXT DEFAULT 'image',
  caption TEXT,
  duration INTEGER,
  poster_url TEXT,
  file_ext TEXT,
  credit TEXT,
  photographer TEXT,
  credit_source TEXT,
  license TEXT
);
CREATE INDEX IF NOT EXISTS idx_media_filename ON media_library(filename);
CREATE INDEX IF NOT EXISTS idx_media_folder ON media_library(folder);
CREATE INDEX IF NOT EXISTS idx_media_type ON media_library(type);

-- ----- media
CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  url TEXT NOT NULL,
  mime_type TEXT,
  size INTEGER,
  uploaded_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  alt_text TEXT,
  width INTEGER,
  height INTEGER,
  folder TEXT
);
