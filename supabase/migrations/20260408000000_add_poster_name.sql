-- 집회시위현수막 게시자명 컬럼 추가
ALTER TABLE banners ADD COLUMN IF NOT EXISTS poster_name TEXT;
