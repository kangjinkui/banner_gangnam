'use client';

import { useCallback, useMemo } from 'react';
import { useBannerActions, useBannerFilters as useBannerFiltersStore } from '@/store/banner.store';
import { BannerFilterOptions } from '@/types/banner';
import { useParties } from './use-parties';
import { useDistricts } from './use-map';

export function useBannerFilters() {
  const filters = useBannerFiltersStore();
  const { setFilters, resetFilters } = useBannerActions();

  const updateFilter = useCallback((key: keyof BannerFilterOptions, value: any) => {
    setFilters({ [key]: value });
  }, [setFilters]);

  const updateFilters = useCallback((newFilters: Partial<BannerFilterOptions>) => {
    setFilters(newFilters);
  }, [setFilters]);

  const clearFilter = useCallback((key: keyof BannerFilterOptions) => {
    const clearedFilters: Partial<BannerFilterOptions> = {};

    if (key === 'party_id') clearedFilters.party_id = [];
    else if (key === 'administrative_district') clearedFilters.administrative_district = [];
    else if (key === 'date_range') clearedFilters.date_range = undefined;
    else (clearedFilters as any)[key] = undefined;

    setFilters(clearedFilters);
  }, [setFilters]);

  const clearAllFilters = useCallback(() => {
    resetFilters();
  }, [resetFilters]);

  const hasActiveFilters = useMemo(() => {
    return (
      !!filters.search ||
      filters.is_active !== undefined ||
      (filters.party_id && filters.party_id.length > 0) ||
      (filters.administrative_district && filters.administrative_district.length > 0) ||
      !!filters.date_range?.start_date ||
      !!filters.date_range?.end_date
    );
  }, [filters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.is_active !== undefined) count++;
    if (filters.party_id && filters.party_id.length > 0) count++;
    if (filters.administrative_district && filters.administrative_district.length > 0) count++;
    if (filters.date_range?.start_date || filters.date_range?.end_date) count++;
    return count;
  }, [filters]);

  return {
    filters,
    updateFilter,
    updateFilters,
    clearFilter,
    clearAllFilters,
    hasActiveFilters,
    activeFilterCount,
  };
}

export function useFilterOptions() {
  const { data: parties = [] } = useParties();
  const { data: districts = [] } = useDistricts('banners');

  const partyOptions = useMemo(() => {
    return parties.map(party => ({
      value: party.id,
      label: party.name,
      color: party.color,
      disabled: !party.is_active,
    }));
  }, [parties]);

  const districtOptions = useMemo(() => {
    return districts.map(district => ({
      value: district,
      label: district,
    }));
  }, [districts]);

  const statusOptions = useMemo(() => [
    { value: 'true', label: '활성' },
    { value: 'false', label: '비활성' },
    { value: 'all', label: '전체' },
  ], []);

  return {
    partyOptions,
    districtOptions,
    statusOptions,
  };
}

export function useQuickFilters() {
  const { updateFilters, clearAllFilters } = useBannerFilters();

  const applyQuickFilter = useCallback((filterName: string) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    clearAllFilters();

    switch (filterName) {
      case 'active':
        updateFilters({ is_active: true });
        break;
      case 'inactive':
        updateFilters({ is_active: false });
        break;
      case 'expired':
        updateFilters({
          is_active: true,
          date_range: { start_date: '', end_date: today },
        });
        break;
      case 'current':
        updateFilters({
          is_active: true,
          date_range: { start_date: today, end_date: today },
        });
        break;
      case 'upcoming':
        updateFilters({
          is_active: true,
          date_range: { start_date: today, end_date: oneMonthFromNow },
        });
        break;
      case 'recent':
        updateFilters({
          date_range: { start_date: oneWeekAgo, end_date: today },
        });
        break;
      default:
        break;
    }
  }, [updateFilters, clearAllFilters]);

  const quickFilterOptions = useMemo(() => [
    { key: 'active', label: '활성 현수막', description: '현재 활성화된 현수막' },
    { key: 'inactive', label: '비활성 현수막', description: '비활성화된 현수막' },
    { key: 'expired', label: '만료된 현수막', description: '종료일이 지난 현수막' },
    { key: 'current', label: '현재 진행 중', description: '오늘 날짜에 해당하는 현수막' },
    { key: 'upcoming', label: '향후 예정', description: '앞으로 30일 내 예정된 현수막' },
    { key: 'recent', label: '최근 생성', description: '최근 7일 내 생성된 현수막' },
  ], []);

  return {
    applyQuickFilter,
    quickFilterOptions,
  };
}

export function useDateRangeFilter() {
  const { filters, updateFilter } = useBannerFilters();

  const setDateRange = useCallback((startDate?: string, endDate?: string) => {
    if (!startDate && !endDate) {
      updateFilter('date_range', undefined);
    } else {
      updateFilter('date_range', {
        start_date: startDate || '',
        end_date: endDate || '',
      });
    }
  }, [updateFilter]);

  const clearDateRange = useCallback(() => {
    updateFilter('date_range', undefined);
  }, [updateFilter]);

  const applyPresetRange = useCallback((preset: string) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    switch (preset) {
      case 'today':
        setDateRange(today, today);
        break;
      case 'this-week': {
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6));
        setDateRange(
          startOfWeek.toISOString().split('T')[0],
          endOfWeek.toISOString().split('T')[0]
        );
        break;
      }
      case 'this-month': {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        setDateRange(
          startOfMonth.toISOString().split('T')[0],
          endOfMonth.toISOString().split('T')[0]
        );
        break;
      }
      case 'last-30-days': {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        setDateRange(
          thirtyDaysAgo.toISOString().split('T')[0],
          today
        );
        break;
      }
      default:
        clearDateRange();
        break;
    }
  }, [setDateRange, clearDateRange]);

  const dateRangePresets = useMemo(() => [
    { key: 'today', label: '오늘' },
    { key: 'this-week', label: '이번 주' },
    { key: 'this-month', label: '이번 달' },
    { key: 'last-30-days', label: '최근 30일' },
  ], []);

  return {
    dateRange: filters.date_range,
    setDateRange,
    clearDateRange,
    applyPresetRange,
    dateRangePresets,
  };
}

export function useSearchFilter() {
  const { filters, updateFilter } = useBannerFilters();

  const setSearch = useCallback((query: string) => {
    updateFilter('search', query || undefined);
  }, [updateFilter]);

  const clearSearch = useCallback(() => {
    updateFilter('search', undefined);
  }, [updateFilter]);

  return {
    searchQuery: filters.search || '',
    setSearch,
    clearSearch,
    hasSearch: !!filters.search,
  };
}

export function useFilterPresets() {
  const { updateFilters, clearAllFilters } = useBannerFilters();

  const presets = useMemo(() => [
    {
      id: 'all',
      name: '전체',
      description: '모든 현수막',
      filters: {},
    },
    {
      id: 'active-only',
      name: '활성 현수막만',
      description: '현재 활성화된 현수막만 표시',
      filters: { is_active: true },
    },
    {
      id: 'expired',
      name: '만료된 현수막',
      description: '종료일이 지난 현수막',
      filters: {
        is_active: true,
        date_range: { start_date: '', end_date: new Date().toISOString().split('T')[0] },
      },
    },
    {
      id: 'current-month',
      name: '이번 달 현수막',
      description: '이번 달에 해당하는 현수막',
      filters: {
        date_range: {
          start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
          end_date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
        },
      },
    },
  ], []);

  const applyPreset = useCallback((presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      if (preset.id === 'all') {
        clearAllFilters();
      } else {
        clearAllFilters();
        updateFilters(preset.filters);
      }
    }
  }, [presets, updateFilters, clearAllFilters]);

  return {
    presets,
    applyPreset,
  };
}