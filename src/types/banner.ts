import { BaseEntity, Coordinates, DateRange } from './index';
import { Party } from './party';

// Banner related types
export interface Banner extends BaseEntity {
  party_id: string;
  address: string;
  lat: number;
  lng: number;
  administrative_district?: string;
  text: string;
  start_date: string;
  end_date: string;
  image_url?: string;
  thumbnail_url?: string;
  memo?: string;
  is_active: boolean;
}

export interface BannerWithParty extends Banner {
  party: Party;
}

export interface BannerCreateInput {
  party_id: string;
  address: string;
  text: string;
  start_date: string;
  end_date: string;
  memo?: string;
  is_active?: boolean;
}

export interface BannerUpdateInput {
  party_id?: string;
  address?: string;
  text?: string;
  start_date?: string;
  end_date?: string;
  memo?: string;
  is_active?: boolean;
}

export interface BannerFormInput extends BannerCreateInput {
  image?: File;
}

export interface BannerFilterOptions {
  party_id?: string[];
  administrative_district?: string[];
  is_active?: boolean;
  is_expired?: boolean;
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
  party_color: string;
  party_name: string;
  text: string;
  address: string;
  is_expired: boolean;
}

export interface BannerFormData extends Omit<BannerCreateInput, 'start_date' | 'end_date'> {
  start_date: Date;
  end_date: Date;
  image?: File;
}