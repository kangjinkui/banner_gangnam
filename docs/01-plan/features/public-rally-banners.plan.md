# Plan: 공공/집회 현수막 관리 기능

> Feature: public-rally-banners
> Phase: Plan
> Created: 2026-02-09
> Author: Development Team

## 1. 기능 개요

### 1.1 배경
현재 시스템은 정치 현수막만 관리하고 있으나, 공공기관 현수막과 집회 현수막도 함께 관리할 필요성이 대두되었습니다. 기존 기능과 분리하여 새로운 탭으로 구성하되, 데이터베이스 및 코드 재사용성을 최대화하는 방향으로 설계합니다.

### 1.2 목표
- 공공 현수막(부서명 포함) 관리 기능 추가
- 집회 현수막 관리 기능 추가
- 기존 정치 현수막 기능과 UI상 분리 (별도 탭)
- 공공 현수막만 만료 기능 적용, 집회 현수막은 만료 없음
- 지도/목록/통계/만료 탭으로 구성된 대시보드 제공

### 1.3 범위

#### In Scope
1. **데이터 모델 확장**
   - Banner 테이블에 `banner_type` 컬럼 추가 (political/public/rally)
   - `department` 컬럼 추가 (공공 현수막 전용)
   - `start_date`, `end_date`를 선택 입력으로 변경
   - `party_id`를 nullable로 변경

2. **UI 구성**
   - 최상위 탭: "정치 현수막" / "공공/집회 현수막"
   - 공공/집회 탭 내부: 지도/목록/통계/만료 서브탭
   - 현수막 타입 필터: 공공/집회/모두

3. **기능 차별화**
   - 공공 현수막: 부서명 필수, 만료 기능 있음
   - 집회 현수막: 부서명 없음, 만료 기능 없음
   - 정치 현수막: 기존 기능 유지 (별도 탭)

4. **API 확장**
   - 기존 `/api/banners` 엔드포인트에 `banner_type` 필터 추가
   - 통계 API에 부서별/타입별 통계 추가
   - 만료 조회 시 집회 현수막 자동 제외

#### Out of Scope
- 정치 현수막 기능 변경 (기존 기능 유지)
- 권한 체계 변경 (기존 role-based 권한 유지)
- 외부 시스템 연동

## 2. 요구사항

### 2.1 기능 요구사항

#### FR-1: 현수막 타입 관리
- 3가지 타입 지원: 정치(political), 공공(public), 집회(rally)
- 타입별 필수 필드 검증
  - 정치: party_id 필수
  - 공공: department 필수
  - 집회: 특별 필수 필드 없음

#### FR-2: 공공 현수막 관리
| 필드 | 타입 | 필수 여부 | 설명 |
|-----|------|---------|------|
| banner_type | string | 필수 | 'public' 고정 |
| department | string | 필수 | 부서명 (예: 환경부, 교육청) |
| address | string | 필수 | 설치 주소 |
| administrative_district | string | 자동 | 행정동 (geocoding) |
| lat, lng | number | 자동 | 좌표 (geocoding) |
| text | string | 필수 | 현수막 문구 |
| start_date | date | 선택 | 시작일 |
| end_date | date | 선택 | 종료일 |
| image_url | string | 선택 | 사진 URL |
| memo | string | 선택 | 메모 |

#### FR-3: 집회 현수막 관리
| 필드 | 타입 | 필수 여부 | 설명 |
|-----|------|---------|------|
| banner_type | string | 필수 | 'rally' 고정 |
| address | string | 필수 | 설치 주소 |
| administrative_district | string | 자동 | 행정동 (geocoding) |
| lat, lng | number | 자동 | 좌표 (geocoding) |
| text | string | 필수 | 현수막 문구 |
| start_date | date | 선택 | 시작일 |
| end_date | date | 선택 | 종료일 |
| image_url | string | 선택 | 사진 URL |
| memo | string | 선택 | 메모 |

#### FR-4: 만료 기능 차별화
- 공공 현수막: `end_date` 기준 만료 판정, 만료 탭에 표시
- 집회 현수막: 만료 개념 없음, 만료 탭에 표시 안 됨
- 정치 현수막: 기존 만료 로직 유지

#### FR-5: 지도 시각화
- 타입별 마커 색상 구분
  - 정치: 정당별 색상 (기존 로직)
  - 공공: 녹색 계열
  - 집회: 청색 계열
- 필터에 따른 마커 표시/숨김

#### FR-6: 통계 기능
- 타입별 통계 (정치/공공/집회)
- 부서별 통계 (공공 현수막만)
- 행정동별 통계 (모든 타입)
- 만료 통계 (공공 현수막만)

### 2.2 비기능 요구사항

#### NFR-1: 성능
- 지도 로딩 시간: 3초 이내
- API 응답 시간: 500ms 이내
- 대용량 데이터 처리: 10,000건 이상

#### NFR-2: 확장성
- 향후 다른 타입 추가 용이 (예: 상업 현수막)
- 컬럼 추가로 새로운 속성 확장 가능

#### NFR-3: 유지보수성
- 기존 코드 최대 재사용 (90% 이상)
- 컴포넌트 Props 확장으로 대응
- 타입별 조건부 렌더링 패턴 일관성 유지

#### NFR-4: 호환성
- 기존 정치 현수막 데이터 무손실
- 마이그레이션 자동화
- 롤백 가능한 스키마 변경

## 3. 설계 방향

### 3.1 아키텍처 결정

#### 결정 1: 단일 테이블 vs 별도 테이블
**선택: 단일 테이블 (banners) 확장**

**이유:**
- 핵심 속성 90% 동일 (주소, 좌표, 기간, 문구, 사진, 메모)
- 지도/목록/통계 로직 재사용 가능
- API 통합 용이 (필터링만 추가)
- 참조 무결성 보장
- 유지보수 효율성 (버그 수정 한 곳만)

**트레이드오프:**
- 타입별 특화 필드 추가 시 NULL 값 발생
- 제약조건 복잡도 증가
- → 하지만 코드 재사용성 이득이 더 큼

#### 결정 2: UI 분리 방식
**선택: 최상위 탭 분리 + 공공/집회 통합**

**이유:**
- 정치 현수막은 기존 사용자 경험 유지
- 공공/집회는 유사성이 높아 통합 관리 효율적
- 타입 필터로 세부 구분 가능

### 3.2 기술 스택
- **Database**: Supabase (PostgreSQL) - 기존 유지
- **ORM**: Supabase SDK - 기존 유지
- **Frontend**: Next.js 15, React 19 - 기존 유지
- **State**: Zustand + TanStack Query - 기존 유지
- **Validation**: Zod - 기존 유지

### 3.3 마이그레이션 전략
1. **Phase 1**: 스키마 변경 (banner_type, department 추가)
2. **Phase 2**: 기존 데이터 마이그레이션 (banner_type='political')
3. **Phase 3**: 제약조건 추가 (party_id nullable, 타입별 검증)
4. **Phase 4**: 인덱스 추가 (성능 최적화)

## 4. 데이터 스키마

### 4.1 Banner 테이블 변경

```sql
-- 새 컬럼 추가
ALTER TABLE banners
  ADD COLUMN banner_type TEXT NOT NULL DEFAULT 'political'
    CHECK (banner_type IN ('political', 'public', 'rally')),
  ADD COLUMN department TEXT;

-- 기존 컬럼 nullable 변경
ALTER TABLE banners
  ALTER COLUMN party_id DROP NOT NULL,
  ALTER COLUMN start_date DROP NOT NULL,
  ALTER COLUMN end_date DROP NOT NULL;

-- 제약조건 추가
ALTER TABLE banners
  ADD CONSTRAINT check_political_party
    CHECK (
      (banner_type = 'political' AND party_id IS NOT NULL)
      OR (banner_type IN ('public', 'rally') AND party_id IS NULL)
    ),
  ADD CONSTRAINT check_public_department
    CHECK (
      (banner_type = 'public' AND department IS NOT NULL)
      OR (banner_type IN ('political', 'rally') AND department IS NULL)
    );

-- 인덱스 추가
CREATE INDEX idx_banners_type ON banners(banner_type);
CREATE INDEX idx_banners_department ON banners(department);
```

### 4.2 타입 정의

```typescript
export type BannerType = 'political' | 'public' | 'rally';

export interface Banner {
  banner_type: BannerType;
  party_id: string | null;
  department?: string | null;

  address: string;
  lat: number;
  lng: number;
  administrative_district?: string;

  text: string;
  start_date?: string | null;
  end_date?: string | null;

  image_url?: string;
  memo?: string;
  is_active: boolean;
}
```

## 5. API 설계

### 5.1 엔드포인트 확장

#### GET /api/banners
```typescript
Query Parameters:
- banner_type?: 'political' | 'public' | 'rally' | 'all'
- department?: string
- status?: 'active' | 'expired'
- exclude_rally_expired?: boolean (기본: false)
```

#### POST /api/banners
```typescript
Body (공공 현수막):
{
  banner_type: 'public',
  department: string,
  address: string,
  text: string,
  start_date?: string,
  end_date?: string,
  image_url?: string,
  memo?: string
}

Body (집회 현수막):
{
  banner_type: 'rally',
  address: string,
  text: string,
  start_date?: string,
  end_date?: string,
  image_url?: string,
  memo?: string
}
```

#### GET /api/banners/stats
```typescript
Response:
{
  total: number,
  active: number,
  expired: number,
  by_type: {
    political: number,
    public: number,
    rally: number
  },
  by_department: {
    [department: string]: {
      total: number,
      active: number,
      expired: number
    }
  }
}
```

## 6. UI 구조

### 6.1 페이지 구조
```
/
├── page.tsx                  # 정치 현수막 (기존)
└── public-rally/
    ├── page.tsx              # 공공/집회 대시보드 (신규)
    └── register/
        └── page.tsx          # 공공/집회 등록 폼 (신규)
```

### 6.2 컴포넌트 재사용
| 컴포넌트 | 재사용 방식 | 수정 내용 |
|---------|-----------|----------|
| KakaoMap | Props 확장 | 타입별 마커 색상 |
| BannerCard | Props 확장 | department 표시 추가 |
| BannerDetailDialog | 조건부 렌더링 | 타입별 필드 표시 |
| BannerForm | 복제 후 수정 | 공공/집회 전용 폼 |
| StatsView | Props 확장 | 부서별 통계 추가 |

## 7. 구현 로드맵

### Phase 1: 데이터베이스 (예상 2시간)
- [ ] 마이그레이션 파일 작성
- [ ] 스키마 변경 실행
- [ ] 기존 데이터 마이그레이션
- [ ] RLS 정책 업데이트

### Phase 2: 타입 및 Validation (예상 1시간)
- [ ] TypeScript 타입 수정
- [ ] Zod 스키마 수정
- [ ] 타입별 validation 로직

### Phase 3: Backend API (예상 3시간)
- [ ] Banner Service 확장
- [ ] API 엔드포인트 수정
- [ ] 만료 로직 차별화
- [ ] 통계 API 확장

### Phase 4: Frontend 공통 (예상 2시간)
- [ ] 컴포넌트 Props 확장
- [ ] 조건부 렌더링 추가
- [ ] Store/Hooks 수정

### Phase 5: Frontend 신규 페이지 (예상 4시간)
- [ ] 공공/집회 대시보드
- [ ] 지도/목록/통계/만료 탭
- [ ] 등록 폼
- [ ] 타입 필터 UI

### Phase 6: 테스트 및 QA (예상 2시간)
- [ ] 각 타입 CRUD 테스트
- [ ] 만료 기능 테스트
- [ ] 통계 정확성 검증
- [ ] 권한 테스트

**총 예상 시간: 14시간**

## 8. 리스크 및 대응

### 리스크 1: 기존 데이터 손상
**확률: 낮음 | 영향: 높음**
- **대응**: 마이그레이션 전 전체 백업, 롤백 스크립트 준비

### 리스크 2: 성능 저하
**확률: 중간 | 영향: 중간**
- **대응**: 인덱스 최적화, 쿼리 프로파일링, 페이지네이션 강화

### 리스크 3: UI 혼동
**확률: 중간 | 영향: 낮음**
- **대응**: 타입별 색상 명확히 구분, 사용자 가이드 제공

### 리스크 4: 만료 로직 버그
**확률: 낮음 | 영향: 중간**
- **대응**: 단위 테스트 철저히 작성, 집회 현수막 만료 제외 로직 검증

## 9. 성공 기준

### 정량적 지표
- [ ] 모든 CRUD 기능 정상 동작 (성공률 100%)
- [ ] API 응답 시간 < 500ms
- [ ] 기존 정치 현수막 기능 무결성 유지
- [ ] 단위 테스트 커버리지 > 80%

### 정성적 지표
- [ ] 사용자 UI 혼동 없음
- [ ] 코드 리뷰 승인
- [ ] 만료 기능 차별화 명확함
- [ ] 확장 가능한 구조

## 10. 다음 단계

Plan 승인 후 다음 단계:
1. **Design**: 상세 설계 문서 작성 (`/pdca design public-rally-banners`)
   - 컴포넌트 구조도
   - API 명세서
   - DB ERD
   - 화면 설계서

2. **Do**: 구현 시작
   - Phase 1부터 순차적으로 진행
   - 각 Phase 완료 시 테스트

3. **Check**: Gap 분석
   - 설계 vs 구현 비교
   - 요구사항 충족도 검증

---

**Plan 문서 검토 요청**

이 Plan 문서를 검토하시고, 수정이 필요한 부분이나 추가 고려사항이 있으면 말씀해주세요.
승인하시면 다음 단계인 Design으로 진행하겠습니다.
