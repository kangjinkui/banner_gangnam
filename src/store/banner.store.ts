import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Banner, BannerWithParty, BannerStats, MapMarker, BannerFilterOptions } from '@/types/banner';

interface BannerState {
  // State
  banners: BannerWithParty[];
  selectedBanner: BannerWithParty | null;
  mapMarkers: MapMarker[];
  stats: BannerStats | null;
  filters: BannerFilterOptions;
  loading: boolean;
  error: string | null;

  // Pagination
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;

  // Actions
  setBanners: (banners: BannerWithParty[]) => void;
  setSelectedBanner: (banner: BannerWithParty | null) => void;
  setMapMarkers: (markers: MapMarker[]) => void;
  setStats: (stats: BannerStats) => void;
  setFilters: (filters: Partial<BannerFilterOptions>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setPagination: (pagination: { currentPage: number; totalPages: number; totalCount: number; pageSize: number }) => void;

  // CRUD Operations
  addBanner: (banner: BannerWithParty) => void;
  updateBanner: (id: string, updates: Partial<BannerWithParty>) => void;
  removeBanner: (id: string) => void;

  // Utility functions
  getBannerById: (id: string) => BannerWithParty | undefined;
  getActiveBanners: () => BannerWithParty[];
  getExpiredBanners: () => BannerWithParty[];
  getBannersByParty: (partyId: string) => BannerWithParty[];
  getBannersByDistrict: (district: string) => BannerWithParty[];
  clearState: () => void;
  resetFilters: () => void;
}

const initialFilters: BannerFilterOptions = {
  search: '',
  is_active: undefined,
  party_id: [],
  administrative_district: [],
  date_range: undefined,
  banner_type: undefined,
  department: undefined,
  exclude_rally_expired: false,
};

export const useBannerStore = create<BannerState>()(
  devtools(
    (set, get) => ({
      // Initial state
      banners: [],
      selectedBanner: null,
      mapMarkers: [],
      stats: null,
      filters: initialFilters,
      loading: false,
      error: null,
      currentPage: 1,
      totalPages: 1,
      totalCount: 0,
      pageSize: 20,

      // Basic setters
      setBanners: (banners) => set({ banners }),
      setSelectedBanner: (selectedBanner) => set({ selectedBanner }),
      setMapMarkers: (mapMarkers) => set({ mapMarkers }),
      setStats: (stats) => set({ stats }),
      setFilters: (newFilters) => set((state) => ({
        filters: { ...state.filters, ...newFilters },
        currentPage: 1, // Reset to first page when filters change
      })),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setPagination: (pagination) => set(pagination),

      // CRUD operations
      addBanner: (banner) => set((state) => ({
        banners: [banner, ...state.banners],
        totalCount: state.totalCount + 1,
      })),

      updateBanner: (id, updates) => set((state) => ({
        banners: state.banners.map((banner) =>
          banner.id === id ? { ...banner, ...updates } : banner
        ),
        selectedBanner: state.selectedBanner?.id === id
          ? { ...state.selectedBanner, ...updates }
          : state.selectedBanner,
        mapMarkers: state.mapMarkers.map((marker) =>
          marker.id === id
            ? {
                ...marker,
                text: updates.text || marker.text,
                address: updates.address || marker.address,
                is_expired: updates.end_date
                  ? new Date(updates.end_date) < new Date()
                  : marker.is_expired
              }
            : marker
        ),
      })),

      removeBanner: (id) => set((state) => ({
        banners: state.banners.filter((banner) => banner.id !== id),
        mapMarkers: state.mapMarkers.filter((marker) => marker.id !== id),
        selectedBanner: state.selectedBanner?.id === id ? null : state.selectedBanner,
        totalCount: Math.max(0, state.totalCount - 1),
      })),

      // Utility functions
      getBannerById: (id) => {
        const state = get();
        return state.banners.find((banner) => banner.id === id);
      },

      getActiveBanners: () => {
        const state = get();
        return state.banners.filter((banner) => banner.is_active);
      },

      getExpiredBanners: () => {
        const state = get();
        const today = new Date().toISOString().split('T')[0];
        return state.banners.filter((banner) => {
          // Rally banners don't expire
          if (banner.banner_type === 'rally') return false;
          // Check if banner has end_date and is expired (익일부터 만료)
          return banner.end_date && banner.end_date < today;
        });
      },

      getBannersByParty: (partyId) => {
        const state = get();
        return state.banners.filter((banner) => banner.party_id === partyId);
      },

      getBannersByDistrict: (district) => {
        const state = get();
        return state.banners.filter((banner) => banner.administrative_district === district);
      },

      clearState: () => set({
        banners: [],
        selectedBanner: null,
        mapMarkers: [],
        stats: null,
        loading: false,
        error: null,
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
      }),

      resetFilters: () => set({
        filters: initialFilters,
        currentPage: 1,
      }),
    }),
    {
      name: 'banner-store',
    }
  )
);

// Selectors
export const useBanners = () => useBannerStore((state) => state.banners);
export const useSelectedBanner = () => useBannerStore((state) => state.selectedBanner);
export const useMapMarkers = () => useBannerStore((state) => state.mapMarkers);
export const useBannerStats = () => useBannerStore((state) => state.stats);
export const useBannerFilters = () => useBannerStore((state) => state.filters);
export const useBannerLoading = () => useBannerStore((state) => state.loading);
export const useBannerError = () => useBannerStore((state) => state.error);
export const useBannerPagination = () => useBannerStore((state) => ({
  currentPage: state.currentPage,
  totalPages: state.totalPages,
  totalCount: state.totalCount,
  pageSize: state.pageSize,
}));

// Computed selectors
export const useActiveBanners = () => useBannerStore((state) =>
  state.banners.filter((banner) => banner.is_active)
);

export const useExpiredBanners = () => useBannerStore((state) => {
  const now = new Date();
  // Only count active banners, exclude rally banners (they don't expire)
  return state.banners.filter((banner) => {
    if (!banner.is_active) return false;
    if (banner.banner_type === 'rally') return false;
    return banner.end_date && new Date(banner.end_date) < now;
  });
});

export const useBannerById = (id: string | undefined) => useBannerStore((state) =>
  id ? state.banners.find((banner) => banner.id === id) : undefined
);

export const useBannersByParty = (partyId: string | undefined) => useBannerStore((state) =>
  partyId ? state.banners.filter((banner) => banner.party_id === partyId) : []
);

export const useDistrictsFromBanners = () => useBannerStore((state) => {
  const districts = new Set(
    state.banners
      .map((banner) => banner.administrative_district)
      .filter((district): district is string => Boolean(district))
  );
  return Array.from(districts).sort();
});

export const useBannerSummary = () => useBannerStore((state) => {
  const now = new Date();
  // Only count active banners for statistics
  const activeBanners = state.banners.filter((b) => b.is_active);
  const active = activeBanners.length;
  // Rally banners don't expire
  const expired = activeBanners.filter((b) =>
    b.banner_type !== 'rally' && b.end_date && new Date(b.end_date) < now
  ).length;
  const upcoming = activeBanners.filter((b) =>
    b.start_date && new Date(b.start_date) > now
  ).length;

  return {
    total: activeBanners.length, // Only active banners
    active,
    expired,
    upcoming,
  };
});

// Actions
export const useBannerActions = () => useBannerStore((state) => ({
  setBanners: state.setBanners,
  setSelectedBanner: state.setSelectedBanner,
  setMapMarkers: state.setMapMarkers,
  setStats: state.setStats,
  setFilters: state.setFilters,
  setLoading: state.setLoading,
  setError: state.setError,
  setPagination: state.setPagination,
  addBanner: state.addBanner,
  updateBanner: state.updateBanner,
  removeBanner: state.removeBanner,
  getBannerById: state.getBannerById,
  getActiveBanners: state.getActiveBanners,
  getExpiredBanners: state.getExpiredBanners,
  getBannersByParty: state.getBannersByParty,
  getBannersByDistrict: state.getBannersByDistrict,
  clearState: state.clearState,
  resetFilters: state.resetFilters,
}));