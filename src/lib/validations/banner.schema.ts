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

// Banner type schema
const bannerTypeSchema = z.enum(['political', 'public', 'rally'], {
  message: '올바른 배너 유형을 선택하세요.',
});

// Department schema
const departmentSchema = z
  .string()
  .min(1, '부서명은 필수입니다.')
  .max(100, '부서명은 100자 이하이어야 합니다.')
  .trim();

// Optional date schema
const optionalDateSchema = z
  .string()
  .refine((date) => !isNaN(Date.parse(date)), '올바른 날짜를 입력하세요.')
  .optional()
  .nullable();

// Required date schema
const requiredDateSchema = z
  .string()
  .refine((date) => !isNaN(Date.parse(date)), '올바른 날짜를 입력하세요.');

// Political banner create schema (base object without refine)
const politicalBannerCreateSchemaBase = z.object({
  banner_type: z.literal('political').optional().default('political'),
  party_id: uuidSchema,
  address: addressSchema,
  text: z
    .string()
    .min(1, '필수 문구를 입력하세요.')
    .max(200, '문구는 200자 이하이어야 합니다.')
    .trim(),
  start_date: requiredDateSchema,
  end_date: requiredDateSchema,
  memo: z
    .string()
    .max(500, '메모는 500자 이하이어야 합니다.')
    .optional(),
  is_active: z.boolean().optional().default(true),
});

// Public banner create schema (base object without refine)
const publicBannerCreateSchemaBase = z.object({
  banner_type: z.literal('public'),
  department: departmentSchema,
  address: addressSchema,
  text: z
    .string()
    .min(1, '필수 문구를 입력하세요.')
    .max(200, '문구는 200자 이하이어야 합니다.')
    .trim(),
  start_date: optionalDateSchema,
  end_date: optionalDateSchema,
  memo: z
    .string()
    .max(500, '메모는 500자 이하이어야 합니다.')
    .optional(),
  is_active: z.boolean().optional().default(true),
});

// Rally banner create schema (base object without refine)
const rallyBannerCreateSchemaBase = z.object({
  banner_type: z.literal('rally'),
  address: addressSchema,
  text: z
    .string()
    .min(1, '필수 문구를 입력하세요.')
    .max(200, '문구는 200자 이하이어야 합니다.')
    .trim(),
  start_date: optionalDateSchema,
  end_date: optionalDateSchema,
  memo: z
    .string()
    .max(500, '메모는 500자 이하이어야 합니다.')
    .optional(),
  is_active: z.boolean().optional().default(true),
});

// Discriminated union for banner create (without refine)
const bannerCreateSchemaBase = z.discriminatedUnion('banner_type', [
  politicalBannerCreateSchemaBase,
  publicBannerCreateSchemaBase,
  rallyBannerCreateSchemaBase,
]);

// Per-type schemas with date refinement
export const politicalBannerCreateSchema = politicalBannerCreateSchemaBase.refine((data) => {
  return new Date(data.start_date) <= new Date(data.end_date);
}, {
  message: '종료일은 시작일보다 빠를 수 없습니다.',
  path: ['end_date'],
});

export const publicBannerCreateSchema = publicBannerCreateSchemaBase.refine((data) => {
  if (!data.start_date || !data.end_date) return true;
  return new Date(data.start_date) <= new Date(data.end_date);
}, {
  message: '종료일은 시작일보다 빠를 수 없습니다.',
  path: ['end_date'],
});

export const rallyBannerCreateSchema = rallyBannerCreateSchemaBase.refine((data) => {
  if (!data.start_date || !data.end_date) return true;
  return new Date(data.start_date) <= new Date(data.end_date);
}, {
  message: '종료일은 시작일보다 빠를 수 없습니다.',
  path: ['end_date'],
});

// Apply date validation refinement after the union
export const bannerCreateSchema = bannerCreateSchemaBase.refine((data) => {
  // Skip validation if dates are not provided (for public/rally)
  if (!data.start_date || !data.end_date) return true;
  return new Date(data.start_date) <= new Date(data.end_date);
}, {
  message: '종료일은 시작일보다 빠를 수 없습니다.',
  path: ['end_date'],
});

export const bannerUpdateSchema = z.object({
  banner_type: bannerTypeSchema.optional(),
  party_id: uuidSchema.nullable().optional(),
  department: departmentSchema.nullable().optional(),
  address: addressSchema.optional(),
  text: z
    .string()
    .min(1, '필수 문구를 입력하세요.')
    .max(200, '문구는 200자 이하이어야 합니다.')
    .trim()
    .optional(),
  start_date: optionalDateSchema,
  end_date: optionalDateSchema,
  memo: z
    .string()
    .max(500, '메모는 500자 이하이어야 합니다.')
    .nullable()
    .optional(),
  is_active: z.boolean().optional(),
}).refine((data) => {
  if (data.start_date && data.end_date) {
    return new Date(data.start_date) <= new Date(data.end_date);
  }
  return true;
}, {
  message: '종료일은 시작일보다 빠를 수 없습니다.',
  path: ['end_date'],
});

// Form schema is same as create schema for now
export const bannerFormSchema = bannerCreateSchema;

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
  banner_ids: z.array(uuidSchema).min(1, '최소 1개의 배너를 선택해야 합니다.'),
  updates: z.object({
    is_active: z.boolean().optional(),
    party_id: uuidSchema.optional(),
  }),
});

export const bannerBulkDeleteSchema = z.object({
  banner_ids: z.array(uuidSchema).min(1, '최소 1개의 배너를 선택해야 합니다.'),
});

// Export schemas
export const bannerExportSchema = z.object({
  format: z.enum(['csv', 'excel'], { message: '지원되는 형식: csv, excel' }),
  filters: bannerFilterSchema.optional(),
  columns: z.array(z.string()).optional(),
});

// Type exports for use in components
export type PoliticalBannerCreateInput = z.infer<typeof politicalBannerCreateSchema>;
export type PublicBannerCreateInput = z.infer<typeof publicBannerCreateSchema>;
export type RallyBannerCreateInput = z.infer<typeof rallyBannerCreateSchema>;
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
