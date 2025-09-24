import { z } from 'zod';
import { colorSchema, filterBaseSchema, paginationSchema, sortSchema } from './common.schema';

// Party validation schemas

export const partyCreateSchema = z.object({
  name: z
    .string()
    .min(1, '정당명은 필수입니다.')
    .max(50, '정당명은 50자 이하여야 합니다.')
    .trim(),
  color: colorSchema,
  marker_icon_url: z
    .string()
    .url('올바른 URL 형식이 아닙니다.')
    .optional(),
  is_active: z.boolean().optional().default(true),
});

export const partyUpdateSchema = z.object({
  name: z
    .string()
    .min(1, '정당명은 필수입니다.')
    .max(50, '정당명은 50자 이하여야 합니다.')
    .trim()
    .optional(),
  color: colorSchema.optional(),
  marker_icon_url: z
    .string()
    .url('올바른 URL 형식이 아닙니다.')
    .nullable()
    .optional(),
  is_active: z.boolean().optional(),
});

export const partyFilterSchema = filterBaseSchema.extend({
  // Additional party-specific filters can be added here
});

export const partyListQuerySchema = z.object({
  filters: partyFilterSchema.optional(),
  sort: sortSchema.optional(),
  pagination: paginationSchema.optional(),
});

// Type exports for use in components
export type PartyCreateInput = z.infer<typeof partyCreateSchema>;
export type PartyUpdateInput = z.infer<typeof partyUpdateSchema>;
export type PartyFilterInput = z.infer<typeof partyFilterSchema>;
export type PartyListQuery = z.infer<typeof partyListQuerySchema>;