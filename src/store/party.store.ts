import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Party, PartyWithBannerCount, PartyCreateInput, PartyUpdateInput } from '@/types/party';

interface PartyState {
  // State
  parties: Party[];
  partiesWithBanners: PartyWithBannerCount[];
  selectedParty: Party | null;
  loading: boolean;
  error: string | null;

  // Actions
  setParties: (parties: Party[]) => void;
  setPartiesWithBanners: (parties: PartyWithBannerCount[]) => void;
  setSelectedParty: (party: Party | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // CRUD Operations
  addParty: (party: Party) => void;
  updateParty: (id: string, updates: Partial<Party>) => void;
  removeParty: (id: string) => void;

  // Utility functions
  getPartyById: (id: string) => Party | undefined;
  getActiveParties: () => Party[];
  clearState: () => void;
}

export const usePartyStore = create<PartyState>()(
  devtools(
    (set, get) => ({
      // Initial state
      parties: [],
      partiesWithBanners: [],
      selectedParty: null,
      loading: false,
      error: null,

      // Basic setters
      setParties: (parties) => set({ parties }),
      setPartiesWithBanners: (partiesWithBanners) => set({ partiesWithBanners }),
      setSelectedParty: (selectedParty) => set({ selectedParty }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),

      // CRUD operations
      addParty: (party) => set((state) => ({
        parties: [party, ...state.parties],
      })),

      updateParty: (id, updates) => set((state) => ({
        parties: state.parties.map((party) =>
          party.id === id ? { ...party, ...updates } : party
        ),
        partiesWithBanners: state.partiesWithBanners.map((party) =>
          party.id === id ? { ...party, ...updates } : party
        ),
        selectedParty: state.selectedParty?.id === id
          ? { ...state.selectedParty, ...updates }
          : state.selectedParty,
      })),

      removeParty: (id) => set((state) => ({
        parties: state.parties.filter((party) => party.id !== id),
        partiesWithBanners: state.partiesWithBanners.filter((party) => party.id !== id),
        selectedParty: state.selectedParty?.id === id ? null : state.selectedParty,
      })),

      // Utility functions
      getPartyById: (id) => {
        const state = get();
        return state.parties.find((party) => party.id === id);
      },

      getActiveParties: () => {
        const state = get();
        return state.parties.filter((party) => party.is_active);
      },

      clearState: () => set({
        parties: [],
        partiesWithBanners: [],
        selectedParty: null,
        loading: false,
        error: null,
      }),
    }),
    {
      name: 'party-store',
    }
  )
);

// Selectors
export const useParties = () => usePartyStore((state) => state.parties);
export const usePartiesWithBanners = () => usePartyStore((state) => state.partiesWithBanners);
export const useSelectedParty = () => usePartyStore((state) => state.selectedParty);
export const usePartyLoading = () => usePartyStore((state) => state.loading);
export const usePartyError = () => usePartyStore((state) => state.error);

// Computed selectors
export const useActiveParties = () => usePartyStore((state) =>
  state.parties.filter((party) => party.is_active)
);

export const usePartyById = (id: string | undefined) => usePartyStore((state) =>
  id ? state.parties.find((party) => party.id === id) : undefined
);

export const usePartyOptions = () => usePartyStore((state) =>
  state.parties.map((party) => ({
    value: party.id,
    label: party.name,
    color: party.color,
    disabled: !party.is_active,
  }))
);

export const usePartyStats = () => usePartyStore((state) => {
  const total = state.parties.length;
  const active = state.parties.filter((p) => p.is_active).length;
  const inactive = total - active;

  return {
    total,
    active,
    inactive,
  };
});

// Actions
export const usePartyActions = () => usePartyStore((state) => ({
  setParties: state.setParties,
  setPartiesWithBanners: state.setPartiesWithBanners,
  setSelectedParty: state.setSelectedParty,
  setLoading: state.setLoading,
  setError: state.setError,
  addParty: state.addParty,
  updateParty: state.updateParty,
  removeParty: state.removeParty,
  getPartyById: state.getPartyById,
  getActiveParties: state.getActiveParties,
  clearState: state.clearState,
}));