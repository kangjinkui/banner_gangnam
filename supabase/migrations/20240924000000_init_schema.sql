-- Create tables for political banner management system
-- Disable RLS for all tables as requested

-- Create parties table
CREATE TABLE parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  marker_icon_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable RLS for parties table
ALTER TABLE parties DISABLE ROW LEVEL SECURITY;

-- Create banners table
CREATE TABLE banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  administrative_district TEXT,
  text TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  image_url TEXT,
  thumbnail_url TEXT,
  memo TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Disable RLS for banners table
ALTER TABLE banners DISABLE ROW LEVEL SECURITY;

-- Create audit_logs table for admin actions
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  user_id UUID,
  user_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable RLS for audit_logs table
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX idx_banners_party_id ON banners(party_id);
CREATE INDEX idx_banners_location ON banners(lat, lng);
CREATE INDEX idx_banners_dates ON banners(start_date, end_date);
CREATE INDEX idx_banners_administrative_district ON banners(administrative_district);
CREATE INDEX idx_banners_active ON banners(is_active);
CREATE INDEX idx_parties_active ON parties(is_active);
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Create function to automatically update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_parties_updated_at
  BEFORE UPDATE ON parties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_banners_updated_at
  BEFORE UPDATE ON banners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert dummy data for testing

-- Insert test parties
INSERT INTO parties (id, name, color, marker_icon_url, is_active) VALUES
('a1b2c3d4-e5f6-4a5b-8c9d-1e2f3a4b5c6d', '민주당', '#004EA2', 'https://example.com/democratic-party-marker.png', true),
('b2c3d4e5-f6a7-5b6c-9d0e-2f3a4b5c6d7e', '국민의힘', '#E61E2B', 'https://example.com/people-power-party-marker.png', true),
('c3d4e5f6-a7b8-6c7d-0e1f-3a4b5c6d7e8f', '정의당', '#FFCC00', 'https://example.com/justice-party-marker.png', true),
('d4e5f6a7-b8c9-7d8e-1f2a-4b5c6d7e8f9a', '진보당', '#00A651', 'https://example.com/progressive-party-marker.png', true),
('e5f6a7b8-c9d0-8e9f-2a3b-5c6d7e8f9a0b', '기본소득당', '#8E44AD', 'https://example.com/basic-income-party-marker.png', false);

-- Insert test banners in Gangnam district
INSERT INTO banners (
  id, party_id, address, lat, lng, administrative_district, text,
  start_date, end_date, image_url, thumbnail_url, memo, is_active
) VALUES
-- 민주당 현수막들
('f6a7b8c9-d0e1-9f0a-3b4c-6d7e8f9a0b1c', 'a1b2c3d4-e5f6-4a5b-8c9d-1e2f3a4b5c6d', '서울시 강남구 테헤란로 123', 37.5010, 127.0395, '삼성1동', '민생을 위한 정치, 민주당이 앞장서겠습니다', '2024-01-01', '2024-01-31', 'https://example.com/banner1.jpg', 'https://example.com/banner1_thumb.jpg', '테헤란로 주요 위치', true),
('a7b8c9d0-e1f2-0a1b-4c5d-7e8f9a0b1c2d', 'a1b2c3d4-e5f6-4a5b-8c9d-1e2f3a4b5c6d', '서울시 강남구 강남대로 456', 37.4979, 127.0276, '역삼1동', '청년 일자리 창출, 민주당과 함께', '2024-02-01', '2024-02-29', 'https://example.com/banner2.jpg', 'https://example.com/banner2_thumb.jpg', '강남역 인근', true),
('b8c9d0e1-f2a3-1b2c-5d6e-8f9a0b1c2d3e', 'a1b2c3d4-e5f6-4a5b-8c9d-1e2f3a4b5c6d', '서울시 강남구 봉은사로 789', 37.5037, 127.0426, '삼성2동', '교육 혁신으로 미래를 열어갑니다', '2024-03-01', '2024-03-31', 'https://example.com/banner3.jpg', 'https://example.com/banner3_thumb.jpg', '학교 근처 설치', true),

-- 국민의힘 현수막들
('c9d0e1f2-a3b4-2c3d-6e7f-9a0b1c2d3e4f', 'b2c3d4e5-f6a7-5b6c-9d0e-2f3a4b5c6d7e', '서울시 강남구 선릉로 321', 37.5044, 127.0479, '대치1동', '경제 회복, 국민의힘이 해답입니다', '2024-01-15', '2024-02-15', 'https://example.com/banner4.jpg', 'https://example.com/banner4_thumb.jpg', '대치동 상업지역', true),
('d0e1f2a3-b4c5-3d4e-7f8a-0b1c2d3e4f5a', 'b2c3d4e5-f6a7-5b6c-9d0e-2f3a4b5c6d7e', '서울시 강남구 논현로 654', 37.5109, 127.0225, '신사동', '안전한 대한민국, 국민의힘과 함께', '2024-02-10', '2024-03-10', 'https://example.com/banner5.jpg', 'https://example.com/banner5_thumb.jpg', '신사역 출구 근처', true),
('e1f2a3b4-c5d6-4e5f-8a9b-1c2d3e4f5a6b', 'b2c3d4e5-f6a7-5b6c-9d0e-2f3a4b5c6d7e', '서울시 강남구 도산대로 987', 37.5203, 127.0381, '청담동', '부동산 정책 정상화로 서민 주거 안정', '2024-03-05', '2024-04-05', 'https://example.com/banner6.jpg', 'https://example.com/banner6_thumb.jpg', '청담동 주택가', true),

-- 정의당 현수막들
('f2a3b4c5-d6e7-5f6a-9b0c-2d3e4f5a6b7c', 'c3d4e5f6-a7b8-6c7d-0e1f-3a4b5c6d7e8f', '서울시 강남구 영동대로 111', 37.5172, 127.0473, '청담동', '노동자 권익 보호, 정의로운 사회를 만들어갑니다', '2024-01-20', '2024-02-20', 'https://example.com/banner7.jpg', 'https://example.com/banner7_thumb.jpg', '코엑스 근처', true),
('a3b4c5d6-e7f8-6a7b-0c1d-3e4f5a6b7c8d', 'c3d4e5f6-a7b8-6c7d-0e1f-3a4b5c6d7e8f', '서울시 강남구 학동로 222', 37.5132, 127.0364, '논현1동', '기후 위기 대응, 정의당이 앞장섭니다', '2024-02-25', '2024-03-25', 'https://example.com/banner8.jpg', 'https://example.com/banner8_thumb.jpg', '학동역 인근', true),

-- 진보당 현수막들
('b4c5d6e7-f8a9-7b8c-1d2e-4f5a6b7c8d9e', 'd4e5f6a7-b8c9-7d8e-1f2a-4b5c6d7e8f9a', '서울시 강남구 압구정로 333', 37.5270, 127.0284, '압구정동', '모든 시민을 위한 진보 정치', '2024-01-10', '2024-02-10', 'https://example.com/banner9.jpg', 'https://example.com/banner9_thumb.jpg', '압구정 로데오거리', true),
('c5d6e7f8-a9b0-8c9d-2e3f-5a6b7c8d9e0f', 'd4e5f6a7-b8c9-7d8e-1f2a-4b5c6d7e8f9a', '서울시 강남구 신사동길 444', 37.5175, 127.0199, '신사동', '사회적 약자 보호 정책 실현', '2024-03-15', '2024-04-15', 'https://example.com/banner10.jpg', 'https://example.com/banner10_thumb.jpg', '가로수길 입구', true),

-- 만료된 현수막 (테스트용)
('d6e7f8a9-b0c1-9d0e-3f4a-6b7c8d9e0f1a', 'a1b2c3d4-e5f6-4a5b-8c9d-1e2f3a4b5c6d', '서울시 강남구 역삼로 555', 37.4990, 127.0350, '역삼2동', '만료된 현수막 테스트', '2023-12-01', '2023-12-31', 'https://example.com/banner11.jpg', 'https://example.com/banner11_thumb.jpg', '만료 테스트용', true),

-- 비활성화된 현수막 (테스트용)
('e7f8a9b0-c1d2-0e1f-4a5b-7c8d9e0f1a2b', 'b2c3d4e5-f6a7-5b6c-9d0e-2f3a4b5c6d7e', '서울시 강남구 개포로 666', 37.4837, 127.0598, '개포1동', '비활성화된 현수막 테스트', '2024-04-01', '2024-04-30', 'https://example.com/banner12.jpg', 'https://example.com/banner12_thumb.jpg', '비활성화 테스트용', false);

-- Insert test audit logs
INSERT INTO audit_logs (action_type, table_name, record_id, new_values, user_email) VALUES
('CREATE', 'parties', 'a1b2c3d4-e5f6-4a5b-8c9d-1e2f3a4b5c6d', '{"name": "민주당", "color": "#004EA2"}', 'admin@example.com'),
('CREATE', 'parties', 'b2c3d4e5-f6a7-5b6c-9d0e-2f3a4b5c6d7e', '{"name": "국민의힘", "color": "#E61E2B"}', 'admin@example.com'),
('CREATE', 'banners', 'f6a7b8c9-d0e1-9f0a-3b4c-6d7e8f9a0b1c', '{"address": "서울시 강남구 테헤란로 123", "text": "민생을 위한 정치, 민주당이 앞장서겠습니다"}', 'admin@example.com'),
('UPDATE', 'banners', 'e7f8a9b0-c1d2-0e1f-4a5b-7c8d9e0f1a2b', '{"is_active": false}', 'admin@example.com');