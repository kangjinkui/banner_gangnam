// API related types

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: ApiError;
  message?: string;
  success: boolean;
}

export interface PaginatedApiResponse<T> extends ApiResponse {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  signal?: AbortSignal;
}

export interface ApiEndpoints {
  // Party endpoints
  parties: {
    list: '/api/parties';
    create: '/api/parties';
    detail: (id: string) => string;
    update: (id: string) => string;
    delete: (id: string) => string;
    stats: '/api/parties/stats';
  };

  // Banner endpoints
  banners: {
    list: '/api/banners';
    create: '/api/banners';
    detail: (id: string) => string;
    update: (id: string) => string;
    delete: (id: string) => string;
    stats: '/api/banners/stats';
    upload: '/api/banners/upload';
  };

  // Export endpoints
  export: {
    csv: '/api/export/csv';
    excel: '/api/export/excel';
  };

  // Map endpoints
  map: {
    geocode: '/api/map/geocode';
    administrative: '/api/map/administrative';
  };
}

export const API_ENDPOINTS: ApiEndpoints = {
  parties: {
    list: '/api/parties',
    create: '/api/parties',
    detail: (id: string) => `/api/parties/${id}`,
    update: (id: string) => `/api/parties/${id}`,
    delete: (id: string) => `/api/parties/${id}`,
    stats: '/api/parties/stats'
  },
  banners: {
    list: '/api/banners',
    create: '/api/banners',
    detail: (id: string) => `/api/banners/${id}`,
    update: (id: string) => `/api/banners/${id}`,
    delete: (id: string) => `/api/banners/${id}`,
    stats: '/api/banners/stats',
    upload: '/api/banners/upload'
  },
  export: {
    csv: '/api/export/csv',
    excel: '/api/export/excel'
  },
  map: {
    geocode: '/api/map/geocode',
    administrative: '/api/map/administrative'
  }
};

export interface FileUploadResponse {
  url: string;
  thumbnail_url?: string;
  file_name: string;
  file_size: number;
}

export interface GeocodingRequest {
  address: string;
}

export interface GeocodingResponse {
  lat: number;
  lng: number;
  administrative_district?: string;
  formatted_address?: string;
}

export interface ExportRequest {
  format: 'csv' | 'excel';
  filters?: any;
  columns?: string[];
}

export interface ExportResponse {
  download_url: string;
  file_name: string;
  expires_at: string;
}