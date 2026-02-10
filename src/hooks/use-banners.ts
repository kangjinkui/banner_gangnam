'use client';

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBannerActions, useBannerStore } from '@/store/banner.store';
import { useNotify } from '@/store/ui.store';
import { BannerWithParty, BannerFormInput, BannerUpdateInput, BannerStats, MapMarker } from '@/types/banner';
import { QueryOptions, ApiResponse } from '@/types';

const QUERY_KEYS = {
  banners: ['banners'] as const,
  banner: (id: string) => ['banners', id] as const,
  bannerStats: ['banners', 'stats'] as const,
  mapMarkers: ['banners', 'markers'] as const,
} as const;

// API functions
const bannerApi = {
  getAll: async (options?: QueryOptions): Promise<{ data: BannerWithParty[]; pagination: any }> => {
    const params = new URLSearchParams();

    if (options?.page) params.set('page', options.page.toString());
    if (options?.limit) params.set('limit', options.limit.toString());
    if (options?.filters?.search) params.set('search', options.filters.search);
    if (options?.filters?.is_active !== undefined) params.set('is_active', options.filters.is_active.toString());
    if (options?.filters?.party_id?.length) params.set('party_ids', options.filters.party_id.join(','));
    if (options?.filters?.administrative_district?.length) params.set('districts', options.filters.administrative_district.join(','));
    if (options?.filters?.date_range?.start_date) params.set('start_date', options.filters.date_range.start_date);
    if (options?.filters?.date_range?.end_date) params.set('end_date', options.filters.date_range.end_date);
    if (options?.filters?.banner_type) {
      const bannerType = Array.isArray(options.filters.banner_type)
        ? options.filters.banner_type.join(',')
        : options.filters.banner_type;
      params.set('banner_type', bannerType);
    }
    if (options?.filters?.department) params.set('department', options.filters.department);
    if (options?.filters?.exclude_rally_expired !== undefined) params.set('exclude_rally_expired', options.filters.exclude_rally_expired.toString());
    if (options?.sort?.field) params.set('sort_field', options.sort.field);
    if (options?.sort?.direction) params.set('sort_direction', options.sort.direction);

    const response = await fetch(`/api/banners?${params}`);
    if (!response.ok) throw new Error('Failed to fetch banners');
    return response.json();
  },

  getByBounds: async (bounds: { north: number; south: number; east: number; west: number }): Promise<{ data: BannerWithParty[] }> => {
    const params = new URLSearchParams();
    params.set('bounds', JSON.stringify(bounds));

    const response = await fetch(`/api/banners?${params}`);
    if (!response.ok) throw new Error('Failed to fetch banners by bounds');
    return response.json();
  },

  getById: async (id: string): Promise<ApiResponse<BannerWithParty>> => {
    const response = await fetch(`/api/banners/${id}`);
    if (!response.ok) throw new Error('Failed to fetch banner');
    return response.json();
  },

  create: async (data: BannerFormInput): Promise<ApiResponse<BannerWithParty>> => {
    const formData = new FormData();

    // Common fields
    formData.append('banner_type', data.banner_type);
    formData.append('address', data.address);
    formData.append('text', data.text);
    if (data.memo) formData.append('memo', data.memo);
    formData.append('is_active', data.is_active?.toString() || 'true');
    if (data.image) formData.append('image', data.image);

    // Type-specific fields
    if (data.banner_type === 'political') {
      formData.append('party_id', data.party_id);
      formData.append('start_date', data.start_date);
      formData.append('end_date', data.end_date);
    } else if (data.banner_type === 'public') {
      formData.append('department', data.department);
      if (data.start_date) formData.append('start_date', data.start_date);
      if (data.end_date) formData.append('end_date', data.end_date);
    } else if (data.banner_type === 'rally') {
      if (data.start_date) formData.append('start_date', data.start_date);
      if (data.end_date) formData.append('end_date', data.end_date);
    }

    const response = await fetch('/api/banners', {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) throw new Error('Failed to create banner');
    return response.json();
  },

  update: async (id: string, data: BannerFormInput): Promise<ApiResponse<BannerWithParty>> => {
    const formData = new FormData();

    // Common fields
    if (data.banner_type) formData.append('banner_type', data.banner_type);
    if (data.address) formData.append('address', data.address);
    if (data.text) formData.append('text', data.text);
    if (data.memo !== undefined) formData.append('memo', data.memo);
    if (data.is_active !== undefined) formData.append('is_active', data.is_active.toString());
    if (data.image) formData.append('image', data.image);

    // Type-specific fields
    if (data.banner_type === 'political') {
      if ('party_id' in data) formData.append('party_id', data.party_id);
      if ('start_date' in data) formData.append('start_date', data.start_date);
      if ('end_date' in data) formData.append('end_date', data.end_date);
    } else if (data.banner_type === 'public') {
      if ('department' in data) formData.append('department', data.department);
      if ('start_date' in data && data.start_date) formData.append('start_date', data.start_date);
      if ('end_date' in data && data.end_date) formData.append('end_date', data.end_date);
    } else if (data.banner_type === 'rally') {
      if ('start_date' in data && data.start_date) formData.append('start_date', data.start_date);
      if ('end_date' in data && data.end_date) formData.append('end_date', data.end_date);
    }

    const response = await fetch(`/api/banners/${id}`, {
      method: 'PUT',
      body: formData,
    });
    if (!response.ok) throw new Error('Failed to update banner');
    return response.json();
  },

  delete: async (id: string, hardDelete = false): Promise<ApiResponse<void>> => {
    const response = await fetch(`/api/banners/${id}?hard=${hardDelete}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete banner');
    return response.json();
  },

  bulkUpdate: async (bannerIds: string[], updates: Partial<BannerUpdateInput>): Promise<ApiResponse<void>> => {
    const response = await fetch('/api/banners/bulk', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ banner_ids: bannerIds, updates }),
    });
    if (!response.ok) throw new Error('Failed to bulk update banners');
    return response.json();
  },

  bulkDelete: async (bannerIds: string[]): Promise<ApiResponse<void>> => {
    const response = await fetch('/api/banners/bulk', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ banner_ids: bannerIds }),
    });
    if (!response.ok) throw new Error('Failed to bulk delete banners');
    return response.json();
  },

  getStats: async (filters?: any): Promise<ApiResponse<BannerStats>> => {
    const params = new URLSearchParams();

    if (filters?.party_id?.length) params.set('party_ids', filters.party_id.join(','));
    if (filters?.administrative_district?.length) params.set('districts', filters.administrative_district.join(','));
    if (filters?.banner_type) params.set('banner_type', filters.banner_type);

    const response = await fetch(`/api/banners/stats?${params}`);
    if (!response.ok) throw new Error('Failed to fetch banner stats');
    return response.json();
  },
};

export function useBanners(options?: QueryOptions) {
  const { setBanners, setLoading, setError, setPagination } = useBannerActions();
  const banners = useBannerStore((state) => state.banners);

  const query = useQuery({
    queryKey: [...QUERY_KEYS.banners, options],
    queryFn: () => bannerApi.getAll(options),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Update store when data changes
  if (query.data) {
    if (query.data.data !== banners) {
      setBanners(query.data.data);
    }
    if (query.data.pagination) {
      setPagination({
        currentPage: query.data.pagination.page,
        totalPages: query.data.pagination.totalPages,
        totalCount: query.data.pagination.total,
        pageSize: options?.limit || 20,
      });
    }
  }

  return {
    data: query.data?.data || banners,
    pagination: query.data?.pagination,
    isLoading: query.isLoading,
    error: query.error?.message,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
}

export function useMapBanners(bounds?: { north: number; south: number; east: number; west: number }) {
  const { setMapMarkers } = useBannerActions();

  const query = useQuery({
    queryKey: [...QUERY_KEYS.mapMarkers, bounds],
    queryFn: () => bounds ? bannerApi.getByBounds(bounds) : bannerApi.getAll(),
    select: (data): MapMarker[] => {
      const now = new Date();
      return data.data.map((banner) => {
        const isExpired = banner.banner_type === 'rally'
          ? false
          : banner.end_date ? new Date(banner.end_date) < now : false;

        return {
          id: banner.id,
          banner_type: banner.banner_type,
          position: { lat: banner.lat, lng: banner.lng },
          party_color: banner.party?.color,
          party_name: banner.party?.name,
          department: banner.department || undefined,
          text: banner.text,
          address: banner.address,
          is_expired: isExpired,
        };
      });
    },
    enabled: true,
    staleTime: 1 * 60 * 1000, // 1 minute for map data
  });

  // Update store when data changes
  if (query.data) {
    setMapMarkers(query.data);
  }

  return {
    markers: query.data || [],
    isLoading: query.isLoading,
    error: query.error?.message,
    refetch: query.refetch,
  };
}

export function useBanner(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.banner(id),
    queryFn: () => bannerApi.getById(id),
    select: (response) => response.data,
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useBannerStats(filters?: any) {
  return useQuery({
    queryKey: [...QUERY_KEYS.bannerStats, filters],
    queryFn: () => bannerApi.getStats(filters),
    select: (response) => response.data,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useCreateBanner() {
  const queryClient = useQueryClient();
  const { addBanner } = useBannerActions();
  const notify = useNotify();

  return useMutation({
    mutationFn: bannerApi.create,
    onSuccess: (response) => {
      if (response.success && response.data) {
        addBanner(response.data);
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.banners });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.bannerStats });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.mapMarkers });
        notify.success('현수막 생성 완료', response.message || '현수막이 성공적으로 생성되었습니다.');
      }
    },
    onError: (error: Error) => {
      notify.error('현수막 생성 실패', error.message);
    },
  });
}

export function useUpdateBanner() {
  const queryClient = useQueryClient();
  const { updateBanner } = useBannerActions();
  const notify = useNotify();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: BannerFormInput }) =>
      bannerApi.update(id, data),
    onSuccess: (response, { id }) => {
      if (response.success && response.data) {
        updateBanner(id, response.data);
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.banners });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.banner(id) });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.bannerStats });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.mapMarkers });
        notify.success('현수막 수정 완료', response.message || '현수막이 성공적으로 수정되었습니다.');
      }
    },
    onError: (error: Error) => {
      notify.error('현수막 수정 실패', error.message);
    },
  });
}

export function useDeleteBanner() {
  const queryClient = useQueryClient();
  const { removeBanner } = useBannerActions();
  const notify = useNotify();

  return useMutation({
    mutationFn: ({ id, hardDelete }: { id: string; hardDelete?: boolean }) =>
      bannerApi.delete(id, hardDelete),
    onSuccess: (response, { id }) => {
      if (response.success) {
        removeBanner(id);
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.banners });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.bannerStats });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.mapMarkers });
        notify.success('현수막 삭제 완료', response.message || '현수막이 성공적으로 삭제되었습니다.');
      }
    },
    onError: (error: Error) => {
      notify.error('현수막 삭제 실패', error.message);
    },
  });
}

export function useBulkUpdateBanners() {
  const queryClient = useQueryClient();
  const notify = useNotify();

  return useMutation({
    mutationFn: ({ bannerIds, updates }: { bannerIds: string[]; updates: Partial<BannerUpdateInput> }) =>
      bannerApi.bulkUpdate(bannerIds, updates),
    onSuccess: (response) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.banners });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.bannerStats });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.mapMarkers });
        notify.success('일괄 수정 완료', response.message);
      }
    },
    onError: (error: Error) => {
      notify.error('일괄 수정 실패', error.message);
    },
  });
}

export function useBulkDeleteBanners() {
  const queryClient = useQueryClient();
  const notify = useNotify();

  return useMutation({
    mutationFn: (bannerIds: string[]) => bannerApi.bulkDelete(bannerIds),
    onSuccess: (response) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.banners });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.bannerStats });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.mapMarkers });
        notify.success('일괄 삭제 완료', response.message);
      }
    },
    onError: (error: Error) => {
      notify.error('일괄 삭제 실패', error.message);
    },
  });
}

// Utility hooks
export function useBannerById(id: string | undefined) {
  const banners = useBannerStore((state) => state.banners);

  return useCallback(() => {
    if (!id || !banners.length) return undefined;
    return banners.find(banner => banner.id === id);
  }, [id, banners]);
}

export function useExpiredBanners() {
  const banners = useBannerStore((state) => state.banners);

  return useCallback(() => {
    const now = new Date();
    return banners.filter(banner => {
      // Rally banners never expire
      if (banner.banner_type === 'rally') return false;
      // Check if end_date exists and is in the past
      return banner.end_date ? new Date(banner.end_date) < now : false;
    });
  }, [banners]);
}