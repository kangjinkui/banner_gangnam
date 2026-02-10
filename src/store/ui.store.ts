import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type ViewMode = 'list' | 'map' | 'grid';
export type Theme = 'light' | 'dark' | 'system';

interface Modal {
  isOpen: boolean;
  type?: 'create' | 'edit' | 'delete' | 'view' | 'confirm';
  data?: any;
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  timestamp: number;
}

interface UIState {
  // Layout & Navigation
  sidebarOpen: boolean;
  viewMode: ViewMode;
  theme: Theme;

  // Modal state
  modal: Modal;

  // Notifications
  notifications: Notification[];

  // Loading states
  globalLoading: boolean;
  loadingStates: Record<string, boolean>;

  // Map state
  mapCenter: { lat: number; lng: number };
  mapZoom: number;
  mapBounds: { north: number; south: number; east: number; west: number } | null;

  // Actions
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setViewMode: (mode: ViewMode) => void;
  setTheme: (theme: Theme) => void;

  // Modal actions
  openModal: (type: Modal['type'], data?: any) => void;
  closeModal: () => void;
  setModalData: (data: any) => void;

  // Notification actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  // Loading actions
  setGlobalLoading: (loading: boolean) => void;
  setLoading: (key: string, loading: boolean) => void;
  clearLoadingStates: () => void;

  // Map actions
  setMapCenter: (center: { lat: number; lng: number }) => void;
  setMapZoom: (zoom: number) => void;
  setMapBounds: (bounds: { north: number; south: number; east: number; west: number } | null) => void;

  // Utility functions
  isLoading: (key: string) => boolean;
  getNotification: (id: string) => Notification | undefined;
}

// Default Gangnam-gu center coordinates
const DEFAULT_MAP_CENTER = { lat: 37.5173, lng: 127.0473 };
const DEFAULT_MAP_ZOOM = 14;

export const useUIStore = create<UIState>()(
  devtools(
    (set, get) => ({
      // Initial state
      sidebarOpen: true,
      viewMode: 'list',
      theme: 'system',
      modal: { isOpen: false },
      notifications: [],
      globalLoading: false,
      loadingStates: {},
      mapCenter: DEFAULT_MAP_CENTER,
      mapZoom: DEFAULT_MAP_ZOOM,
      mapBounds: null,

      // Layout & Navigation actions
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setViewMode: (mode) => set({ viewMode: mode }),
      setTheme: (theme) => set({ theme }),

      // Modal actions
      openModal: (type, data) => set({
        modal: { isOpen: true, type, data }
      }),
      closeModal: () => set({
        modal: { isOpen: false, type: undefined, data: undefined }
      }),
      setModalData: (data) => set((state) => ({
        modal: { ...state.modal, data }
      })),

      // Notification actions
      addNotification: (notification) => {
        const id = Date.now().toString() + Math.random().toString(36);
        const newNotification: Notification = {
          ...notification,
          id,
          timestamp: Date.now(),
          duration: notification.duration ?? 5000, // Default 5 seconds
        };

        set((state) => ({
          notifications: [...state.notifications, newNotification]
        }));

        // Auto remove after duration
        if (newNotification.duration > 0) {
          setTimeout(() => {
            get().removeNotification(id);
          }, newNotification.duration);
        }
      },

      removeNotification: (id) => set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id)
      })),

      clearNotifications: () => set({ notifications: [] }),

      // Loading actions
      setGlobalLoading: (loading) => set({ globalLoading: loading }),
      setLoading: (key, loading) => set((state) => ({
        loadingStates: {
          ...state.loadingStates,
          [key]: loading
        }
      })),
      clearLoadingStates: () => set({ loadingStates: {} }),

      // Map actions
      setMapCenter: (center) => set({ mapCenter: center }),
      setMapZoom: (zoom) => set({ mapZoom: zoom }),
      setMapBounds: (bounds) => set({ mapBounds: bounds }),

      // Utility functions
      isLoading: (key) => {
        const state = get();
        return state.loadingStates[key] || false;
      },

      getNotification: (id) => {
        const state = get();
        return state.notifications.find((n) => n.id === id);
      },
    }),
    {
      name: 'ui-store',
    }
  )
);

// Selectors
export const useSidebarOpen = () => useUIStore((state) => state.sidebarOpen);
export const useViewMode = () => useUIStore((state) => state.viewMode);
export const useTheme = () => useUIStore((state) => state.theme);
export const useModal = () => useUIStore((state) => state.modal);
export const useNotifications = () => useUIStore((state) => state.notifications);
export const useGlobalLoading = () => useUIStore((state) => state.globalLoading);
export const useMapState = () => useUIStore((state) => ({
  center: state.mapCenter,
  zoom: state.mapZoom,
  bounds: state.mapBounds,
}));

// Actions
export const useUIActions = () => useUIStore((state) => ({
  setSidebarOpen: state.setSidebarOpen,
  toggleSidebar: state.toggleSidebar,
  setViewMode: state.setViewMode,
  setTheme: state.setTheme,
  openModal: state.openModal,
  closeModal: state.closeModal,
  setModalData: state.setModalData,
  addNotification: state.addNotification,
  removeNotification: state.removeNotification,
  clearNotifications: state.clearNotifications,
  setGlobalLoading: state.setGlobalLoading,
  setLoading: state.setLoading,
  clearLoadingStates: state.clearLoadingStates,
  setMapCenter: state.setMapCenter,
  setMapZoom: state.setMapZoom,
  setMapBounds: state.setMapBounds,
  isLoading: state.isLoading,
  getNotification: state.getNotification,
}));

// Computed selectors
export const useIsLoading = (key: string) => useUIStore((state) => state.loadingStates[key] || false);

export const useAnyLoading = () => useUIStore((state) =>
  state.globalLoading || Object.values(state.loadingStates).some(Boolean)
);

export const useUnreadNotifications = () => useUIStore((state) =>
  state.notifications.filter((n) => Date.now() - n.timestamp < 10000) // Last 10 seconds
);

// Helper functions for notifications
export const useNotify = () => {
  const { addNotification } = useUIActions();

  return {
    success: (title: string, message?: string, duration?: number) =>
      addNotification({ type: 'success', title, message, duration }),
    error: (title: string, message?: string, duration?: number) =>
      addNotification({ type: 'error', title, message, duration }),
    warning: (title: string, message?: string, duration?: number) =>
      addNotification({ type: 'warning', title, message, duration }),
    info: (title: string, message?: string, duration?: number) =>
      addNotification({ type: 'info', title, message, duration }),
  };
};