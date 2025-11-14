import { BaseEntity } from './index';

// Party related types
export interface Party extends BaseEntity {
  name: string;
  color: string;
  marker_icon_url?: string;
  is_active: boolean;
}

export interface PartyCreateInput {
  name: string;
  color: string;
  marker_icon_url?: string;
  is_active?: boolean;
}

export interface PartyUpdateInput {
  name?: string;
  color?: string;
  marker_icon_url?: string;
  is_active?: boolean;
}

export interface PartyWithBannerCount extends Party {
  banner_count: number;
  active_banner_count: number;
}

export interface PartyStats {
  party_id: string;
  party_name: string;
  party_color: string;
  total_banners: number;
  active_banners: number;
  expired_banners: number;
}

export interface PartyFilterOptions {
  is_active?: boolean;
  search?: string;
}