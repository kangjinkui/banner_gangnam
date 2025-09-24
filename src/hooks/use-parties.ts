'use client';

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePartyActions, usePartyStore } from '@/store/party.store';
import { useNotify } from '@/store/ui.store';
import { Party, PartyCreateInput, PartyUpdateInput } from '@/types/party';
import { QueryOptions, ApiResponse } from '@/types';

const QUERY_KEYS = {
  parties: ['parties'] as const,
  party: (id: string) => ['parties', id] as const,
  partiesWithBanners: ['parties', 'with-banners'] as const,
  partyStats: ['parties', 'stats'] as const,
} as const;

// API functions
const partyApi = {
  getAll: async (options?: QueryOptions): Promise<{ data: Party[]; pagination: any }> => {
    const params = new URLSearchParams();

    if (options?.page) params.set('page', options.page.toString());
    if (options?.limit) params.set('limit', options.limit.toString());
    if (options?.filters?.search) params.set('search', options.filters.search);
    if (options?.filters?.is_active !== undefined) params.set('is_active', options.filters.is_active.toString());
    if (options?.sort?.field) params.set('sort_field', options.sort.field);
    if (options?.sort?.direction) params.set('sort_direction', options.sort.direction);

    const response = await fetch(`/api/parties?${params}`);
    if (!response.ok) throw new Error('Failed to fetch parties');
    return response.json();
  },

  getById: async (id: string): Promise<ApiResponse<Party>> => {
    const response = await fetch(`/api/parties/${id}`);
    if (!response.ok) throw new Error('Failed to fetch party');
    return response.json();
  },

  create: async (data: PartyCreateInput): Promise<ApiResponse<Party>> => {
    const response = await fetch('/api/parties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create party');
    return response.json();
  },

  update: async (id: string, data: PartyUpdateInput): Promise<ApiResponse<Party>> => {
    const response = await fetch(`/api/parties/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update party');
    return response.json();
  },

  delete: async (id: string, hardDelete = false): Promise<ApiResponse<void>> => {
    const response = await fetch(`/api/parties/${id}?hard=${hardDelete}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete party');
    return response.json();
  },

  getStats: async () => {
    const response = await fetch('/api/parties/stats');
    if (!response.ok) throw new Error('Failed to fetch party stats');
    return response.json();
  },
};

export function useParties(options?: QueryOptions) {
  const { setParties, setLoading, setError } = usePartyActions();
  const parties = usePartyStore((state) => state.parties);

  const query = useQuery({
    queryKey: [...QUERY_KEYS.parties, options],
    queryFn: () => partyApi.getAll(options),
    select: (data) => data.data,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update store when data changes
  if (query.data && query.data !== parties) {
    setParties(query.data);
  }

  return {
    data: query.data || parties,
    isLoading: query.isLoading,
    error: query.error?.message,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
}

export function useParty(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.party(id),
    queryFn: () => partyApi.getById(id),
    select: (response) => response.data,
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePartyStats() {
  return useQuery({
    queryKey: QUERY_KEYS.partyStats,
    queryFn: partyApi.getStats,
    select: (response) => response.data,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useCreateParty() {
  const queryClient = useQueryClient();
  const { addParty } = usePartyActions();
  const notify = useNotify();

  return useMutation({
    mutationFn: partyApi.create,
    onSuccess: (response) => {
      if (response.success && response.data) {
        addParty(response.data);
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.parties });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.partyStats });
        notify.success('정당 생성 완료', response.message || '정당이 성공적으로 생성되었습니다.');
      }
    },
    onError: (error: Error) => {
      notify.error('정당 생성 실패', error.message);
    },
  });
}

export function useUpdateParty() {
  const queryClient = useQueryClient();
  const { updateParty } = usePartyActions();
  const notify = useNotify();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PartyUpdateInput }) =>
      partyApi.update(id, data),
    onSuccess: (response, { id }) => {
      if (response.success && response.data) {
        updateParty(id, response.data);
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.parties });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.party(id) });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.partyStats });
        notify.success('정당 수정 완료', response.message || '정당이 성공적으로 수정되었습니다.');
      }
    },
    onError: (error: Error) => {
      notify.error('정당 수정 실패', error.message);
    },
  });
}

export function useDeleteParty() {
  const queryClient = useQueryClient();
  const { removeParty } = usePartyActions();
  const notify = useNotify();

  return useMutation({
    mutationFn: ({ id, hardDelete }: { id: string; hardDelete?: boolean }) =>
      partyApi.delete(id, hardDelete),
    onSuccess: (response, { id }) => {
      if (response.success) {
        removeParty(id);
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.parties });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.partyStats });
        notify.success('정당 삭제 완료', response.message || '정당이 성공적으로 삭제되었습니다.');
      }
    },
    onError: (error: Error) => {
      notify.error('정당 삭제 실패', error.message);
    },
  });
}

// Utility hooks
export function usePartyOptions() {
  const { data: parties } = useParties();

  return useCallback(() => {
    if (!parties) return [];

    return parties
      .filter(party => party.is_active)
      .map(party => ({
        value: party.id,
        label: party.name,
        color: party.color,
      }));
  }, [parties]);
}

export function usePartyById(id: string | undefined) {
  const parties = usePartyStore((state) => state.parties);

  return useCallback(() => {
    if (!id || !parties.length) return undefined;
    return parties.find(party => party.id === id);
  }, [id, parties]);
}