// Common types and interfaces

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface DateRange {
  start_date?: string;
  end_date?: string;
}

export interface FilterOptions {
  banner_type?: 'political' | 'public' | 'rally' | 'all' | Array<'political' | 'public' | 'rally'>;
  department?: string;
  party_id?: string[];
  administrative_district?: string[];
  is_active?: boolean;
  is_expired?: boolean;
  exclude_rally_expired?: boolean;
  date_range?: DateRange;
  search?: string;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

export interface QueryOptions {
  filters?: FilterOptions;
  sort?: SortOptions;
  page?: number;
  limit?: number;
}
