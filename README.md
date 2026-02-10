# 🗳️ Banner Gangnam - 정치 현수막 관리 시스템

Next.js 15 기반의 정치 현수막 추적 및 시각화 시스템입니다. Supabase와 Kakao Map API를 활용하여 지도상에서 현수막 위치를 관리합니다.

## 🚀 빠른 시작

### 개발 서버 실행

```bash
npm run dev          # Turbopack으로 개발 서버 시작
npm run build        # 프로덕션 빌드
npm run start        # 프로덕션 서버 시작
npm run lint         # ESLint 실행
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인할 수 있습니다.

### Docker로 실행

```bash
npm run docker:build     # Docker 이미지 빌드
npm run docker:up        # Docker Compose로 실행
npm run docker:down      # 컨테이너 중지
npm run docker:logs      # 로그 확인
npm run docker:rebuild   # 완전 재빌드
```

## 📁 프로젝트 구조

```
banner_gangnam01/
├── src/
│   ├── app/
│   │   ├── api/                  # 🔵 Backend - API Routes
│   │   │   ├── auth/            # 인증 (로그인, 비밀번호 변경)
│   │   │   ├── banners/         # 현수막 CRUD
│   │   │   ├── parties/         # 정당 CRUD
│   │   │   ├── map/             # 지도 (지오코딩, 행정구역)
│   │   │   ├── export/          # 엑셀/CSV 내보내기
│   │   │   └── health/          # 헬스체크
│   │   ├── (frontend)/           # 🟢 Frontend - Pages
│   │   │   ├── profile/         # 프로필 페이지
│   │   │   └── register/        # 회원가입 페이지
│   │   ├── layout.tsx           # Root Layout
│   │   ├── page.tsx             # 홈 페이지 (지도 + 현수막 목록)
│   │   └── providers.tsx        # React Query Provider
│   ├── features/                 # 🟢 Frontend - Feature Modules
│   │   ├── auth/                # 인증 (로그인/비밀번호 찾기)
│   │   ├── banners/             # 현수막 관리
│   │   ├── map/                 # Kakao Map 컴포넌트
│   │   └── parties/             # 정당 관리
│   ├── components/ui/            # 🟢 Frontend - UI Components (shadcn/ui)
│   ├── hooks/                    # 🟢 Frontend - Custom Hooks
│   ├── store/                    # 🟢 Frontend - Zustand Stores
│   ├── contexts/                 # 🟢 Frontend - React Context
│   ├── lib/                      # 🔵 Backend - Business Logic
│   │   ├── database/            # Supabase Database Services
│   │   ├── storage/             # Supabase Storage (이미지 업로드)
│   │   ├── map/                 # Kakao Map API 통합
│   │   ├── services/            # 비즈니스 로직 (현수막, 정당)
│   │   ├── validations/         # Zod 스키마
│   │   └── utils/               # 공통 유틸리티
│   └── types/                    # 🔵🟢 Shared - TypeScript Types
├── public/                       # 정적 파일 (이미지, 아이콘)
├── supabase/                     # Supabase 설정
│   └── migrations/              # DB 마이그레이션 파일
├── .archive/                     # 보관 파일 (개발 문서, 스크립트)
├── Dockerfile                    # Docker 이미지 빌드 설정
├── docker-compose.yml            # Docker Compose 설정
├── CLAUDE.md                     # AI 개발 가이드 (Claude Code용)
└── ARCHITECTURE.md               # 아키텍처 상세 설명
```

## 🛠️ 기술 스택

### Frontend
- **Framework**: Next.js 15 (App Router), React 19
- **Styling**: Tailwind CSS, shadcn/ui, Radix UI
- **State**: Zustand (Global), TanStack Query (Server)
- **Forms**: React Hook Form + Zod
- **Map**: Kakao Map API

### Backend
- **API**: Next.js API Routes (REST)
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Validation**: Zod

### DevOps
- **Container**: Docker, Docker Compose
- **Deployment**: Vercel (Frontend), GCP (옵션)
- **CI/CD**: GitHub Actions (선택적)

## 📚 주요 기능

### 1. 현수막 관리
- ✅ CRUD (생성, 조회, 수정, 삭제)
- ✅ 이미지 업로드 (Supabase Storage)
- ✅ 주소 자동 좌표 변환 (Kakao Geocoding API)
- ✅ 행정구역 자동 추출
- ✅ 기간별 필터링 (설치일, 철거일)

### 2. 정당 관리
- ✅ 정당 등록 및 관리
- ✅ 정당별 색상 및 마커 아이콘 설정
- ✅ 활성화/비활성화 상태 관리

### 3. 지도 시각화
- ✅ Kakao Map 기반 현수막 위치 표시
- ✅ 정당별 색상 마커 클러스터링
- ✅ 상세 정보 팝업

### 4. 데이터 내보내기
- ✅ Excel (.xlsx) 내보내기
- ✅ CSV 내보내기

### 5. 인증 시스템
- ✅ Supabase Auth 기반
- ✅ 이메일/비밀번호 로그인
- ✅ 비밀번호 재설정

## 🔧 환경 변수 설정

`.env.local` 파일을 생성하고 다음 환경 변수를 설정하세요:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Kakao Map API
NEXT_PUBLIC_KAKAO_REST_API_KEY=your-kakao-rest-api-key
NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY=your-kakao-js-key
```

자세한 설정은 `.env.example` 파일을 참고하세요.

## 📖 개발 가이드

### 코드 스타일
- **함수형 프로그래밍** 우선
- **Early Return** 패턴 사용
- **명확한 네이밍** (한글 주석 허용)
- **Props Destructuring** 필수

### 파일 구조 규칙
- **Client Component**: 반드시 `'use client'` 지시어 추가
- **Server Component**: 기본값 (지시어 불필요)
- **API Routes**: `/app/api/` 하위에 위치

### 라이브러리 사용 우선순위
- 날짜: `date-fns`
- 유틸리티: `es-toolkit` (lodash 대신)
- 아이콘: `lucide-react`
- 검증: `zod`

자세한 개발 가이드는 [CLAUDE.md](./CLAUDE.md)와 [ARCHITECTURE.md](./ARCHITECTURE.md)를 참고하세요.

## 📜 라이선스

이 프로젝트는 [`EasyNext`](https://github.com/easynext/easynext)를 사용하여 생성되었습니다.

## 🤝 기여

이슈 및 풀 리퀘스트는 환영합니다.

---

**Made with ❤️ using Next.js + Supabase + Kakao Map**
