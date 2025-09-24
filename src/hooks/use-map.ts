'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useUIActions, useUIStore } from '@/store/ui.store';
import { useNotify } from '@/store/ui.store';
import { KakaoMapService } from '@/lib/map/kakao.service';
import { Coordinates } from '@/types';

const QUERY_KEYS = {
  geocode: ['geocode'] as const,
  addressSuggestions: ['address-suggestions'] as const,
  districts: ['districts'] as const,
} as const;

// API functions
const mapApi = {
  geocode: async (address: string) => {
    const response = await fetch('/api/map/geocode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    });
    if (!response.ok) throw new Error('Failed to geocode address');
    return response.json();
  },

  getAddressSuggestions: async (query: string) => {
    const response = await fetch(`/api/map/geocode?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Failed to get address suggestions');
    return response.json();
  },

  getDistricts: async (source: 'all' | 'banners' | 'system' = 'all') => {
    const response = await fetch(`/api/map/districts?source=${source}`);
    if (!response.ok) throw new Error('Failed to get districts');
    return response.json();
  },
};

export function useKakaoMap() {
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const loadMap = async () => {
      try {
        await KakaoMapService.loadKakaoMapScript();
        if (!isCancelled) {
          setIsMapLoaded(true);
          setLoadError(null);
        }
      } catch (error) {
        if (!isCancelled) {
          setLoadError(error instanceof Error ? error.message : 'Failed to load map');
        }
      }
    };

    if (typeof window !== 'undefined') {
      loadMap();
    }

    return () => {
      isCancelled = true;
    };
  }, []);

  return {
    isMapLoaded,
    loadError,
    isLoading: !isMapLoaded && !loadError,
  };
}

export function useMapState() {
  const mapState = useUIStore((state) => ({
    center: state.mapCenter,
    zoom: state.mapZoom,
    bounds: state.mapBounds,
  }));
  const { setMapCenter, setMapZoom, setMapBounds } = useUIActions();

  return {
    ...mapState,
    setCenter: setMapCenter,
    setZoom: setMapZoom,
    setBounds: setMapBounds,
  };
}

export function useGeocode() {
  const notify = useNotify();

  return useMutation({
    mutationFn: mapApi.geocode,
    onError: (error: Error) => {
      notify.error('주소 변환 실패', error.message);
    },
  });
}

export function useAddressSuggestions(query: string, enabled = true) {
  return useQuery({
    queryKey: [...QUERY_KEYS.addressSuggestions, query],
    queryFn: () => mapApi.getAddressSuggestions(query),
    select: (response) => response.data,
    enabled: enabled && query.length >= 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

export function useDistricts(source: 'all' | 'banners' | 'system' = 'all') {
  return useQuery({
    queryKey: [...QUERY_KEYS.districts, source],
    queryFn: () => mapApi.getDistricts(source),
    select: (response) => response.data,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useMapBounds() {
  const [bounds, setBounds] = useState<{
    north: number;
    south: number;
    east: number;
    west: number;
  } | null>(null);

  const updateBounds = useCallback((newBounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }) => {
    setBounds(newBounds);
  }, []);

  const isWithinBounds = useCallback((coordinates: Coordinates) => {
    if (!bounds) return true;

    return (
      coordinates.lat >= bounds.south &&
      coordinates.lat <= bounds.north &&
      coordinates.lng >= bounds.west &&
      coordinates.lng <= bounds.east
    );
  }, [bounds]);

  return {
    bounds,
    updateBounds,
    isWithinBounds,
  };
}

export function useMapUtils() {
  const calculateDistance = useCallback((coord1: Coordinates, coord2: Coordinates) => {
    return KakaoMapService.calculateDistance(coord1, coord2);
  }, []);

  const isWithinGangnam = useCallback((coordinates: Coordinates) => {
    return KakaoMapService.isWithinGangnamBounds(coordinates);
  }, []);

  const formatDistance = useCallback((distance: number) => {
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    } else {
      return `${(distance / 1000).toFixed(1)}km`;
    }
  }, []);

  return {
    calculateDistance,
    isWithinGangnam,
    formatDistance,
  };
}

// Custom hook for address input with autocomplete
export function useAddressInput() {
  const [query, setQuery] = useState('');
  const [selectedAddress, setSelectedAddress] = useState<{
    address: string;
    coordinates: Coordinates;
    administrative_district?: string;
  } | null>(null);

  const { data: suggestions = [], isLoading } = useAddressSuggestions(query);

  const selectAddress = useCallback((address: {
    address: string;
    coordinates: Coordinates;
    administrative_district?: string;
  }) => {
    setSelectedAddress(address);
    setQuery(address.address);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedAddress(null);
    setQuery('');
  }, []);

  return {
    query,
    setQuery,
    suggestions,
    isLoading,
    selectedAddress,
    selectAddress,
    clearSelection,
  };
}

// Hook for managing map markers
export function useMapMarkers() {
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);

  const selectMarker = useCallback((markerId: string | null) => {
    setSelectedMarkerId(markerId);
  }, []);

  const hoverMarker = useCallback((markerId: string | null) => {
    setHoveredMarkerId(markerId);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedMarkerId(null);
    setHoveredMarkerId(null);
  }, []);

  return {
    selectedMarkerId,
    hoveredMarkerId,
    selectMarker,
    hoverMarker,
    clearSelection,
  };
}

// Hook for map clustering
export function useMapClustering() {
  const [clusteringEnabled, setClusteringEnabled] = useState(true);
  const [minClusterSize, setMinClusterSize] = useState(5);

  const toggleClustering = useCallback(() => {
    setClusteringEnabled(!clusteringEnabled);
  }, [clusteringEnabled]);

  return {
    clusteringEnabled,
    minClusterSize,
    setClusteringEnabled,
    setMinClusterSize,
    toggleClustering,
  };
}