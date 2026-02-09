import { z } from 'zod';

// Common validation schemas

export const uuidSchema = z.string().uuid('올바른 UUID 형식이 아닙니다.');

export const colorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, '올바른 색상 코드 형식이 아닙니다. (예: #FF0000)');

export const dateSchema = z
  .string()
  .refine((date) => !isNaN(Date.parse(date)), '올바른 날짜 형식이 아닙니다.');

export const dateRangeSchema = z
  .object({
    start_date: dateSchema,
    end_date: dateSchema,
  })
  .refine((data) => new Date(data.start_date) <= new Date(data.end_date), {
    message: '종료일은 시작일보다 빠를 수 없습니다.',
    path: ['end_date'],
  });

export const coordinatesSchema = z.object({
  lat: z
    .number()
    .min(-90, '위도는 -90 이상이어야 합니다.')
    .max(90, '위도는 90 이하이어야 합니다.'),
  lng: z
    .number()
    .min(-180, '경도는 -180 이상이어야 합니다.')
    .max(180, '경도는 180 이하이어야 합니다.'),
});

export const paginationSchema = z.object({
  page: z.number().int().min(1, '페이지는 1 이상이어야 합니다.').optional().default(1),
  limit: z.number().int().min(1).max(100, '한 번에 최대 100개까지 조회할 수 있습니다.').optional().default(20),
});

export const sortSchema = z.object({
  field: z.string().min(1, '정렬 필드는 필수입니다.'),
  direction: z.enum(['asc', 'desc'], { message: '정렬 방향은 asc 또는 desc여야 합니다.' }),
});

export const filterBaseSchema = z.object({
  search: z.string().max(100, '검색어는 100자 이하이어야 합니다.').optional(),
  is_active: z.boolean().optional(),
});

export const imageFileSchema = z
  .instanceof(File)
  .refine((file) => file.size <= 5 * 1024 * 1024, '이미지 파일은 5MB 이하이어야 합니다.')
  .refine(
    (file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type),
    '지원되는 이미지 형식: JPEG, PNG, WebP'
  );

export const addressSchema = z
  .string()
  .min(5, '주소는 5자 이상이어야 합니다.')
  .max(200, '주소는 200자 이하이어야 합니다.');
