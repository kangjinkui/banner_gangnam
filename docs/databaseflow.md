# 데이터 워크플로우 및 스키마 설계 문서

본 문서는 정당별 현수막 관리 시스템의 **데이터베이스 관점 워크플로우**와  
이에 대응하는 **PostgreSQL 스키마 설계**를 종합하여 정리한 것이다.

---

## 1. 데이터 워크플로우 (DB 관점 요약)

### A. 현수막 등록(Create Banner)
- 입력 → `banners` 테이블 INSERT  
  - 필드: `party_id, address, lat, lng, text, start_date, end_date, image_url, memo`  
- 사전검증: 정당 존재 여부, 날짜 유효성, 좌표 범위  
- 사이드이펙트: `audit_logs` 기록

### B. 정당 관리(Parties CRUD)
- 등록: `parties` INSERT (`name, marker_icon_url, color, is_active`)  
- 수정: `parties` UPDATE (중복 체크, 아이콘 교체 가능)  
- 삭제: 참조 배너 존재 시 `is_active=false` 처리, 없으면 삭제 가능  
- 목록 조회: `parties` SELECT (필터: 활성/비활성)

### C. 지도 표시(Map View)
- `banners` SELECT (뷰포트 범위 + 필터: 정당, 기간)  
- `parties` JOIN으로 색상/아이콘 로딩  
- 기간 상태(예정/진행/만료)는 조회 시 `CURRENT_DATE`로 계산

### D. 관리자 목록(Admin List)
- 조회: `banners` SELECT + 필터(행정동, 정당, 기간, 키워드)  
- 기간 상태 계산: 조회 시점 기준  
- 다운로드: 동일 SELECT 결과를 기반으로 CSV/Excel 파일 생성

### E. 권한 및 보안
- 인증: Supabase Auth 토큰 검증  
- 권한: 관리자만 쓰기/삭제/다운로드 가능, 일반은 읽기만 가능  
- 감사: `audit_logs`에 모든 작업 기록

---

## 2. PostgreSQL 스키마 설계

### 2.1 Parties (정당 정보)
```sql
create table public.parties (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  marker_icon_url  text,
  color            text not null,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  created_by       uuid,
  updated_at       timestamptz,
  updated_by       uuid
);
```

- 활성 정당명에 대해서만 UNIQUE 인덱스 부여  
- `is_active=false` 로 소프트 삭제 처리

### 2.2 Banners (현수막 정보)
```sql
create table public.banners (
  id           uuid primary key default gen_random_uuid(),
  party_id     uuid not null references public.parties(id) on delete restrict,
  address      text not null,
  lat          numeric not null,
  lng          numeric not null,
  text         text not null,
  start_date   date not null,
  end_date     date not null,
  image_url    text not null,
  memo         text,
  created_at   timestamptz not null default now(),
  created_by   uuid,
  updated_at   timestamptz,
  updated_by   uuid,
  constraint banners_lat_chk check (lat >= -90 and lat <= 90),
  constraint banners_lng_chk check (lng >= -180 and lng <= 180),
  constraint banners_date_chk check (start_date <= end_date)
);
```

- 좌표 범위, 기간 유효성 체크 제약 포함  
- 조회 최적화를 위한 인덱스: `(party_id)`, `(lat, lng)`, `(start_date, end_date)`, `(created_at)`

### 2.3 Audit Logs (감사 로그)
```sql
create table public.audit_logs (
  id            bigserial primary key,
  occurred_at   timestamptz not null default now(),
  actor_id      uuid,
  action        text not null,
  target_table  text not null,
  target_id     text,
  ip_addr       inet,
  user_agent    text,
  before_data   jsonb,
  after_data    jsonb
);
```

- 관리자 작업 및 실패 시도 기록  
- 인덱스: `(occurred_at desc)`, `(actor_id)`, `(target_table, target_id)`

### 2.4 View (파생 상태)
```sql
create or replace view public.banner_status_v as
select
  b.*,
  case
    when current_date < b.start_date then 'scheduled'
    when current_date > b.end_date   then 'expired'
    else 'active'
  end as status
from public.banners b;
```

- 현수막의 **예정/진행/만료 상태**를 저장하지 않고 조회 시 계산

---

## 3. 주요 설계 원칙

1. **유저플로우에 명시된 데이터만 테이블에 반영**  
   - 기간 상태, 썸네일 생성 여부 등 파생 데이터는 저장하지 않고 조회 시 계산  
2. **소프트 삭제 정책 적용**  
   - 정당 삭제 시 `is_active=false` 처리, 기존 배너 참조 보존  
3. **일관성 보장**  
   - 트랜잭션으로 배너 INSERT 실패 시 스토리지에 업로드된 이미지 롤백  
4. **보안 및 권한 제어**  
   - RLS 비활성화 (명시 요구사항)  
   - 실제 환경에서는 API/미들웨어에서 권한 체크 수행  
5. **감사 로그 필수화**  
   - 관리자 모든 작업 및 실패 시도 `audit_logs` 기록

---

## 4. 테스트용 더미데이터 예시

```sql
-- Parties
insert into public.parties (id, name, marker_icon_url, color, is_active)
values
  (gen_random_uuid(), '가나당', 'https://example.com/icons/party-a.png', '#E74C3C', true),
  (gen_random_uuid(), '다라마당', 'https://example.com/icons/party-b.png', '#3498DB', true),
  (gen_random_uuid(), '마바사당', null, '#2ECC71', true);

-- Banners
insert into public.banners (party_id, address, lat, lng, text, start_date, end_date, image_url, memo)
select id, '서울특별시 강남구 테헤란로 123', 37.498, 127.027, '현수막 문구 A', current_date - 2, current_date + 5, 'https://example.com/banners/a.jpg', '메모 A'
from public.parties where name = '가나당'
union all
select id, '서울특별시 강남구 학동로 201', 37.516, 127.031, '현수막 문구 B', current_date - 10, current_date - 1, 'https://example.com/banners/b.jpg', '메모 B'
from public.parties where name = '다라마당'
union all
select id, '서울특별시 강남구 논현로 508', 37.511, 127.021, '현수막 문구 C', current_date + 1, current_date + 10, 'https://example.com/banners/c.jpg', '메모 C'
from public.parties where name = '마바사당';

-- Audit logs
insert into public.audit_logs (actor_id, action, target_table, target_id, ip_addr, user_agent, before_data, after_data)
values
  (gen_random_uuid(), 'CREATE', 'parties',
   (select id::text from public.parties where name = '가나당' limit 1),
   '127.0.0.1', 'seed-script', null, jsonb_build_object('name','가나당')),
  (gen_random_uuid(), 'CREATE', 'banners',
   (select id::text from public.banners order by created_at asc limit 1),
   '127.0.0.1', 'seed-script', null, jsonb_build_object('address','서울특별시 강남구 테헤란로 123'));
```

---

# 결론

이 문서는 **유저플로우 기반 데이터 워크플로우**와 **PostgreSQL 스키마**를 종합적으로 설명한다.  
모든 테이블과 제약은 **유저플로우에 등장한 데이터만** 반영했으며,  
파생 상태는 뷰에서 계산하도록 설계하였다.
