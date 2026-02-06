# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a political banner management system built with Next.js 15, designed to track and visualize political party banners on a map. The system integrates with Supabase for database/storage and Kakao Map API for geocoding and map visualization.

## Development Commands

```bash
# Development
npm run dev          # Start development server with Turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# EasyNext CLI Commands (if needed)
easynext supabase    # Setup Supabase integration
easynext auth        # Setup authentication
```

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **UI**: Tailwind CSS, shadcn/ui, Radix UI components
- **State Management**: Zustand for global state, TanStack Query for server state
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage for image uploads
- **Map**: Kakao Map API for geocoding and visualization
- **Forms**: React Hook Form with Zod validation

### Directory Structure (Frontend/Backend Separated)
```
src/
├── app/
│   ├── api/                     # 🔵 Backend - API Routes
│   │   ├── auth/               # Authentication APIs
│   │   ├── banners/            # Banner CRUD APIs
│   │   ├── parties/            # Party CRUD APIs
│   │   ├── map/                # Geocoding APIs
│   │   └── export/             # Excel/CSV export
│   ├── (frontend)/             # 🟢 Frontend - Pages (Route Group)
│   │   ├── profile/            # Profile page
│   │   └── register/           # Registration page
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Home page (map + table)
│   └── providers.tsx           # React Query Provider
├── features/                    # 🟢 Frontend - Feature modules
│   ├── auth/                   # Login/password reset
│   ├── banners/                # Banner management
│   ├── map/                    # Kakao Map component
│   └── parties/                # Party management
├── components/ui/               # 🟢 Frontend - UI components (shadcn/ui)
├── hooks/                       # 🟢 Frontend - Custom hooks
├── store/                       # 🟢 Frontend - Zustand stores
├── contexts/                    # 🟢 Frontend - React contexts
├── lib/                         # 🔵 Backend - Business logic
│   ├── database/               # Supabase database services
│   ├── storage/                # File upload services
│   ├── map/                    # Kakao Map API integration
│   ├── services/               # Business logic layer
│   ├── validations/            # Zod schemas
│   └── utils/                  # Shared utilities
└── types/                       # 🔵🟢 Shared - TypeScript types
```

### Key Architectural Patterns

1. **Presentation/Business Logic Separation**:
   - UI components in `/components` and `/features/*/components`
   - Business logic in `/lib/services`
   - Data access in `/lib/database`

2. **Feature-based Organization**:
   - Each major feature (parties, banners, map) has its own directory
   - Contains components, hooks, constants, and API functions
   - Follow the pattern: `/features/[featureName]/`

3. **API Layer**:
   - Next.js API routes act as Express-like backend
   - Handle CRUD operations for parties and banners
   - Integrate with Supabase SDK for database operations

## Database Schema

### Tables
- `parties`: Political party information (id, name, marker_icon_url, color, is_active)
- `banners`: Banner records (id, party_id, address, lat, lng, text, start_date, end_date, image_url, memo)
- `audit_logs`: Admin action logging

## Key Development Guidelines

### Client Components
- **Always use `'use client'` directive** for all React components
- Use promise-based params in page.tsx files

### Required Libraries Usage
- `zustand`: Global state management
- `@tanstack/react-query`: Server state and caching
- `react-hook-form` + `zod`: Form handling and validation
- `date-fns`: Date manipulation
- `es-toolkit`: Utility functions over lodash
- `lucide-react`: Icons
- `supabase`: Database and storage operations

### Supabase Integration
- Create migrations for schema changes in `/supabase/migrations/`
- Use Supabase SDK for all database operations
- Store images in Supabase Storage with proper bucket structure

### Map Integration
- Use Kakao Map API for:
  - Address to coordinates conversion (geocoding)
  - Administrative district extraction
  - Map visualization with party-specific markers

### Code Style
- Follow functional programming principles
- Use early returns and descriptive naming
- Prefer composition over inheritance
- Implement proper error handling with graceful degradation
- Write unit tests for business logic, QA sheets for UI components

### Performance Considerations
- Implement map marker clustering for large datasets
- Use virtualization for long admin lists
- Optimize image uploads with thumbnail generation
- Cache geocoding results to reduce API calls

## Common Patterns

### API Route Structure
```typescript
// app/api/banners/route.ts
export async function GET(request: Request) {
  // Validation, business logic, database operations
}

export async function POST(request: Request) {
  // Input validation with Zod
  // Business logic in services layer
  // Database operations
  // Error handling
}
```

### Component with State Management
```typescript
// features/banners/components/BannerForm.tsx
'use client';

import { useBannerStore } from '@/store/banner.store';
import { useBanners } from '@/hooks/use-banners';

export function BannerForm() {
  const { create } = useBanners();
  // Component logic
}
```

### Service Layer Pattern
```typescript
// lib/services/banner.service.ts
export class BannerService {
  static async create(data: BannerCreateInput) {
    // 1. Validate input
    // 2. Geocode address
    // 3. Upload image
    // 4. Save to database
    // 5. Handle rollback on failure
  }
}
```