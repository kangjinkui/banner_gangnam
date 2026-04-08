import { BaseEntity, Coordinates, DateRange } from './index';
import { Party } from './party';

// Banner type enum
export type BannerType = 'political' | 'public' | 'rally';

// Banner related types
export interface Banner extends BaseEntity {
  banner_type: BannerType;
  party_id: string | null;
  department?: string | null;
  poster_name?: string | null;
  address: string;
  lat: number;
  lng: number;
  administrative_district?: string;
  text: string;
  start_date?: string | null;
  end_date?: string | null;
  image_url?: string;
  thumbnail_url?: string;
  memo?: string;
  is_active: boolean;
}

export interface BannerWithParty extends Banner {
  party?: Party | null;
}

// Political banner create input
export interface PoliticalBannerCreateInput {
  banner_type: 'political';
  party_id: string;
  address: string;
  text: string;
  start_date: string;
  end_date: string;
  memo?: string;
  is_active?: boolean;
}

// Public banner create input
export interface PublicBannerCreateInput {
  banner_type: 'public';
  department: string;
  address: string;
  text: string;
  start_date?: string;
  end_date?: string;
  memo?: string;
  is_active?: boolean;
}

// Rally banner create input
export interface RallyBannerCreateInput {
  banner_type: 'rally';
  address: string;
  text: string;
  poster_name?: string;
  start_date?: string;
  end_date?: string;
  memo?: string;
  is_active?: boolean;
}

// Union type for all banner create inputs
export type BannerCreateInput =
  | PoliticalBannerCreateInput
  | PublicBannerCreateInput
  | RallyBannerCreateInput;

export interface BannerUpdateInput {
  banner_type?: BannerType;
  party_id?: string | null;
  department?: string | null;
  poster_name?: string | null;
  address?: string;
  text?: string;
  start_date?: string | null;
  end_date?: string | null;
  memo?: string;
  is_active?: boolean;
}

export type BannerFormInput =
  | (PoliticalBannerCreateInput & { image?: File })
  | (PublicBannerCreateInput & { image?: File })
  | (RallyBannerCreateInput & { image?: File });

export interface BannerFilterOptions {
  banner_type?: BannerType | 'all';
  party_id?: string[];
  department?: string;
  administrative_district?: string[];
  is_active?: boolean;
  is_expired?: boolean;
  exclude_rally_expired?: boolean;
  date_range?: DateRange;
  search?: string;
  coordinates?: {
    bounds: {
      north: number;
      south: number;
      east: number;
      west: number;
    };
  };
}

export interface BannerStats {
  total: number;
  active: number;
  expired: number;
  by_type: {
    political: number;
    public: number;
    rally: number;
  };
  by_department: {
    [department: string]: {
      total: number;
      active: number;
      expired: number;
    };
  };
  by_district: { [district: string]: number };
  by_party: { [party_id: string]: number };
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapMarker {
  id: string;
  position: Coordinates;
  banner_type: BannerType;
  party_color?: string;
  party_name?: string;
  department?: string;
  text: string;
  address: string;
  is_expired: boolean;
}

export interface BannerFormData extends Omit<BannerCreateInput, 'start_date' | 'end_date'> {
  start_date: Date;
  end_date: Date;
  image?: File;
}