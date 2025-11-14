## 1. 목적  
정당별 현수막 설치 현황을 **Supabase**에 저장하고, **클로드코드**에서 직접 API 및 프론트엔드(UI) 개발을 진행한다.  
지도 기반으로 현수막 위치와 정보를 시각화하며, 관리자 기능으로 등록·수정·삭제·목록 다운로드를 지원한다.  

---

## 2. 개발 환경  

### 2.1 기술 스택  
- **프론트엔드:** HTML, CSS, JavaScript (React.js)  
- **백엔드/API:** Node.js + Express  
- **데이터베이스:** Supabase (PostgreSQL)  
- **스토리지:** Supabase Storage (사진 업로드)  
- **지도 서비스:** Kakao Map API  
- **배포:** Vercel / Supabase (DB·Storage)

### 2.2 개발 흐름  
1. **프론트엔드(UI)** → React.js로 현수막 등록, 목록, 지도 화면 구현  
2. **백엔드(API)** → Express 서버에서 Supabase SDK로 데이터 CRUD 처리  
3. **DB·Storage 연동** → Supabase에서 현수막/정당 데이터 관리  
4. **지도 시각화** → Kakao Map API에서 정당별 마커 표시

---

## 3. 주요 기능  

### 3.1 정당 관리 (관리자 전용)  
- 정당 등록/수정/삭제  
- 항목: 정당명, 마커 아이콘 URL, 색상 코드  
- 데이터: Supabase `parties` 테이블 저장

### 3.2 현수막 등록  
- 사진 업로드 (Supabase Storage)  
- 위치 입력(주소) → 좌표 변환(Kakao Map Geocoding API)  
- kakao api를 활용해서 주소에서 행정동을 추출한다.(ex삼성1동, 삼성2동, 청담동, 논현1동, 논현2동 등)
- 문구 입력  
- 정당 선택 (드롭다운)  
- 시작일 / 종료일 선택  
- 메모 입력  
- 저장 시 Supabase `banners` 테이블에 기록

### 3.3 지도 표시  
- Supabase에서 현수막 데이터 Fetch  
- Kakao Map API로 정당별 마커 표시  
- 마커 클릭 시 상세 팝업(사진, 문구, 기간, 정당명)

### 3.4 관리자 목록  
- 필터: 행정동, 정당명  
- 표 형태: 위치, 정당, 문구, 시작일/종료일, 사진 썸네일  
- 기간 만료 현수막 하이라이트 표시  
- CSV/Excel 다운로드

---

## 4. 데이터베이스 구조 (Supabase)  

**`parties`** (정당 정보)  
| 필드명 | 타입 | 설명 |
|--------|------|------|
| id | UUID | PK |
| name | text | 정당명 |
| marker_icon_url | text | 마커 아이콘 URL |
| color | text | 지도 표시 색상 |

**`banners`** (현수막 정보)  
| 필드명 | 타입 | 설명 |
|--------|------|------|
| id | UUID | PK |
| party_id | UUID | FK (parties.id) |
| address | text | 설치 주소 |
| lat | numeric | 위도 |
| lng | numeric | 경도 |
| text | text | 현수막 문구 |
| start_date | date | 시작일 |
| end_date | date | 종료일 |
| image_url | text | 현수막 사진 URL |
| memo | text | 메모 |

---

## 5. API 명세  

### 5.1 정당 관리  
- **POST** `/api/parties` → 정당 등록  
- **GET** `/api/parties` → 정당 목록 조회  
- **PUT** `/api/parties/:id` → 정당 수정  
- **DELETE** `/api/parties/:id` → 정당 삭제  

### 5.2 현수막 관리  
- **POST** `/api/banners` → 현수막 등록  
- **GET** `/api/banners` → 현수막 목록 조회 (필터 가능)  
- **PUT** `/api/banners/:id` → 현수막 수정  
- **DELETE** `/api/banners/:id` → 현수막 삭제  

---

## 6. 권한  
| 권한 | 가능 작업 |
|------|-----------|
| 관리자 | 정당 CRUD, 현수막 CRUD, CSV 다운로드 |
| 일반 | 지도 보기, 목록 보기 |

