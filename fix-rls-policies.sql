-- Fix RLS policies for remote Supabase instance

-- Ensure storage bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'banners',
  'banners',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for storage bucket
CREATE POLICY "Anyone can view banner images" ON storage.objects
FOR SELECT USING (bucket_id = 'banners');

CREATE POLICY "Anyone can upload banner images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'banners');

CREATE POLICY "Anyone can update banner images" ON storage.objects
FOR UPDATE USING (bucket_id = 'banners');

CREATE POLICY "Anyone can delete banner images" ON storage.objects
FOR DELETE USING (bucket_id = 'banners');

-- Ensure tables have RLS disabled or proper policies
ALTER TABLE banners DISABLE ROW LEVEL SECURITY;
ALTER TABLE parties DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;