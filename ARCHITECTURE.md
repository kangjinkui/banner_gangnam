# 🏗️ Architecture Documentation

Banner Gangnam 프로젝트의 아키텍처 상세 설명입니다.

## 목차
- [전체 아키텍처](#전체-아키텍처)
- [디렉토리 구조](#디렉토리-구조)
- [데이터 플로우](#데이터-플로우)
- [주요 컴포넌트](#주요-컴포넌트)
- [API 설계](#api-설계)
- [데이터베이스 스키마](#데이터베이스-스키마)
- [상태 관리](#상태-관리)

---

## 전체 아키텍처

### 아키텍처 패턴: Monolithic Next.js App Router

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          React Components (Client Side)              │  │
│  │  - features/*, components/*, pages                   │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/HTTPS
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Server                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            API Routes (Backend)                      │  │
│  │  - /api/banners, /api/parties, /api/export          │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Business Logic (lib/services)                │  │
│  │  - BannerService, PartyService                       │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Data Access (lib/database)                   │  │
│  │  - BannersService, PartiesService (Supabase SDK)    │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────┬─────────────────┬──────────────────────────────┘
             │                 │
             │                 │ REST API
             │                 ▼
             │      ┌─────────────────────┐
             │      │   Kakao Map API     │
             │      │  - Geocoding        │
             │      │  - Districts        │
             │      └─────────────────────┘
             │
             │ PostgreSQL Protocol
             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Backend                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            PostgreSQL Database                       │  │
│  │  - parties, banners, audit_logs                      │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            Supabase Storage                          │  │
│  │  - banner-images bucket                              │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            Supabase Auth                             │  │
│  │  - Email/Password authentication                     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 디렉토리 구조

### Frontend (🟢 Client-Side)

```
src/
├── app/
│   ├── (frontend)/              # Route Group (URL에 영향 없음)
│   │   ├── profile/page.tsx     # /profile 페이지
│   │   └── register/page.tsx    # /register 페이지
│   ├── layout.tsx               # Root Layout (Kakao Map 스크립트)
│   ├── page.tsx                 # / 홈페이지 (지도 + 테이블)
│   └── providers.tsx            # React Query Provider
│
├── features/                    # Feature-based 모듈
│   ├── auth/
│   │   └── components/
│   │       ├── LoginDialog.tsx
│   │       └── ForgotPasswordDialog.tsx
│   ├── banners/
│   │   └── components/
│   │       └── BannerDetailDialog.tsx
│   ├── map/
│   │   └── components/
│   │       └── KakaoMap.tsx      # Kakao Map 렌더링
│   └── parties/
│       └── components/
│           └── PartyManagement.tsx
│
├── components/ui/               # shadcn/ui 컴포넌트
│   ├── button.tsx
│   ├── dialog.tsx
│   ├── form.tsx
│   └── ... (20+ UI 컴포넌트)
│
├── hooks/                       # Custom React Hooks
│   ├── use-banners.ts           # React Query: 현수막 CRUD
│   ├── use-parties.ts           # React Query: 정당 CRUD
│   ├── use-filters.ts           # 필터 상태 관리
│   ├── use-map.ts               # Kakao Map 통합
│   └── use-toast.ts             # Toast 알림
│
├── store/                       # Zustand Global State
│   ├── banner.store.ts          # 현수막 상태 (선택, 필터)
│   ├── party.store.ts           # 정당 상태
│   └── ui.store.ts              # UI 상태 (다이얼로그, 사이드바)
│
└── contexts/
    └── AuthContext.tsx          # 인증 Context (Supabase Auth)
```

### Backend (🔵 Server-Side)

```
src/
├── app/api/                     # API Routes (REST)
│   ├── auth/
│   │   ├── login-with-temp/route.ts    # POST /api/auth/login-with-temp
│   │   ├── change-password/route.ts    # POST /api/auth/change-password
│   │   └── reset-password/route.ts     # POST /api/auth/reset-password
│   ├── banners/
│   │   ├── route.ts                    # GET, POST /api/banners
│   │   ├── [id]/route.ts               # GET, PUT, DELETE /api/banners/:id
│   │   ├── bulk/route.ts               # POST /api/banners/bulk
│   │   ├── stats/route.ts              # GET /api/banners/stats
│   │   ├── validate-address/route.ts   # POST /api/banners/validate-address
│   │   └── reverse-geocode/route.ts    # POST /api/banners/reverse-geocode
│   ├── parties/
│   │   ├── route.ts                    # GET, POST /api/parties
│   │   ├── [id]/route.ts               # GET, PUT, DELETE /api/parties/:id
│   │   └── stats/route.ts              # GET /api/parties/stats
│   ├── map/
│   │   ├── geocode/route.ts            # POST /api/map/geocode
│   │   └── districts/route.ts          # GET /api/map/districts
│   ├── export/
│   │   ├── excel/route.ts              # POST /api/export/excel
│   │   └── csv/route.ts                # POST /api/export/csv
│   └── health/route.ts                 # GET /api/health
│
├── lib/
│   ├── services/                       # Business Logic Layer
│   │   ├── banner.service.ts           # 현수막 비즈니스 로직
│   │   └── party.service.ts            # 정당 비즈니스 로직
│   │
│   ├── database/                       # Data Access Layer (Supabase)
│   │   ├── supabase.ts                 # Supabase Client 초기화
│   │   ├── banners.service.ts          # 현수막 DB 쿼리
│   │   ├── parties.service.ts          # 정당 DB 쿼리
│   │   └── audit.service.ts            # 감사 로그 DB 쿼리
│   │
│   ├── storage/                        # File Storage Layer
│   │   ├── supabase-storage.service.ts # Supabase Storage 업로드
│   │   └── image.service.ts            # 이미지 처리
│   │
│   ├── map/                            # External API Integration
│   │   ├── kakao.service.ts            # Kakao Map API Client
│   │   ├── geocoding.service.ts        # 주소 ↔ 좌표 변환
│   │   └── administrative.service.ts   # 행정구역 추출
│   │
│   ├── validations/                    # Zod Schemas
│   │   ├── banner.schema.ts            # 현수막 검증 스키마
│   │   ├── party.schema.ts             # 정당 검증 스키마
│   │   └── common.schema.ts            # 공통 스키마
│   │
│   └── utils/                          # Utility Functions
│       ├── utils.ts                    # cn() 등
│       └── placeholder.ts              # 플레이스홀더 생성
│
└── types/                              # TypeScript Types (Shared)
    ├── banner.ts                       # Banner, BannerFormData
    ├── party.ts                        # Party, PartyFormData
    ├── auth.ts                         # User, AuthState
    └── api.ts                          # ApiResponse, ApiError
```

---

## 데이터 플로우

### 1. 현수막 생성 플로우

```
[User Input (Form)]
      ↓
[React Hook Form + Zod Validation]
      ↓
[useBanners().create()]  ← Frontend Hook (TanStack Query)
      ↓
[POST /api/banners]      ← API Route
      ↓
[BannerService.create()] ← Business Logic
      ↓
┌─────────────────────────────────────────┐
│ 1. Validate Input (Zod)                 │
│ 2. Geocode Address (Kakao API)          │
│ 3. Upload Image (Supabase Storage)      │
│ 4. Insert to DB (BannersService)        │
│ 5. Log Audit (AuditService)             │
└─────────────────────────────────────────┘
      ↓
[Supabase PostgreSQL]
      ↓
[React Query Cache Invalidation]
      ↓
[UI Update (Re-fetch)]
```

### 2. 지도 렌더링 플로우

```
[page.tsx]
      ↓
[KakaoMap Component] ← Client Component
      ↓
┌─────────────────────────────────────────┐
│ useEffect(() => {                        │
│   1. Load Kakao Maps SDK                │
│   2. Initialize Map                     │
│   3. Fetch Banners (useBanners())       │
│   4. Create Markers (by party color)    │
│   5. Add Click Listeners                │
│ })                                       │
└─────────────────────────────────────────┘
      ↓
[Kakao Maps API]
      ↓
[Marker Clustering (Optional)]
```

---

## 주요 컴포넌트

### 1. KakaoMap (`features/map/components/KakaoMap.tsx`)
**책임**: Kakao Map 초기화, 마커 렌더링, 클릭 이벤트

```typescript
'use client';

export function KakaoMap({ banners, onMarkerClick }) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.kakao) return;

    const map = new window.kakao.maps.Map(mapRef.current, {
      center: new window.kakao.maps.LatLng(37.5172, 127.0473),
      level: 5,
    });

    banners.forEach(banner => {
      const marker = new window.kakao.maps.Marker({
        position: new window.kakao.maps.LatLng(banner.lat, banner.lng),
        map: map,
      });

      marker.addListener('click', () => onMarkerClick(banner));
    });
  }, [banners]);

  return <div ref={mapRef} style={{ width: '100%', height: '600px' }} />;
}
```

### 2. BannerService (`lib/services/banner.service.ts`)
**책임**: 현수막 생성/수정/삭제 비즈니스 로직

```typescript
export class BannerService {
  static async create(data: BannerCreateInput): Promise<Banner> {
    // 1. Validate
    const validated = bannerCreateSchema.parse(data);

    // 2. Geocode
    const { lat, lng, district } = await GeocodingService.addressToCoords(
      validated.address
    );

    // 3. Upload Image
    let imageUrl: string | null = null;
    if (validated.image) {
      imageUrl = await SupabaseStorageService.uploadImage(validated.image);
    }

    // 4. Insert to DB
    const banner = await BannersService.create({
      ...validated,
      lat,
      lng,
      district,
      image_url: imageUrl,
    });

    // 5. Audit Log
    await AuditService.log('banner_created', banner.id);

    return banner;
  }
}
```

### 3. useBanners Hook (`hooks/use-banners.ts`)
**책임**: React Query로 현수막 CRUD, 캐싱, 낙관적 업데이트

```typescript
export function useBanners() {
  const queryClient = useQueryClient();

  const { data: banners = [] } = useQuery({
    queryKey: ['banners'],
    queryFn: async () => {
      const res = await fetch('/api/banners');
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: BannerFormData) => {
      const res = await fetch('/api/banners', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] });
    },
  });

  return {
    banners,
    create: createMutation.mutate,
    isCreating: createMutation.isPending,
  };
}
```

---

## API 설계

### REST API Convention

- **Base URL**: `/api/`
- **Content-Type**: `application/json`
- **Error Format**:
  ```json
  {
    "error": "Error message",
    "details": { /* optional */ }
  }
  ```

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| **Banners** |
| `GET` | `/api/banners` | 현수막 목록 (필터링 지원) |
| `POST` | `/api/banners` | 현수막 생성 |
| `GET` | `/api/banners/:id` | 현수막 상세 |
| `PUT` | `/api/banners/:id` | 현수막 수정 |
| `DELETE` | `/api/banners/:id` | 현수막 삭제 |
| `GET` | `/api/banners/stats` | 통계 (정당별, 구역별) |
| `POST` | `/api/banners/bulk` | 대량 생성 |
| **Parties** |
| `GET` | `/api/parties` | 정당 목록 |
| `POST` | `/api/parties` | 정당 생성 |
| `PUT` | `/api/parties/:id` | 정당 수정 |
| `DELETE` | `/api/parties/:id` | 정당 삭제 |
| **Map** |
| `POST` | `/api/map/geocode` | 주소 → 좌표 변환 |
| `GET` | `/api/map/districts` | 행정구역 목록 |
| **Export** |
| `POST` | `/api/export/excel` | 엑셀 다운로드 |
| `POST` | `/api/export/csv` | CSV 다운로드 |

---

## 데이터베이스 스키마

### ERD

```
┌─────────────────────┐
│      parties        │
├─────────────────────┤
│ id (PK)             │
│ name                │
│ color               │
│ marker_icon_url     │
│ is_active           │
│ created_at          │
│ updated_at          │
└─────────────────────┘
         │
         │ 1:N
         │
         ▼
┌─────────────────────┐
│      banners        │
├─────────────────────┤
│ id (PK)             │
│ party_id (FK)       │───┐
│ address             │   │
│ lat                 │   │
│ lng                 │   │
│ district            │   │
│ text                │   │
│ image_url           │   │
│ start_date          │   │
│ end_date            │   │
│ memo                │   │
│ created_at          │   │
│ updated_at          │   │
└─────────────────────┘   │
                          │
                          │
         ┌────────────────┘
         │
         ▼
┌─────────────────────┐
│    audit_logs       │
├─────────────────────┤
│ id (PK)             │
│ action              │
│ table_name          │
│ record_id           │
│ user_id             │
│ created_at          │
└─────────────────────┘
```

### Tables

#### `parties`
```sql
CREATE TABLE parties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL,  -- HEX color (e.g., "#FF0000")
  marker_icon_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `banners`
```sql
CREATE TABLE banners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  party_id UUID REFERENCES parties(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  lat FLOAT NOT NULL,
  lng FLOAT NOT NULL,
  district TEXT,  -- e.g., "서울특별시 강남구"
  text TEXT,      -- 현수막 내용
  image_url TEXT,
  start_date DATE,
  end_date DATE,
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_banners_party_id ON banners(party_id);
CREATE INDEX idx_banners_location ON banners(lat, lng);
CREATE INDEX idx_banners_dates ON banners(start_date, end_date);
```

---

## 상태 관리

### 1. Server State (TanStack Query)
- **용도**: API 데이터 캐싱, 자동 리페칭
- **관리 대상**: banners, parties
- **캐시 전략**:
  - `staleTime: 5분` (5분간 캐시 유효)
  - `cacheTime: 10분` (10분 후 메모리 제거)

### 2. Global State (Zustand)
- **용도**: UI 상태, 필터 상태
- **스토어**:
  - `useBannerStore`: 선택된 현수막, 필터 조건
  - `usePartyStore`: 선택된 정당
  - `useUIStore`: 다이얼로그, 사이드바 열림/닫힘

### 3. Context API
- **용도**: 인증 상태 (Supabase Auth)
- **Context**: `AuthContext` (user, session, signOut)

---

## 보안 고려사항

### 1. RLS (Row Level Security)
Supabase에서 RLS 정책으로 데이터 접근 제어:
```sql
-- 예시: 로그인한 사용자만 현수막 수정 가능
CREATE POLICY "Authenticated users can update banners"
ON banners FOR UPDATE
USING (auth.role() = 'authenticated');
```

### 2. Input Validation
- **Frontend**: React Hook Form + Zod
- **Backend**: Zod Schema (API Routes에서 재검증)

### 3. Environment Variables
- `.env.local`: 로컬 개발용
- `.env.production`: 프로덕션 배포용
- **절대 커밋하지 않음** (`.gitignore`에 포함)

---

## 배포 아키텍처

### Vercel 배포 (권장)
```
GitHub Repository
      ↓
Vercel Auto Deploy
      ↓
CDN (Edge Network)
      ↓
Users
```

### Docker 배포 (GCP/AWS)
```
Docker Image Build
      ↓
Container Registry (GCR/ECR)
      ↓
GCP Compute Engine / AWS EC2
      ↓
Nginx Reverse Proxy (Optional)
      ↓
Users
```

---

**Last Updated**: 2025-12-11
**Maintained by**: Banner Gangnam Team
