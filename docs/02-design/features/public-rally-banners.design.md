# Design: 공공/집회 현수막 관리 기능

> Feature: public-rally-banners
> Phase: Design
> Created: 2026-02-09
> Based on Plan: docs/01-plan/features/public-rally-banners.plan.md

## 목차
1. [시스템 아키텍처](#1-시스템-아키텍처)
2. [데이터베이스 설계](#2-데이터베이스-설계)
3. [API 명세](#3-api-명세)
4. [타입 및 스키마 설계](#4-타입-및-스키마-설계)
5. [컴포넌트 설계](#5-컴포넌트-설계)
6. [화면 설계](#6-화면-설계)
7. [상태 관리](#7-상태-관리)
8. [비즈니스 로직](#8-비즈니스-로직)
9. [구현 순서](#9-구현-순서)

---

## 1. 시스템 아키텍처

### 1.1 전체 구조

```
┌─────────────────────────────────────────────────────────┐
│                   프론트엔드 (Next.js 15)                  │
├─────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  정치 현수막    │  │ 공공/집회    │  │   사용자      │  │
│  │   (기존)       │  │  현수막       │  │   관리        │  │
│  │               │  │  (신규)       │  │              │  │
│  └───────┬───────┘  └──────┬───────┘  └──────────────┘  │
│          │                 │                             │
│  ┌───────┴─────────────────┴────────────────────────┐   │
│  │         공통 컴포넌트 (재사용)                    │   │
│  │   KakaoMap | BannerCard | StatsView | ...      │   │
│  └───────────────────────────┬──────────────────────┘   │
└────────────────────────────────┼────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │   API Routes (Next.js) │
                    │   /api/banners         │
                    │   /api/parties         │
                    │   /api/map             │
                    └───────────┬────────────┘
                                │
                ┌───────────────┴────────────────┐
                │  Service Layer                 │
                │  ├─ BannerService              │
                │  ├─ GeocodingService           │
                │  ├─ ImageService               │
                │  └─ AuditService               │
                └───────────┬────────────────────┘
                            │
        ┌───────────────────┴─────────────────────┐
        │           Supabase                      │
        │  ├─ PostgreSQL (banners, parties)       │
        │  └─ Storage (images)                    │
        └─────────────────────────────────────────┘
```

### 1.2 레이어별 책임

#### 1.2.1 프론트엔드 (Frontend)
- **페이지 레이어**: 최상위 탭 구조, 라우팅
- **컴포넌트 레이어**: UI 렌더링, 사용자 인터랙션
- **상태 레이어**: Zustand (전역), TanStack Query (서버 상태)

#### 1.2.2 API 레이어
- **검증**: 요청 데이터 validation (Zod)
- **라우팅**: RESTful API 엔드포인트
- **에러 처리**: 표준화된 에러 응답

#### 1.2.3 서비스 레이어
- **비즈니스 로직**: 타입별 로직 분기, 만료 판정
- **외부 연동**: Geocoding, 이미지 업로드
- **트랜잭션**: 복합 작업 처리

#### 1.2.4 데이터 레이어
- **Supabase SDK**: 데이터베이스 CRUD
- **RLS**: Row Level Security 정책
- **스토리지**: 이미지 파일 관리

---

## 2. 데이터베이스 설계

### 2.1 ERD

```
┌─────────────────────────────────────────────────────────┐
│                         parties                         │
├─────────────────────────────────────────────────────────┤
│ id (PK)               UUID                              │
│ name                  TEXT                              │
│ color                 TEXT                              │
│ marker_icon_url       TEXT                              │
│ is_active             BOOLEAN                           │
│ created_at            TIMESTAMP                         │
│ updated_at            TIMESTAMP                         │
└───────────────────────┬─────────────────────────────────┘
                        │ 1
                        │
                        │ N (nullable)
┌───────────────────────┴─────────────────────────────────┐
│                       banners                           │
├─────────────────────────────────────────────────────────┤
│ id (PK)               UUID                              │
│ banner_type 🆕        TEXT ('political'|'public'|'rally')│
│ party_id (FK)         UUID (nullable) 🔄                │
│ department 🆕         TEXT (nullable)                   │
│                                                          │
│ address               TEXT                              │
│ lat                   NUMERIC                           │
│ lng                   NUMERIC                           │
│ administrative_district TEXT                            │
│                                                          │
│ text                  TEXT                              │
│ start_date            DATE (nullable) 🔄                │
│ end_date              DATE (nullable) 🔄                │
│                                                          │
│ image_url             TEXT                              │
│ thumbnail_url         TEXT                              │
│ memo                  TEXT                              │
│ is_active             BOOLEAN                           │
│                                                          │
│ created_at            TIMESTAMP                         │
│ updated_at            TIMESTAMP                         │
└─────────────────────────────────────────────────────────┘

범례:
🆕 신규 컬럼
🔄 수정된 컬럼 (nullable로 변경)
```

### 2.2 마이그레이션 스크립트

#### 2.2.1 마이그레이션 파일: `20260209000000_add_public_rally_banners.sql`

```sql
-- ============================================
-- Migration: Add Public/Rally Banner Support
-- Created: 2026-02-09
-- ============================================

BEGIN;

-- Step 1: 새 컬럼 추가
ALTER TABLE banners
  -- 현수막 타입 추가 (기본값: political)
  ADD COLUMN banner_type TEXT NOT NULL DEFAULT 'political'
    CHECK (banner_type IN ('political', 'public', 'rally')),

  -- 공공 현수막 부서명
  ADD COLUMN department TEXT;

-- Step 2: 기존 컬럼을 nullable로 변경
ALTER TABLE banners
  ALTER COLUMN party_id DROP NOT NULL,
  ALTER COLUMN start_date DROP NOT NULL,
  ALTER COLUMN end_date DROP NOT NULL;

-- Step 3: 기존 데이터 마이그레이션
-- 모든 기존 데이터는 정치 현수막으로 설정 (이미 기본값으로 처리됨)
UPDATE banners SET banner_type = 'political' WHERE banner_type IS NULL;

-- Step 4: 제약조건 추가

-- 정치 현수막은 party_id 필수
ALTER TABLE banners
  ADD CONSTRAINT check_political_party
    CHECK (
      (banner_type = 'political' AND party_id IS NOT NULL)
      OR (banner_type IN ('public', 'rally') AND party_id IS NULL)
    );

-- 공공 현수막은 department 필수
ALTER TABLE banners
  ADD CONSTRAINT check_public_department
    CHECK (
      (banner_type = 'public' AND department IS NOT NULL)
      OR (banner_type IN ('political', 'rally') AND department IS NULL)
    );

-- 기간 validation 수정 (nullable 허용)
ALTER TABLE banners
  DROP CONSTRAINT IF EXISTS check_date_range,
  ADD CONSTRAINT check_date_range
    CHECK (
      (end_date IS NULL)
      OR (start_date IS NOT NULL AND end_date >= start_date)
    );

-- Step 5: 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_banners_type ON banners(banner_type);
CREATE INDEX IF NOT EXISTS idx_banners_department ON banners(department) WHERE department IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_banners_type_active ON banners(banner_type, is_active);

-- Step 6: RLS 정책 업데이트 (기존 정책 유지)
-- 공공/집회 현수막도 동일한 권한 체계 적용
-- 별도의 RLS 변경 불필요 (banner_type과 무관하게 동작)

COMMIT;

-- Rollback 스크립트 (필요 시 사용)
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
```

### 2.3 데이터 무결성 규칙

| 규칙 ID | 규칙 설명 | 제약조건 |
|---------|----------|---------|
| DI-1 | 정치 현수막은 party_id 필수 | check_political_party |
| DI-2 | 공공/집회 현수막은 party_id NULL | check_political_party |
| DI-3 | 공공 현수막은 department 필수 | check_public_department |
| DI-4 | 정치/집회 현수막은 department NULL | check_public_department |
| DI-5 | end_date는 start_date 이후 | check_date_range |
| DI-6 | banner_type은 3가지 값만 허용 | CHECK enum |

---

## 3. API 명세

### 3.1 엔드포인트 목록

| Method | Endpoint | 설명 | 변경 사항 |
|--------|----------|------|----------|
| GET | /api/banners | 현수막 목록 조회 | ✅ Query params 추가 |
| GET | /api/banners/:id | 현수막 상세 조회 | 변경 없음 |
| POST | /api/banners | 현수막 등록 | ✅ Body schema 확장 |
| PATCH | /api/banners/:id | 현수막 수정 | ✅ Body schema 확장 |
| DELETE | /api/banners/:id | 현수막 삭제 | 변경 없음 |
| GET | /api/banners/stats | 통계 조회 | ✅ Response schema 확장 |

### 3.2 상세 API 명세

#### 3.2.1 GET /api/banners - 현수막 목록 조회

**Request Query Parameters**

```typescript
{
  // 기존 파라미터
  party_id?: string[];
  administrative_district?: string[];
  is_active?: boolean;
  is_expired?: boolean;
  search?: string;
  page?: number;
  limit?: number;

  // 🆕 신규 파라미터
  banner_type?: 'political' | 'public' | 'rally' | 'all';  // 타입 필터
  department?: string;                                      // 부서명 필터
  exclude_rally_expired?: boolean;                          // 집회 만료 제외 (기본: false)
}
```

**Response**

```typescript
{
  success: boolean;
  data: BannerWithParty[];  // 타입 확장됨
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
```

**예시 요청**

```bash
# 공공 현수막만 조회
GET /api/banners?banner_type=public

# 특정 부서의 공공 현수막 조회
GET /api/banners?banner_type=public&department=환경부

# 공공+집회 현수막 조회
GET /api/banners?banner_type=public,rally

# 만료된 공공 현수막만 조회 (집회는 제외)
GET /api/banners?banner_type=public&is_expired=true
```

**필터링 로직 (의사코드)**

```typescript
function filterBanners(query) {
  let banners = getAllBanners();

  // banner_type 필터
  if (query.banner_type && query.banner_type !== 'all') {
    const types = query.banner_type.split(',');
    banners = banners.filter(b => types.includes(b.banner_type));
  }

  // department 필터 (공공 현수막만)
  if (query.department) {
    banners = banners.filter(b =>
      b.banner_type === 'public' && b.department === query.department
    );
  }

  // is_expired 필터 (집회 현수막 제외 옵션)
  if (query.is_expired) {
    banners = banners.filter(b => {
      // 집회 현수막은 만료 개념 없음
      if (b.banner_type === 'rally' && query.exclude_rally_expired) {
        return false;
      }
      return isExpired(b);
    });
  }

  return banners;
}
```

#### 3.2.2 POST /api/banners - 현수막 등록

**Request Body (공공 현수막)**

```typescript
{
  banner_type: 'public';
  department: string;       // 필수
  address: string;
  text: string;
  start_date?: string;      // 선택 (ISO 8601)
  end_date?: string;        // 선택
  memo?: string;
  is_active?: boolean;      // 기본: true
  image?: File;             // multipart/form-data
}
```

**Request Body (집회 현수막)**

```typescript
{
  banner_type: 'rally';
  address: string;
  text: string;
  start_date?: string;
  end_date?: string;
  memo?: string;
  is_active?: boolean;
  image?: File;
}
```

**Response**

```typescript
{
  success: boolean;
  data: Banner;
  message?: string;
}
```

**처리 플로우**

```
1. Validation
   ├─ banner_type 검증
   ├─ 타입별 필수 필드 검증
   │  ├─ public: department 필수
   │  └─ rally: 추가 필수 필드 없음
   └─ 기간 검증 (start_date <= end_date)

2. Geocoding
   └─ address → { lat, lng, administrative_district }

3. Image Upload (optional)
   └─ Supabase Storage → image_url, thumbnail_url

4. Database Insert
   ├─ party_id = null (공공/집회)
   └─ Audit Log 기록

5. Response
   └─ 생성된 Banner 반환
```

#### 3.2.3 GET /api/banners/stats - 통계 조회

**Request Query Parameters**

```typescript
{
  banner_type?: 'political' | 'public' | 'rally' | 'all';  // 기본: all
}
```

**Response**

```typescript
{
  success: boolean;
  data: {
    // 기존 통계
    total: number;
    active: number;
    expired: number;

    // 🆕 타입별 통계
    by_type: {
      political: number;
      public: number;
      rally: number;
    };

    // 🆕 부서별 통계 (공공 현수막만)
    by_department: {
      [department: string]: {
        total: number;
        active: number;
        expired: number;  // 공공만 해당
      };
    };

    // 기존 통계 (확장)
    by_party: {
      [party_name: string]: {
        total: number;
        active: number;
        expired: number;
      };
    };

    by_district: {
      [district: string]: {
        total: number;
        by_type: {
          political: number;
          public: number;
          rally: number;
        };
      };
    };
  };
}
```

**통계 계산 로직**

```typescript
function calculateStats(banners: Banner[]) {
  const stats = {
    total: banners.length,
    active: 0,
    expired: 0,
    by_type: { political: 0, public: 0, rally: 0 },
    by_department: {},
    by_party: {},
    by_district: {},
  };

  for (const banner of banners) {
    // 활성/만료 카운트
    if (banner.is_active) stats.active++;
    if (isExpired(banner)) stats.expired++;

    // 타입별 카운트
    stats.by_type[banner.banner_type]++;

    // 부서별 카운트 (공공만)
    if (banner.banner_type === 'public' && banner.department) {
      if (!stats.by_department[banner.department]) {
        stats.by_department[banner.department] = {
          total: 0,
          active: 0,
          expired: 0,
        };
      }
      stats.by_department[banner.department].total++;
      if (banner.is_active) stats.by_department[banner.department].active++;
      if (isExpired(banner)) stats.by_department[banner.department].expired++;
    }

    // 정당별 카운트 (정치만)
    if (banner.banner_type === 'political' && banner.party) {
      // ... 기존 로직
    }

    // 행정동별 카운트 (모든 타입)
    if (banner.administrative_district) {
      if (!stats.by_district[banner.administrative_district]) {
        stats.by_district[banner.administrative_district] = {
          total: 0,
          by_type: { political: 0, public: 0, rally: 0 },
        };
      }
      stats.by_district[banner.administrative_district].total++;
      stats.by_district[banner.administrative_district].by_type[banner.banner_type]++;
    }
  }

  return stats;
}
```

---

## 4. 타입 및 스키마 설계

### 4.1 TypeScript 타입 정의

#### 4.1.1 `src/types/banner.ts` 수정

```typescript
import { BaseEntity, Coordinates, DateRange } from './index';
import { Party } from './party';

// 🆕 현수막 타입 enum
export type BannerType = 'political' | 'public' | 'rally';

// 🔄 Banner 인터페이스 수정
export interface Banner extends BaseEntity {
  banner_type: BannerType;           // 🆕
  party_id: string | null;           // 🔄 nullable
  department?: string | null;        // 🆕 공공 현수막 부서명

  address: string;
  lat: number;
  lng: number;
  administrative_district?: string;

  text: string;
  start_date?: string | null;        // 🔄 nullable
  end_date?: string | null;          // 🔄 nullable

  image_url?: string;
  thumbnail_url?: string;
  memo?: string;
  is_active: boolean;
}

// 🔄 BannerWithParty 수정
export interface BannerWithParty extends Banner {
  party?: Party | null;  // 🔄 nullable (공공/집회는 null)
}

// 🆕 공공 현수막 생성 입력
export interface PublicBannerCreateInput {
  banner_type: 'public';
  department: string;       // 필수
  address: string;
  text: string;
  start_date?: string;      // 선택
  end_date?: string;        // 선택
  memo?: string;
  is_active?: boolean;
}

// 🆕 집회 현수막 생성 입력
export interface RallyBannerCreateInput {
  banner_type: 'rally';
  address: string;
  text: string;
  start_date?: string;
  end_date?: string;
  memo?: string;
  is_active?: boolean;
}

// 🔄 기존 BannerCreateInput (정치 현수막)
export interface PoliticalBannerCreateInput {
  banner_type: 'political';
  party_id: string;         // 필수
  address: string;
  text: string;
  start_date: string;       // 필수
  end_date: string;         // 필수
  memo?: string;
  is_active?: boolean;
}

// 통합 생성 입력 타입
export type BannerCreateInput =
  | PoliticalBannerCreateInput
  | PublicBannerCreateInput
  | RallyBannerCreateInput;

// 🔄 BannerUpdateInput 수정
export interface BannerUpdateInput {
  banner_type?: BannerType;          // 🆕
  party_id?: string | null;          // 🔄
  department?: string | null;        // 🆕
  address?: string;
  text?: string;
  start_date?: string | null;
  end_date?: string | null;
  memo?: string;
  is_active?: boolean;
}

// 🔄 BannerFilterOptions 수정
export interface BannerFilterOptions {
  banner_type?: BannerType | 'all';  // 🆕
  party_id?: string[];
  department?: string;               // 🆕
  administrative_district?: string[];
  is_active?: boolean;
  is_expired?: boolean;
  exclude_rally_expired?: boolean;   // 🆕
  date_range?: DateRange;
  search?: string;
  coordinates?: {
    bounds: {
      north: number;
      south: number;
      east: number;
      west: number;
    };
  };
}

// 🔄 BannerStats 수정
export interface BannerStats {
  total: number;
  active: number;
  expired: number;

  // 🆕 타입별 통계
  by_type: {
    political: number;
    public: number;
    rally: number;
  };

  // 🆕 부서별 통계
  by_department: {
    [department: string]: {
      total: number;
      active: number;
      expired: number;
    };
  };

  // 기존 통계
  by_district: { [district: string]: number };
  by_party: { [party_id: string]: number };
}

// 🔄 MapMarker 수정
export interface MapMarker {
  id: string;
  position: Coordinates;
  banner_type: BannerType;           // 🆕
  party_color?: string;              // 🔄 optional (공공/집회는 없음)
  party_name?: string;               // 🔄 optional
  department?: string;               // 🆕
  text: string;
  address: string;
  is_expired: boolean;
}
```

### 4.2 Zod 스키마 정의

#### 4.2.1 `src/lib/validations/banner.schema.ts` 수정

```typescript
import { z } from 'zod';
import {
  uuidSchema,
  dateRangeSchema,
  coordinatesSchema,
  filterBaseSchema,
  paginationSchema,
  sortSchema,
  imageFileSchema,
  addressSchema
} from './common.schema';

// 🆕 현수막 타입 스키마
const bannerTypeSchema = z.enum(['political', 'public', 'rally'], {
  message: '올바른 현수막 타입을 선택하세요.',
});

// 🆕 부서명 스키마
const departmentSchema = z
  .string()
  .min(1, '부서명은 필수입니다.')
  .max(100, '부서명은 100자 이하여야 합니다.')
  .trim();

// 🆕 선택적 날짜 스키마
const optionalDateSchema = z
  .string()
  .refine((date) => !isNaN(Date.parse(date)), '올바른 날짜를 입력하세요.')
  .optional()
  .nullable();

// 🆕 공공 현수막 생성 스키마
export const publicBannerCreateSchema = z.object({
  banner_type: z.literal('public'),
  department: departmentSchema,
  address: addressSchema,
  text: z
    .string()
    .min(1, '현수막 문구는 필수입니다.')
    .max(200, '현수막 문구는 200자 이하여야 합니다.')
    .trim(),
  start_date: optionalDateSchema,
  end_date: optionalDateSchema,
  memo: z
    .string()
    .max(500, '메모는 500자 이하여야 합니다.')
    .optional(),
  is_active: z.boolean().optional().default(true),
}).refine((data) => {
  // 기간 검증: start_date와 end_date가 모두 있으면 start <= end
  if (data.start_date && data.end_date) {
    return new Date(data.start_date) <= new Date(data.end_date);
  }
  return true;
}, {
  message: '종료일은 시작일보다 늦어야 합니다.',
  path: ['end_date'],
});

// 🆕 집회 현수막 생성 스키마
export const rallyBannerCreateSchema = z.object({
  banner_type: z.literal('rally'),
  address: addressSchema,
  text: z
    .string()
    .min(1, '현수막 문구는 필수입니다.')
    .max(200, '현수막 문구는 200자 이하여야 합니다.')
    .trim(),
  start_date: optionalDateSchema,
  end_date: optionalDateSchema,
  memo: z
    .string()
    .max(500, '메모는 500자 이하여야 합니다.')
    .optional(),
  is_active: z.boolean().optional().default(true),
}).refine((data) => {
  if (data.start_date && data.end_date) {
    return new Date(data.start_date) <= new Date(data.end_date);
  }
  return true;
}, {
  message: '종료일은 시작일보다 늦어야 합니다.',
  path: ['end_date'],
});

// 🔄 기존 정치 현수막 스키마 (날짜 필수 유지)
const politicalBannerCreateBaseSchema = z.object({
  banner_type: z.literal('political').optional().default('political'),
  party_id: uuidSchema,
  address: addressSchema,
  text: z
    .string()
    .min(1, '현수막 문구는 필수입니다.')
    .max(200, '현수막 문구는 200자 이하여야 합니다.')
    .trim(),
  start_date: z.string().refine((date) => !isNaN(Date.parse(date)), '올바른 시작일을 입력하세요.'),
  end_date: z.string().refine((date) => !isNaN(Date.parse(date)), '올바른 종료일을 입력하세요.'),
  memo: z
    .string()
    .max(500, '메모는 500자 이하여야 합니다.')
    .optional(),
  is_active: z.boolean().optional().default(true),
});

export const politicalBannerCreateSchema = politicalBannerCreateBaseSchema.refine(
  (data) => new Date(data.start_date) <= new Date(data.end_date),
  {
    message: '종료일은 시작일보다 늦어야 합니다.',
    path: ['end_date'],
  }
);

// 🆕 통합 생성 스키마 (discriminated union)
export const bannerCreateSchema = z.discriminatedUnion('banner_type', [
  politicalBannerCreateSchema,
  publicBannerCreateSchema,
  rallyBannerCreateSchema,
]);

// 🔄 업데이트 스키마 수정
export const bannerUpdateSchema = z.object({
  banner_type: bannerTypeSchema.optional(),
  party_id: uuidSchema.nullable().optional(),
  department: departmentSchema.nullable().optional(),
  address: addressSchema.optional(),
  text: z
    .string()
    .min(1, '현수막 문구는 필수입니다.')
    .max(200, '현수막 문구는 200자 이하여야 합니다.')
    .trim()
    .optional(),
  start_date: optionalDateSchema,
  end_date: optionalDateSchema,
  memo: z
    .string()
    .max(500, '메모는 500자 이하여야 합니다.')
    .nullable()
    .optional(),
  is_active: z.boolean().optional(),
}).refine((data) => {
  if (data.start_date && data.end_date) {
    return new Date(data.start_date) <= new Date(data.end_date);
  }
  return true;
}, {
  message: '종료일은 시작일보다 늦어야 합니다.',
  path: ['end_date'],
});

// 🔄 필터 스키마 수정
export const bannerFilterSchema = filterBaseSchema.extend({
  banner_type: z.union([bannerTypeSchema, z.literal('all')]).optional(),
  party_id: z.array(uuidSchema).optional(),
  department: z.string().optional(),
  administrative_district: z.array(z.string()).optional(),
  is_expired: z.boolean().optional(),
  exclude_rally_expired: z.boolean().optional().default(false),
  date_range: z.object({
    start_date: z.string().optional(),
    end_date: z.string().optional(),
  }).optional(),
  coordinates: z.object({
    bounds: z.object({
      north: z.number(),
      south: z.number(),
      east: z.number(),
      west: z.number(),
    }),
  }).optional(),
});

// Type exports
export type PoliticalBannerCreateInput = z.infer<typeof politicalBannerCreateSchema>;
export type PublicBannerCreateInput = z.infer<typeof publicBannerCreateSchema>;
export type RallyBannerCreateInput = z.infer<typeof rallyBannerCreateSchema>;
export type BannerCreateInput = z.infer<typeof bannerCreateSchema>;
export type BannerUpdateInput = z.infer<typeof bannerUpdateSchema>;
export type BannerFilterInput = z.infer<typeof bannerFilterSchema>;
```

---

## 5. 컴포넌트 설계

### 5.1 컴포넌트 계층 구조

```
src/
├── app/
│   ├── page.tsx                          # 정치 현수막 (기존)
│   └── public-rally/
│       ├── page.tsx                      # 🆕 공공/집회 대시보드
│       └── register/
│           └── page.tsx                  # 🆕 공공/집회 등록 폼
│
├── features/
│   ├── banners/
│   │   └── components/
│   │       ├── BannerCard.tsx            # 🔄 타입별 표시 추가
│   │       ├── BannerDetailDialog.tsx    # 🔄 조건부 렌더링
│   │       └── PublicRallyBannerForm.tsx # 🆕 공공/집회 전용 폼
│   │
│   └── map/
│       └── components/
│           └── KakaoMap.tsx              # 🔄 타입별 마커 색상
│
└── components/ui/                        # shadcn/ui (변경 없음)
```

### 5.2 주요 컴포넌트 설계

#### 5.2.1 `PublicRallyDashboard` (신규)

**파일**: `src/app/public-rally/page.tsx`

**Props**: 없음 (Page Component)

**State**:
```typescript
{
  activeTab: 'map' | 'list' | 'stats' | 'expired';
  bannerTypeFilter: 'public' | 'rally' | 'all';
  selectedBanner: Banner | null;
}
```

**레이아웃**:
```tsx
<div>
  {/* Header: 최상위 탭 (정치 / 공공집회) */}
  <header>
    <TabNavigation current="public-rally" />
  </header>

  {/* 타입 필터 */}
  <div className="filter-bar">
    <RadioGroup value={bannerTypeFilter}>
      <Radio value="all">모두</Radio>
      <Radio value="public">공공</Radio>
      <Radio value="rally">집회</Radio>
    </RadioGroup>
  </div>

  {/* 서브 탭 네비게이션 */}
  <div className="sub-tabs">
    <Tab active={activeTab === 'map'}>지도</Tab>
    <Tab active={activeTab === 'list'}>목록</Tab>
    <Tab active={activeTab === 'stats'}>통계</Tab>
    <Tab active={activeTab === 'expired'}>만료</Tab>
  </div>

  {/* 콘텐츠 영역 */}
  <main>
    {activeTab === 'map' && <MapView bannerType={bannerTypeFilter} />}
    {activeTab === 'list' && <ListView bannerType={bannerTypeFilter} />}
    {activeTab === 'stats' && <StatsView bannerType={bannerTypeFilter} />}
    {activeTab === 'expired' && <ExpiredView />}
  </main>
</div>
```

**데이터 로딩**:
```typescript
const { data: banners } = useBanners({
  banner_type: bannerTypeFilter,
  is_active: true,
});

const { data: stats } = useBannerStats({
  banner_type: bannerTypeFilter,
});
```

#### 5.2.2 `PublicRallyBannerForm` (신규)

**파일**: `src/features/banners/components/PublicRallyBannerForm.tsx`

**Props**:
```typescript
{
  mode: 'create' | 'edit';
  defaultValues?: Partial<Banner>;
  onSuccess?: (banner: Banner) => void;
}
```

**Form Fields**:
```tsx
<Form>
  {/* 타입 선택 */}
  <RadioGroup name="banner_type">
    <Radio value="public">공공 현수막</Radio>
    <Radio value="rally">집회 현수막</Radio>
  </RadioGroup>

  {/* 조건부: 공공 현수막일 때만 */}
  {bannerType === 'public' && (
    <FormField name="department" label="부서명" required />
  )}

  {/* 공통 필드 */}
  <FormField name="address" label="주소" required />
  <FormField name="text" label="현수막 문구" required />

  {/* 선택 필드 (기간) */}
  <FormField name="start_date" label="시작일" />
  <FormField name="end_date" label="종료일" />

  <FormField name="image" label="사진" type="file" />
  <FormField name="memo" label="메모" type="textarea" />

  <Button type="submit">등록</Button>
</Form>
```

**Validation**:
```typescript
const schema = bannerType === 'public'
  ? publicBannerCreateSchema
  : rallyBannerCreateSchema;

const { handleSubmit } = useForm({
  resolver: zodResolver(schema),
});
```

#### 5.2.3 `BannerCard` 수정

**변경 사항**:
```tsx
// 기존
<BannerCard banner={banner} />

// 수정 후
<BannerCard banner={banner} />

// 내부 렌더링
function BannerCard({ banner }: { banner: BannerWithParty }) {
  return (
    <Card>
      {/* 타입별 배지 */}
      <Badge color={getBannerTypeColor(banner.banner_type)}>
        {getBannerTypeLabel(banner.banner_type)}
      </Badge>

      {/* 조건부: 정당명 (정치만) */}
      {banner.banner_type === 'political' && banner.party && (
        <Badge style={{ backgroundColor: banner.party.color }}>
          {banner.party.name}
        </Badge>
      )}

      {/* 조건부: 부서명 (공공만) */}
      {banner.banner_type === 'public' && banner.department && (
        <span>{banner.department}</span>
      )}

      {/* 공통 필드 */}
      <div>{banner.text}</div>
      <div>{banner.address}</div>

      {/* 만료 표시 (집회는 표시 안 함) */}
      {banner.banner_type !== 'rally' && isExpired(banner) && (
        <Badge variant="destructive">만료</Badge>
      )}
    </Card>
  );
}

// Helper functions
function getBannerTypeColor(type: BannerType): string {
  switch (type) {
    case 'political': return 'gray';
    case 'public': return 'green';
    case 'rally': return 'blue';
  }
}

function getBannerTypeLabel(type: BannerType): string {
  switch (type) {
    case 'political': return '정치';
    case 'public': return '공공';
    case 'rally': return '집회';
  }
}
```

#### 5.2.4 `KakaoMap` 수정

**변경 사항**:

```typescript
// Props 확장
interface KakaoMapProps {
  banners: BannerWithParty[];
  bannerTypeFilter?: BannerType | 'all';  // 🆕
  onMarkerClick?: (banner: Banner) => void;
}

// 마커 색상 로직 수정
function getMarkerColor(banner: BannerWithParty): string {
  switch (banner.banner_type) {
    case 'political':
      // 기존 로직: 정당 색상 사용
      return banner.party?.color || '#999';

    case 'public':
      // 공공: 녹색 계열
      return '#10B981';  // green-500

    case 'rally':
      // 집회: 청색 계열
      return '#3B82F6';  // blue-500
  }
}

// 마커 생성
const marker = new kakao.maps.Marker({
  position: new kakao.maps.LatLng(banner.lat, banner.lng),
  map: map,
  image: createMarkerImage(getMarkerColor(banner)),
});
```

#### 5.2.5 `ExpiredView` 수정

**변경 사항**:

```typescript
// 만료 판정 로직 (집회 제외)
function ExpiredView() {
  const allBanners = useBanners({
    banner_type: 'public,rally',  // 정치는 기존 페이지에서 처리
  });

  // 🔄 집회 현수막은 만료 개념 없음
  const expiredBanners = allBanners.filter(banner => {
    // 집회는 제외
    if (banner.banner_type === 'rally') {
      return false;
    }

    // 공공 현수막만 만료 판정
    if (!banner.end_date) {
      return false;
    }

    return new Date(banner.end_date) < new Date();
  });

  return (
    <div>
      <h3>만료된 공공 현수막 ({expiredBanners.length})</h3>
      {expiredBanners.map(banner => (
        <BannerCard key={banner.id} banner={banner} />
      ))}
    </div>
  );
}
```

#### 5.2.6 `StatsView` 수정

**변경 사항**:

```tsx
function StatsView({ bannerType }: { bannerType: BannerType | 'all' }) {
  const { data: stats } = useBannerStats({ banner_type: bannerType });

  return (
    <div className="space-y-6">
      {/* 타입별 통계 */}
      <Card>
        <CardHeader>
          <CardTitle>현수막 타입별 통계</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              label="공공"
              value={stats.by_type.public}
              color="green"
            />
            <StatCard
              label="집회"
              value={stats.by_type.rally}
              color="blue"
            />
            <StatCard
              label="정치"
              value={stats.by_type.political}
              color="gray"
            />
          </div>
        </CardContent>
      </Card>

      {/* 부서별 통계 (공공 현수막만) */}
      {bannerType === 'public' || bannerType === 'all' ? (
        <Card>
          <CardHeader>
            <CardTitle>부서별 현수막 통계</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.by_department).map(([dept, data]) => (
                <div key={dept} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="font-medium">{dept}</span>
                  <div className="flex gap-4 text-sm">
                    <span>총 {data.total}개</span>
                    <span className="text-green-600">활성 {data.active}</span>
                    <span className="text-red-600">만료 {data.expired}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* 행정동별 통계 (타입별 세분화) */}
      <Card>
        <CardHeader>
          <CardTitle>행정동별 현수막 분포</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(stats.by_district).map(([district, data]) => (
              <div key={district}>
                <div className="font-medium">{district}</div>
                <div className="flex gap-2 text-sm text-gray-600">
                  <span>공공: {data.by_type.public}</span>
                  <span>집회: {data.by_type.rally}</span>
                  <span>정치: {data.by_type.political}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 6. 화면 설계

### 6.1 화면 흐름도

```
┌─────────────────────────────────────────────────────────┐
│          로그인 화면 (기존)                              │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│          메인 화면 (최상위 탭)                           │
│  ┌─────────────┐  ┌────────────────────┐               │
│  │ 정치 현수막  │  │ 공공/집회 현수막   │               │
│  │   (기존)    │  │     (신규)         │               │
│  └─────────────┘  └────────────────────┘               │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│      공공/집회 현수막 대시보드                           │
│                                                          │
│  [필터]  🟢 공공  🔵 집회  ⚪ 모두                     │
│  ────────────────────────────────────────────────────   │
│  [탭]  지도 | 목록 | 통계 | 만료                        │
│  ────────────────────────────────────────────────────   │
│                                                          │
│  [지도 탭]                                               │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Kakao Map (타입별 마커 색상 구분)                │  │
│  │  - 공공: 녹색                                     │  │
│  │  - 집회: 청색                                     │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  [목록 탭]                                               │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 🔍 검색 | 필터 (부서명, 행정동, 상태)              │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ ┌─ BannerCard ────────────────────────────────┐  │  │
│  │ │ [공공] 환경부 - 환경보호 캠페인              │  │  │
│  │ │ 📍 서울시 강남구 역삼동                       │  │  │
│  │ │ 📅 2026-02-01 ~ 2026-03-01                   │  │  │
│  │ └────────────────────────────────────────────┘  │  │
│  │ ┌─ BannerCard ────────────────────────────────┐  │  │
│  │ │ [집회] 문화예술 축제 안내                     │  │  │
│  │ │ 📍 서울시 서초구 서초동                       │  │  │
│  │ └────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  [통계 탭]                                               │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 📊 타입별 통계                                    │  │
│  │   공공: 45개 | 집회: 23개                         │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ 📊 부서별 통계 (공공만)                           │  │
│  │   환경부: 12개 | 교육청: 8개 | ...                │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ 📊 행정동별 분포                                  │  │
│  │   역삼1동: 공공 5, 집회 3                         │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  [만료 탭]                                               │
│  ┌──────────────────────────────────────────────────┐  │
│  │ ⚠️ 만료된 공공 현수막 (15개)                      │  │
│  │ (집회 현수막은 만료 개념 없음)                     │  │
│  │                                                   │  │
│  │ [공공] 환경부 - ... (만료)                        │  │
│  │ [공공] 교육청 - ... (만료)                        │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│      공공/집회 현수막 등록 폼                            │
│                                                          │
│  ○ 공공 현수막   ○ 집회 현수막                          │
│  ────────────────────────────────────────────────────   │
│                                                          │
│  부서명: [환경부_______]  (공공만 표시)                  │
│  주소:   [서울시 강남구...]                              │
│  문구:   [환경보호 캠페인...]                            │
│  시작일: [2026-02-01]  (선택)                            │
│  종료일: [2026-03-01]  (선택)                            │
│  사진:   [파일 선택]   (선택)                            │
│  메모:   [____________]  (선택)                          │
│                                                          │
│  [ 취소 ]  [ 등록 ]                                     │
└─────────────────────────────────────────────────────────┘
```

### 6.2 와이어프레임 상세

#### 6.2.1 공공/집회 현수막 대시보드

```
┌────────────────────────────────────────────────────────────────┐
│ Header                                                          │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ 🗺️ 현수막관리시스템         [정치] [공공/집회]  👤 User  │   │
│ └──────────────────────────────────────────────────────────┘   │
├────────────────────────────────────────────────────────────────┤
│ Filter Bar                                                      │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ 🔘 모두   🟢 공공   🔵 집회                              │   │
│ │                                      [+ 현수막 등록 버튼] │   │
│ └──────────────────────────────────────────────────────────┘   │
├────────────────────────────────────────────────────────────────┤
│ Sub Tabs                                                        │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ [🗺️ 지도]  [📋 목록]  [📊 통계]  [⚠️ 만료]             │   │
│ └──────────────────────────────────────────────────────────┘   │
├────────────────────────────────────────────────────────────────┤
│ Content Area (탭별 컨텐츠)                                      │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │                                                           │   │
│ │  (지도/목록/통계/만료 탭 내용)                            │   │
│ │                                                           │   │
│ │                                                           │   │
│ │                                                           │   │
│ └──────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

#### 6.2.2 목록 탭 상세

```
┌────────────────────────────────────────────────────────────────┐
│ 검색 및 필터                                                    │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ 🔍 [주소 검색___]  [부서▼]  [행정동▼]  [상태▼]  [검색]  │   │
│ └──────────────────────────────────────────────────────────┘   │
├────────────────────────────────────────────────────────────────┤
│ 현수막 목록 (25개)                        [엑셀 다운로드 📥]   │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ ☐  🖼️  [공공] 환경부 - 환경보호 캠페인                   │   │
│ │        📍 서울시 강남구 역삼동 123-45                     │   │
│ │        📅 2026-02-01 ~ 2026-03-01         [수정] [삭제]   │   │
│ ├──────────────────────────────────────────────────────────┤   │
│ │ ☐  🖼️  [집회] 문화예술 축제 안내                         │   │
│ │        📍 서울시 서초구 서초동 678-90                     │   │
│ │        📅 (기간 없음)                     [수정] [삭제]   │   │
│ ├──────────────────────────────────────────────────────────┤   │
│ │ ☐  🖼️  [공공] 교육청 - 학교 안전 캠페인  [만료]          │   │
│ │        📍 서울시 강남구 논현동 456-78                     │   │
│ │        📅 2026-01-15 ~ 2026-02-05         [수정] [삭제]   │   │
│ └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│ 선택된 항목 (2개): [활성화] [비활성] [삭제]                     │
└────────────────────────────────────────────────────────────────┘
```

#### 6.2.3 통계 탭 상세

```
┌────────────────────────────────────────────────────────────────┐
│ 📊 현수막 타입별 통계                                           │
│ ┌────────────────┬────────────────┬────────────────────────┐   │
│ │ 🟢 공공         │ 🔵 집회         │ ⚪ 정치                │   │
│ │ 45개           │ 23개           │ 67개                   │   │
│ │ 활성: 40       │ 활성: 23       │ 활성: 58               │   │
│ │ 만료: 5        │ (만료 없음)    │ 만료: 9                │   │
│ └────────────────┴────────────────┴────────────────────────┘   │
├────────────────────────────────────────────────────────────────┤
│ 📊 부서별 통계 (공공 현수막만)                                  │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ 환경부          총 12개  활성 10  만료 2                  │   │
│ │ 교육청          총  8개  활성  8  만료 0                  │   │
│ │ 보건소          총  6개  활성  5  만료 1                  │   │
│ │ 문화관광과      총  5개  활성  4  만료 1                  │   │
│ │ 기타            총 14개  활성 13  만료 1                  │   │
│ └──────────────────────────────────────────────────────────┘   │
├────────────────────────────────────────────────────────────────┤
│ 📊 행정동별 현수막 분포                                         │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ 역삼1동  (총 18개)                                        │   │
│ │   🟢 공공 5개  🔵 집회 3개  ⚪ 정치 10개                  │   │
│ ├──────────────────────────────────────────────────────────┤   │
│ │ 서초1동  (총 12개)                                        │   │
│ │   🟢 공공 4개  🔵 집회 2개  ⚪ 정치 6개                   │   │
│ └──────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

#### 6.2.4 만료 탭 상세

```
┌────────────────────────────────────────────────────────────────┐
│ ⚠️ 만료된 공공 현수막 (15개)                                    │
│                                                                 │
│ ℹ️ 집회 현수막은 만료 개념이 없습니다.                           │
├────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ 🖼️  [공공] 환경부 - 환경보호 캠페인  [만료]               │   │
│ │     📍 서울시 강남구 역삼동 123-45                        │   │
│ │     📅 2026-01-01 ~ 2026-02-01 (만료됨)                  │   │
│ │     [재등록] [삭제]                                       │   │
│ ├──────────────────────────────────────────────────────────┤   │
│ │ 🖼️  [공공] 교육청 - 학교 안전 캠페인  [만료]              │   │
│ │     📍 서울시 강남구 논현동 456-78                        │   │
│ │     📅 2026-01-15 ~ 2026-02-05 (만료됨)                  │   │
│ │     [재등록] [삭제]                                       │   │
│ └──────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

---

## 7. 상태 관리

### 7.1 Zustand Store 확장

#### 7.1.1 `src/store/banner.store.ts` 수정

```typescript
import { create } from 'zustand';
import { Banner, BannerWithParty, BannerFilterOptions } from '@/types/banner';

interface BannerState {
  // 기존 상태
  banners: BannerWithParty[];
  selectedBanner: Banner | null;
  filters: BannerFilterOptions;

  // 🆕 공공/집회 필터 상태
  bannerTypeFilter: 'all' | 'public' | 'rally' | 'political';

  // Actions
  setBanners: (banners: BannerWithParty[]) => void;
  addBanner: (banner: BannerWithParty) => void;
  updateBanner: (id: string, updates: Partial<Banner>) => void;
  deleteBanner: (id: string) => void;
  setSelectedBanner: (banner: Banner | null) => void;
  setFilters: (filters: Partial<BannerFilterOptions>) => void;

  // 🆕 타입 필터 액션
  setBannerTypeFilter: (type: 'all' | 'public' | 'rally' | 'political') => void;
}

export const useBannerStore = create<BannerState>((set, get) => ({
  banners: [],
  selectedBanner: null,
  filters: {},
  bannerTypeFilter: 'all',

  setBanners: (banners) => set({ banners }),

  addBanner: (banner) => set((state) => ({
    banners: [...state.banners, banner],
  })),

  updateBanner: (id, updates) => set((state) => ({
    banners: state.banners.map((b) =>
      b.id === id ? { ...b, ...updates } : b
    ),
  })),

  deleteBanner: (id) => set((state) => ({
    banners: state.banners.filter((b) => b.id !== id),
  })),

  setSelectedBanner: (banner) => set({ selectedBanner: banner }),

  setFilters: (filters) => set((state) => ({
    filters: { ...state.filters, ...filters },
  })),

  setBannerTypeFilter: (type) => set({ bannerTypeFilter: type }),
}));

// Selectors
export const useBanners = (filters?: BannerFilterOptions) => {
  const { banners, filters: storeFilters } = useBannerStore();
  const activeFilters = { ...storeFilters, ...filters };

  return banners.filter((banner) => {
    // banner_type 필터
    if (activeFilters.banner_type && activeFilters.banner_type !== 'all') {
      if (banner.banner_type !== activeFilters.banner_type) {
        return false;
      }
    }

    // department 필터
    if (activeFilters.department) {
      if (banner.banner_type !== 'public' || banner.department !== activeFilters.department) {
        return false;
      }
    }

    // is_active 필터
    if (activeFilters.is_active !== undefined) {
      if (banner.is_active !== activeFilters.is_active) {
        return false;
      }
    }

    // is_expired 필터 (집회 제외 옵션)
    if (activeFilters.is_expired) {
      if (banner.banner_type === 'rally' && activeFilters.exclude_rally_expired) {
        return false;
      }
      if (!isExpired(banner)) {
        return false;
      }
    }

    return true;
  });
};

export const useBannerSummary = (bannerType?: 'all' | 'public' | 'rally' | 'political') => {
  const banners = useBanners({ banner_type: bannerType });

  return {
    total: banners.length,
    active: banners.filter((b) => b.is_active).length,
    expired: banners.filter((b) => {
      // 집회는 만료 없음
      if (b.banner_type === 'rally') return false;
      return isExpired(b);
    }).length,
    upcoming: banners.filter((b) => {
      if (!b.start_date) return false;
      return new Date(b.start_date) > new Date();
    }).length,
  };
};

export const useExpiredBanners = (bannerType?: 'public' | 'rally') => {
  const banners = useBanners({ banner_type: bannerType });

  return banners.filter((banner) => {
    // 집회는 만료 없음
    if (banner.banner_type === 'rally') {
      return false;
    }

    // 공공 현수막만 만료 판정
    return isExpired(banner);
  });
};

// Helper
function isExpired(banner: Banner): boolean {
  // 집회 현수막은 만료 없음
  if (banner.banner_type === 'rally') {
    return false;
  }

  if (!banner.end_date) {
    return false;
  }

  return new Date(banner.end_date) < new Date();
}
```

### 7.2 TanStack Query Hooks

#### 7.2.1 `src/hooks/use-banners.ts` 수정

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BannerFilterOptions, BannerCreateInput } from '@/types/banner';

// 🔄 조회 Hook 수정
export function useBanners(filters?: BannerFilterOptions) {
  return useQuery({
    queryKey: ['banners', filters],
    queryFn: async () => {
      const params = new URLSearchParams();

      // 🆕 banner_type 파라미터
      if (filters?.banner_type) {
        params.append('banner_type', filters.banner_type);
      }

      // 🆕 department 파라미터
      if (filters?.department) {
        params.append('department', filters.department);
      }

      // 기존 필터들...
      if (filters?.party_id) {
        params.append('party_id', filters.party_id.join(','));
      }

      const response = await fetch(`/api/banners?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch banners');
      }
      const result = await response.json();
      return result.data;
    },
  });
}

// 🆕 통계 Hook
export function useBannerStats(filters?: { banner_type?: string }) {
  return useQuery({
    queryKey: ['banners', 'stats', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.banner_type) {
        params.append('banner_type', filters.banner_type);
      }

      const response = await fetch(`/api/banners/stats?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      const result = await response.json();
      return result.data;
    },
  });
}

// 🔄 생성 Hook 수정
export function useCreateBanner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: BannerCreateInput) => {
      const formData = new FormData();

      // 🆕 banner_type 포함
      formData.append('banner_type', input.banner_type);

      // 🆕 department (공공만)
      if (input.banner_type === 'public' && 'department' in input) {
        formData.append('department', input.department);
      }

      // 🆕 party_id (정치만)
      if (input.banner_type === 'political' && 'party_id' in input) {
        formData.append('party_id', input.party_id);
      }

      // 공통 필드
      formData.append('address', input.address);
      formData.append('text', input.text);

      if (input.start_date) {
        formData.append('start_date', input.start_date);
      }
      if (input.end_date) {
        formData.append('end_date', input.end_date);
      }

      const response = await fetch('/api/banners', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to create banner');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] });
      queryClient.invalidateQueries({ queryKey: ['banners', 'stats'] });
    },
  });
}
```

---

## 8. 비즈니스 로직

### 8.1 만료 판정 로직

**파일**: `src/lib/services/banner.service.ts`

```typescript
export class BannerService {
  /**
   * 현수막 만료 여부 판정
   * - 집회 현수막: 만료 개념 없음 (항상 false)
   * - 공공/정치 현수막: end_date 기준 판정
   */
  static isExpired(banner: Banner): boolean {
    // 집회 현수막은 만료 없음
    if (banner.banner_type === 'rally') {
      return false;
    }

    // end_date가 없으면 만료 안 됨
    if (!banner.end_date) {
      return false;
    }

    // end_date가 현재보다 과거면 만료
    return new Date(banner.end_date) < new Date();
  }

  /**
   * 타입별 필수 필드 검증
   */
  static validateBannerInput(input: BannerCreateInput): void {
    switch (input.banner_type) {
      case 'political':
        if (!input.party_id) {
          throw new Error('정치 현수막은 정당을 선택해야 합니다.');
        }
        if (!input.start_date || !input.end_date) {
          throw new Error('정치 현수막은 기간을 입력해야 합니다.');
        }
        break;

      case 'public':
        if (!input.department) {
          throw new Error('공공 현수막은 부서명을 입력해야 합니다.');
        }
        break;

      case 'rally':
        // 집회 현수막은 추가 필수 필드 없음
        break;
    }

    // 기간 검증 (둘 다 있을 때만)
    if (input.start_date && input.end_date) {
      if (new Date(input.start_date) > new Date(input.end_date)) {
        throw new Error('종료일은 시작일보다 늦어야 합니다.');
      }
    }
  }

  /**
   * 타입별 마커 색상 반환
   */
  static getMarkerColor(banner: BannerWithParty): string {
    switch (banner.banner_type) {
      case 'political':
        return banner.party?.color || '#9CA3AF';  // gray-400
      case 'public':
        return '#10B981';  // green-500
      case 'rally':
        return '#3B82F6';  // blue-500
      default:
        return '#9CA3AF';
    }
  }

  /**
   * 타입별 라벨 반환
   */
  static getBannerTypeLabel(type: BannerType): string {
    const labels: Record<BannerType, string> = {
      political: '정치',
      public: '공공',
      rally: '집회',
    };
    return labels[type];
  }
}
```

### 8.2 필터링 로직

**파일**: `src/lib/services/banner.service.ts`

```typescript
export class BannerService {
  /**
   * 현수막 필터링
   */
  static filterBanners(
    banners: BannerWithParty[],
    filters: BannerFilterOptions
  ): BannerWithParty[] {
    return banners.filter((banner) => {
      // 타입 필터
      if (filters.banner_type && filters.banner_type !== 'all') {
        if (banner.banner_type !== filters.banner_type) {
          return false;
        }
      }

      // 부서 필터 (공공 현수막만)
      if (filters.department) {
        if (banner.banner_type !== 'public' || banner.department !== filters.department) {
          return false;
        }
      }

      // 정당 필터 (정치 현수막만)
      if (filters.party_id && filters.party_id.length > 0) {
        if (banner.banner_type !== 'political' || !filters.party_id.includes(banner.party_id!)) {
          return false;
        }
      }

      // 행정동 필터
      if (filters.administrative_district && filters.administrative_district.length > 0) {
        if (!banner.administrative_district || !filters.administrative_district.includes(banner.administrative_district)) {
          return false;
        }
      }

      // 활성 상태 필터
      if (filters.is_active !== undefined) {
        if (banner.is_active !== filters.is_active) {
          return false;
        }
      }

      // 만료 필터 (집회 제외 옵션)
      if (filters.is_expired !== undefined) {
        // 집회 현수막은 만료 개념 없음
        if (banner.banner_type === 'rally' && filters.exclude_rally_expired) {
          return false;
        }

        const isExpired = this.isExpired(banner);
        if (isExpired !== filters.is_expired) {
          return false;
        }
      }

      // 검색어 필터
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesAddress = banner.address.toLowerCase().includes(searchLower);
        const matchesText = banner.text.toLowerCase().includes(searchLower);
        const matchesDepartment = banner.department?.toLowerCase().includes(searchLower) || false;

        if (!matchesAddress && !matchesText && !matchesDepartment) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * 통계 계산
   */
  static calculateStats(banners: BannerWithParty[]): BannerStats {
    const stats: BannerStats = {
      total: banners.length,
      active: 0,
      expired: 0,
      by_type: {
        political: 0,
        public: 0,
        rally: 0,
      },
      by_department: {},
      by_district: {},
      by_party: {},
    };

    for (const banner of banners) {
      // 활성/만료 카운트
      if (banner.is_active) {
        stats.active++;
      }

      if (this.isExpired(banner)) {
        stats.expired++;
      }

      // 타입별 카운트
      stats.by_type[banner.banner_type]++;

      // 부서별 카운트 (공공만)
      if (banner.banner_type === 'public' && banner.department) {
        if (!stats.by_department[banner.department]) {
          stats.by_department[banner.department] = {
            total: 0,
            active: 0,
            expired: 0,
          };
        }
        stats.by_department[banner.department].total++;
        if (banner.is_active) {
          stats.by_department[banner.department].active++;
        }
        if (this.isExpired(banner)) {
          stats.by_department[banner.department].expired++;
        }
      }

      // 정당별 카운트 (정치만)
      if (banner.banner_type === 'political' && banner.party) {
        const partyName = banner.party.name;
        if (!stats.by_party[partyName]) {
          stats.by_party[partyName] = 0;
        }
        stats.by_party[partyName]++;
      }

      // 행정동별 카운트 (모든 타입)
      if (banner.administrative_district) {
        if (!stats.by_district[banner.administrative_district]) {
          stats.by_district[banner.administrative_district] = 0;
        }
        stats.by_district[banner.administrative_district]++;
      }
    }

    return stats;
  }
}
```

---

## 9. 구현 순서

### 9.1 Phase 1: 데이터베이스 (2시간)

#### 체크리스트
- [x] 1.1 마이그레이션 파일 작성
  - 파일: `supabase/migrations/20260209000000_add_public_rally_banners.sql`
  - 내용: banner_type, department 컬럼 추가, 제약조건, 인덱스

- [x] 1.2 마이그레이션 실행
  - 명령어: `npx supabase migration up`
  - 검증: 테이블 스키마 확인

- [x] 1.3 기존 데이터 검증
  - 모든 기존 데이터가 `banner_type='political'`로 설정되었는지 확인

- [x] 1.4 제약조건 테스트
  - 정치 현수막: party_id 없이 생성 시도 (실패 예상)
  - 공공 현수막: department 없이 생성 시도 (실패 예상)

**완료 기준**:
- 마이그레이션 성공
- 제약조건 동작 확인
- 기존 데이터 무결성 유지

---

### 9.2 Phase 2: 타입 및 Validation (1시간)

#### 체크리스트
- [x] 2.1 TypeScript 타입 수정
  - 파일: `src/types/banner.ts`
  - 변경: BannerType, Banner, BannerCreateInput 등

- [x] 2.2 Zod 스키마 수정
  - 파일: `src/lib/validations/banner.schema.ts`
  - 변경: publicBannerCreateSchema, rallyBannerCreateSchema 추가

- [x] 2.3 타입 에러 수정
  - 기존 코드에서 발생하는 타입 에러 수정
  - null 가능성 처리 (party_id, start_date, end_date)

**완료 기준**:
- 타입 에러 없음
- Zod 스키마 테스트 통과

---

### 9.3 Phase 3: Backend API (3시간)

#### 체크리스트
- [x] 3.1 BannerService 수정
  - 파일: `src/lib/services/banner.service.ts`
  - 추가: isExpired, validateBannerInput, getMarkerColor

- [x] 3.2 GET /api/banners 수정
  - 파일: `src/app/api/banners/route.ts`
  - 변경: banner_type, department 필터 추가

- [x] 3.3 POST /api/banners 수정
  - 변경: 타입별 validation, department 처리

- [ ] 3.4 PATCH /api/banners/:id 수정
  - 변경: 타입별 필드 업데이트

- [x] 3.5 GET /api/banners/stats 수정
  - 변경: by_type, by_department 통계 추가

**테스트**:
```bash
# 공공 현수막 생성
curl -X POST /api/banners \
  -F "banner_type=public" \
  -F "department=환경부" \
  -F "address=서울시 강남구 역삼동" \
  -F "text=환경보호 캠페인"

# 집회 현수막 생성
curl -X POST /api/banners \
  -F "banner_type=rally" \
  -F "address=서울시 서초구 서초동" \
  -F "text=문화예술 축제"

# 공공 현수막 조회
curl /api/banners?banner_type=public

# 부서별 통계
curl /api/banners/stats?banner_type=public
```

**완료 기준**:
- API 테스트 통과
- 에러 핸들링 동작
- 통계 정확성 검증

---

### 9.4 Phase 4: Frontend 공통 컴포넌트 (2시간)

#### 체크리스트
- [ ] 4.1 BannerCard 수정
  - 파일: `src/features/banners/components/BannerCard.tsx`
  - 변경: 타입별 배지, department 표시

- [ ] 4.2 BannerDetailDialog 수정
  - 변경: 조건부 렌더링 (타입별 필드)

- [ ] 4.3 KakaoMap 수정
  - 파일: `src/features/map/components/KakaoMap.tsx`
  - 변경: getMarkerColor 로직

- [ ] 4.4 Store 수정
  - 파일: `src/store/banner.store.ts`
  - 변경: bannerTypeFilter, selectors

- [ ] 4.5 Hooks 수정
  - 파일: `src/hooks/use-banners.ts`
  - 변경: filters에 banner_type 추가

**완료 기준**:
- 컴포넌트 렌더링 정상
- 타입별 색상 구분 확인
- 필터링 동작 확인

---

### 9.5 Phase 5: Frontend 신규 페이지 (4시간)

#### 체크리스트
- [x] 5.1 공공/집회 대시보드 생성
  - 파일: `src/app/public-rally/page.tsx`
  - 구현: 탭 구조, 타입 필터

- [ ] 5.2 지도 탭 구현
  - 재사용: KakaoMap 컴포넌트
  - 필터: bannerType에 따른 마커 표시

- [ ] 5.3 목록 탭 구현
  - 재사용: BannerCard 컴포넌트
  - 필터: 부서명, 행정동, 상태

- [ ] 5.4 통계 탭 구현
  - 신규: 부서별 통계 카드
  - 재사용: 행정동별 통계

- [ ] 5.5 만료 탭 구현
  - 필터: 공공 현수막만 표시
  - 안내: "집회 현수막은 만료 없음" 메시지

- [x] 5.6 등록 폼 생성
  - 파일: `src/app/public-rally/register/page.tsx`
  - 컴포넌트: PublicRallyBannerForm
  - 조건부: 타입별 필드 표시/숨김

**완료 기준**:
- 모든 탭 정상 동작
- 등록 폼 validation 동작
- 타입별 필터링 정상

---

### 9.6 Phase 6: 테스트 및 QA (2시간)

#### 체크리스트
- [ ] 6.1 CRUD 테스트
  - 공공 현수막: 생성/조회/수정/삭제
  - 집회 현수막: 생성/조회/수정/삭제
  - 정치 현수막: 기존 기능 유지 확인

- [ ] 6.2 만료 기능 테스트
  - 공공 현수막: 만료 탭에 표시
  - 집회 현수막: 만료 탭에 미표시
  - 정치 현수막: 기존 만료 로직 유지

- [ ] 6.3 통계 정확성 검증
  - 타입별 카운트
  - 부서별 카운트
  - 행정동별 카운트

- [ ] 6.4 권한 테스트
  - 비로그인: 조회만 가능
  - 일반 사용자: 조회 + 등록
  - 관리자: 모든 권한

- [ ] 6.5 에러 시나리오 테스트
  - Geocoding 실패
  - 이미지 업로드 실패
  - 네트워크 에러

**완료 기준**:
- 모든 테스트 케이스 통과
- 에러 핸들링 확인
- UX 검증

---

## 10. 검증 및 테스트

### 10.1 단위 테스트 케이스

```typescript
// src/lib/services/__tests__/banner.service.test.ts

describe('BannerService', () => {
  describe('isExpired', () => {
    it('집회 현수막은 항상 만료되지 않음', () => {
      const banner = {
        banner_type: 'rally',
        end_date: '2020-01-01',  // 과거 날짜
      };
      expect(BannerService.isExpired(banner)).toBe(false);
    });

    it('공공 현수막은 end_date 기준 만료 판정', () => {
      const expiredBanner = {
        banner_type: 'public',
        end_date: '2020-01-01',
      };
      expect(BannerService.isExpired(expiredBanner)).toBe(true);

      const activeBanner = {
        banner_type: 'public',
        end_date: '2030-01-01',
      };
      expect(BannerService.isExpired(activeBanner)).toBe(false);
    });

    it('end_date가 없으면 만료 안 됨', () => {
      const banner = {
        banner_type: 'public',
        end_date: null,
      };
      expect(BannerService.isExpired(banner)).toBe(false);
    });
  });

  describe('validateBannerInput', () => {
    it('정치 현수막은 party_id 필수', () => {
      const input = {
        banner_type: 'political',
        address: 'test',
        text: 'test',
      };
      expect(() => BannerService.validateBannerInput(input)).toThrow('정당을 선택');
    });

    it('공공 현수막은 department 필수', () => {
      const input = {
        banner_type: 'public',
        address: 'test',
        text: 'test',
      };
      expect(() => BannerService.validateBannerInput(input)).toThrow('부서명을 입력');
    });

    it('집회 현수막은 추가 필수 필드 없음', () => {
      const input = {
        banner_type: 'rally',
        address: 'test',
        text: 'test',
      };
      expect(() => BannerService.validateBannerInput(input)).not.toThrow();
    });
  });
});
```

### 10.2 통합 테스트 시나리오

| 시나리오 | 기대 결과 |
|---------|----------|
| 공공 현수막 등록 (department 없음) | 400 에러 반환 |
| 집회 현수막 등록 (정상) | 201 생성 성공 |
| 만료된 공공 현수막 조회 | 만료 탭에 표시 |
| 만료된 집회 현수막 조회 | 만료 탭에 미표시 |
| 부서별 통계 조회 | 공공 현수막만 집계 |
| 타입 필터 (공공) | 공공 현수막만 반환 |

---

## 11. 배포 및 모니터링

### 11.1 배포 체크리스트

- [ ] 데이터베이스 백업
- [ ] 마이그레이션 실행 (운영 환경)
- [ ] 기존 데이터 검증
- [ ] 프론트엔드 빌드
- [ ] 캐시 무효화
- [ ] 롤백 계획 준비

### 11.2 모니터링 지표

- API 응답 시간 (<500ms)
- 에러율 (<1%)
- 타입별 생성 수
- 만료 현수막 수 (공공만)

---

**Design 문서 작성 완료**

이 문서를 기반으로 구현을 시작할 수 있습니다.
다음 단계는 `/pdca do public-rally-banners`를 실행하여 구현을 시작하는 것입니다.
