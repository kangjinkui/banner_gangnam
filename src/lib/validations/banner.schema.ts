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

// Banner validation schemas

const bannerCreateBaseSchema = z.object({
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

export const bannerCreateSchema = bannerCreateBaseSchema.refine((data) => new Date(data.start_date) <= new Date(data.end_date), {
  message: '종료일은 시작일보다 늦어야 합니다.',
  path: ['end_date'],
});

export const bannerUpdateSchema = z.object({
  party_id: uuidSchema.optional(),
  address: addressSchema.optional(),
  text: z
    .string()
    .min(1, '현수막 문구는 필수입니다.')
    .max(200, '현수막 문구는 200자 이하여야 합니다.')
    .trim()
    .optional(),
  start_date: z.string().refine((date) => !isNaN(Date.parse(date)), '올바른 시작일을 입력하세요.').optional(),
  end_date: z.string().refine((date) => !isNaN(Date.parse(date)), '올바른 종료일을 입력하세요.').optional(),
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

export const bannerFormSchema = bannerCreateBaseSchema.extend({
  image: imageFileSchema.optional(),
}).refine((data) => new Date(data.start_date) <= new Date(data.end_date), {
  message: '종료일은 시작일보다 늦어야 합니다.',
  path: ['end_date'],
});

export const bannerFilterSchema = filterBaseSchema.extend({
  party_id: z.array(uuidSchema).optional(),
  administrative_district: z.array(z.string()).optional(),
  is_expired: z.boolean().optional(),
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

export const bannerListQuerySchema = z.object({
  filters: bannerFilterSchema.optional(),
  sort: sortSchema.optional(),
  pagination: paginationSchema.optional(),
});

export const geocodingRequestSchema = z.object({
  address: addressSchema,
});

export const bannerUploadSchema = z.object({
  image: imageFileSchema,
  banner_id: uuidSchema.optional(),
});

// Bulk operations
export const bannerBulkUpdateSchema = z.object({
  banner_ids: z.array(uuidSchema).min(1, '최소 1개의 현수막을 선택해야 합니다.'),
  updates: z.object({
    is_active: z.boolean().optional(),
    party_id: uuidSchema.optional(),
  }),
});

export const bannerBulkDeleteSchema = z.object({
  banner_ids: z.array(uuidSchema).min(1, '최소 1개의 현수막을 선택해야 합니다.'),
});

// Export schemas
export const bannerExportSchema = z.object({
  format: z.enum(['csv', 'excel'], { message: '지원되는 형식: csv, excel' }),
  filters: bannerFilterSchema.optional(),
  columns: z.array(z.string()).optional(),
});

// Type exports for use in components
export type BannerCreateInput = z.infer<typeof bannerCreateSchema>;
export type BannerUpdateInput = z.infer<typeof bannerUpdateSchema>;
export type BannerFormInput = z.infer<typeof bannerFormSchema>;
export type BannerFilterInput = z.infer<typeof bannerFilterSchema>;
export type BannerListQuery = z.infer<typeof bannerListQuerySchema>;
export type GeocodingRequest = z.infer<typeof geocodingRequestSchema>;
export type BannerUploadInput = z.infer<typeof bannerUploadSchema>;
export type BannerBulkUpdateInput = z.infer<typeof bannerBulkUpdateSchema>;
export type BannerBulkDeleteInput = z.infer<typeof bannerBulkDeleteSchema>;
export type BannerExportInput = z.infer<typeof bannerExportSchema>;