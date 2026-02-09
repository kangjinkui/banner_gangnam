-- ============================================
-- Migration: Add Public/Rally Banner Support
-- Created: 2026-02-09
-- Description: Add banner_type and department columns to support public and rally banners
-- ============================================

BEGIN;

-- Step 1: Add new columns
ALTER TABLE banners
  -- Add banner type column (default: political for existing data)
  ADD COLUMN banner_type TEXT NOT NULL DEFAULT 'political'
    CHECK (banner_type IN ('political', 'public', 'rally')),

  -- Add department column for public banners
  ADD COLUMN department TEXT;

-- Step 2: Make existing columns nullable
ALTER TABLE banners
  ALTER COLUMN party_id DROP NOT NULL,
  ALTER COLUMN start_date DROP NOT NULL,
  ALTER COLUMN end_date DROP NOT NULL;

-- Step 3: Migrate existing data
-- All existing banners are political (already set by default)
UPDATE banners SET banner_type = 'political' WHERE banner_type IS NULL;

-- Step 4: Add constraints

-- Political banners require party_id
ALTER TABLE banners
  ADD CONSTRAINT check_political_party
    CHECK (
      (banner_type = 'political' AND party_id IS NOT NULL)
      OR (banner_type IN ('public', 'rally') AND party_id IS NULL)
    );

-- Public banners require department
ALTER TABLE banners
  ADD CONSTRAINT check_public_department
    CHECK (
      (banner_type = 'public' AND department IS NOT NULL)
      OR (banner_type IN ('political', 'rally') AND department IS NULL)
    );

-- Update date range constraint to allow nullable dates
ALTER TABLE banners
  DROP CONSTRAINT IF EXISTS check_date_range,
  ADD CONSTRAINT check_date_range
    CHECK (
      (end_date IS NULL)
      OR (start_date IS NOT NULL AND end_date >= start_date)
    );

-- Step 5: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_banners_type ON banners(banner_type);
CREATE INDEX IF NOT EXISTS idx_banners_department ON banners(department) WHERE department IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_banners_type_active ON banners(banner_type, is_active);

-- Step 6: Update RLS policies (existing policies still work)
-- Public/rally banners use same permission system as political banners
-- No changes needed to RLS policies

COMMIT;

-- ============================================
-- Rollback Script (if needed)
-- ============================================
-- BEGIN;
-- DROP INDEX IF EXISTS idx_banners_type;
-- DROP INDEX IF EXISTS idx_banners_department;
-- DROP INDEX IF EXISTS idx_banners_type_active;
-- ALTER TABLE banners DROP CONSTRAINT IF EXISTS check_political_party;
-- ALTER TABLE banners DROP CONSTRAINT IF EXISTS check_public_department;
-- ALTER TABLE banners ALTER COLUMN party_id SET NOT NULL;
-- ALTER TABLE banners ALTER COLUMN start_date SET NOT NULL;
-- ALTER TABLE banners ALTER COLUMN end_date SET NOT NULL;
-- ALTER TABLE banners DROP COLUMN IF EXISTS department;
-- ALTER TABLE banners DROP COLUMN IF EXISTS banner_type;
-- COMMIT;
