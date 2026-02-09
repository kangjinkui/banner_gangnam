// @ts-nocheck
import { supabase, supabaseAdmin, TablesInsert, TablesUpdate } from './supabase';
import { Banner, BannerWithParty, BannerCreateInput, BannerUpdateInput, BannerStats } from '@/types/banner';
import { QueryOptions } from '@/types';

export class BannersService {
  /**
   * Get all banners with optional filtering and pagination
   */
  static async getAll(options?: QueryOptions): Promise<{ data: BannerWithParty[]; total: number }> {
    let query = supabase
      .from('banners')
      .select(`
        *,
        party:parties(*)
      `, { count: 'exact' });

    // Apply filters
    if (options?.filters) {
      if (options.filters.banner_type) {
        if (Array.isArray(options.filters.banner_type)) {
          query = query.in('banner_type', options.filters.banner_type);
        } else if (options.filters.banner_type !== 'all') {
          query = query.eq('banner_type', options.filters.banner_type);
        }
      }
      if (options.filters.department) {
        query = query.eq('department', options.filters.department);
      }
      if (options.filters.search) {
        query = query.or(`text.ilike.%${options.filters.search}%,address.ilike.%${options.filters.search}%,memo.ilike.%${options.filters.search}%`);
      }
      if (typeof options.filters.is_active === 'boolean') {
        query = query.eq('is_active', options.filters.is_active);
      }
      if (options.filters.party_id && Array.isArray(options.filters.party_id) && options.filters.party_id.length > 0) {
        query = query.in('party_id', options.filters.party_id);
      }
      if (options.filters.administrative_district && Array.isArray(options.filters.administrative_district) && options.filters.administrative_district.length > 0) {
        query = query.in('administrative_district', options.filters.administrative_district);
      }
      if (options.filters.date_range) {
        if (options.filters.date_range.start_date) {
          query = query.gte('end_date', options.filters.date_range.start_date);
        }
        if (options.filters.date_range.end_date) {
          query = query.lte('start_date', options.filters.date_range.end_date);
        }
      }
      if (typeof options.filters.is_expired === 'boolean') {
        const nowIso = new Date().toISOString();
        if (options.filters.is_expired) {
          query = query.lt('end_date', nowIso);
          if (options.filters.exclude_rally_expired) {
            query = query.neq('banner_type', 'rally');
          }
        } else {
          query = query.or(`end_date.is.null,end_date.gte.${nowIso},banner_type.eq.rally`);
        }
      }
    }

    // Apply sorting
    if (options?.sort) {
      query = query.order(options.sort.field, { ascending: options.sort.direction === 'asc' });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
    if (options?.page && options?.limit) {
      const from = (options.page - 1) * options.limit;
      const to = from + options.limit - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch banners: ${error.message}`);
    }

    return {
      data: data || [],
      total: count || 0,
    };
  }

  /**
   * Get banners within map bounds
   */
  static async getByBounds(bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }): Promise<BannerWithParty[]> {
    const { data, error } = await supabase
      .from('banners')
      .select(`
        *,
        party:parties(*)
      `)
      .gte('lat', bounds.south)
      .lte('lat', bounds.north)
      .gte('lng', bounds.west)
      .lte('lng', bounds.east)
      .eq('is_active', true);

    if (error) {
      throw new Error(`Failed to fetch banners by bounds: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get a single banner by ID
   */
  static async getById(id: string): Promise<BannerWithParty | null> {
    const { data, error } = await supabase
      .from('banners')
      .select(`
        *,
        party:parties(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch banner: ${error.message}`);
    }

    return data;
  }

  /**
   * Create a new banner
   */
  static async create(input: BannerCreateInput & { lat: number; lng: number; administrative_district?: string; image_url?: string; thumbnail_url?: string }): Promise<Banner> {
    const isPolitical = input.banner_type === 'political';
    const isPublic = input.banner_type === 'public';
    const insertData: TablesInsert<'banners'> = {
      banner_type: input.banner_type,
      party_id: isPolitical ? input.party_id : null,
      department: isPublic ? input.department : null,
      address: input.address,
      lat: input.lat,
      lng: input.lng,
      administrative_district: input.administrative_district,
      text: input.text,
      start_date: input.start_date ?? null,
      end_date: input.end_date ?? null,
      image_url: input.image_url,
      thumbnail_url: input.thumbnail_url,
      memo: input.memo,
      is_active: input.is_active ?? true,
    };

    const { data, error } = await supabase
      .from('banners')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create banner: ${error.message}`);
    }

    // Log audit
    await this.logAudit('CREATE', data.id, null, data);

    return data;
  }

  /**
   * Update a banner
   */
  static async update(id: string, input: BannerUpdateInput & { lat?: number; lng?: number; administrative_district?: string; image_url?: string; thumbnail_url?: string }): Promise<Banner> {
    // First get the current data for audit log
    const currentData = await this.getById(id);
    if (!currentData) {
      throw new Error('현수막을 찾을 수 없습니다.');
    }

    const updateData: TablesUpdate<'banners'> = {};
    if (input.banner_type !== undefined) updateData.banner_type = input.banner_type;
    if (input.party_id !== undefined) updateData.party_id = input.party_id;
    if (input.department !== undefined) updateData.department = input.department;
    if (input.address !== undefined) updateData.address = input.address;
    if (input.lat !== undefined) updateData.lat = input.lat;
    if (input.lng !== undefined) updateData.lng = input.lng;
    if (input.administrative_district !== undefined) updateData.administrative_district = input.administrative_district;
    if (input.text !== undefined) updateData.text = input.text;
    if (input.start_date !== undefined) updateData.start_date = input.start_date;
    if (input.end_date !== undefined) updateData.end_date = input.end_date;
    if (input.image_url !== undefined) updateData.image_url = input.image_url;
    if (input.thumbnail_url !== undefined) updateData.thumbnail_url = input.thumbnail_url;
    if (input.memo !== undefined) updateData.memo = input.memo;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;

    const { data, error } = await supabase
      .from('banners')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update banner: ${error.message}`);
    }

    // Log audit
    await this.logAudit('UPDATE', id, currentData, data);

    return data;
  }

  /**
   * Delete a banner (soft delete by setting is_active to false)
   */
  static async delete(id: string): Promise<void> {
    const currentData = await this.getById(id);
    if (!currentData) {
      throw new Error('현수막을 찾을 수 없습니다.');
    }

    const { error } = await supabase
      .from('banners')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete banner: ${error.message}`);
    }

    // Log audit
    await this.logAudit('DELETE', id, currentData, { ...currentData, is_active: false });
  }

  /**
   * Hard delete a banner (only for admin)
   */
  static async hardDelete(id: string): Promise<void> {
    if (!supabaseAdmin) {
      throw new Error('Admin access required');
    }

    const currentData = await this.getById(id);
    if (!currentData) {
      throw new Error('현수막을 찾을 수 없습니다.');
    }

    const { error } = await supabaseAdmin
      .from('banners')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to hard delete banner: ${error.message}`);
    }

    // Log audit
    await this.logAudit('HARD_DELETE', id, currentData, null);
  }

  /**
   * Get banner statistics
   */
  static async getStats(filters?: any): Promise<BannerStats> {
    let query = supabase
      .from('banners')
      .select('*, party:parties(*)');

    // Apply filters if provided
    if (filters?.party_id?.length) {
      query = query.in('party_id', filters.party_id);
    }
    if (filters?.administrative_district?.length) {
      query = query.in('administrative_district', filters.administrative_district);
    }
    if (filters?.banner_type) {
      if (Array.isArray(filters.banner_type)) {
        query = query.in('banner_type', filters.banner_type);
      } else if (filters.banner_type !== 'all') {
        query = query.eq('banner_type', filters.banner_type);
      }
    }
    if (filters?.department) {
      query = query.eq('department', filters.department);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch banner stats: ${error.message}`);
    }

    const now = new Date();
    const isExpired = (banner: BannerWithParty) =>
      banner.banner_type !== 'rally' &&
      !!banner.end_date &&
      new Date(banner.end_date) < now;

    const stats: BannerStats = {
      total: data.length,
      active: data.filter((b) => b.is_active).length,
      expired: data.filter((b) => isExpired(b)).length,
      by_type: {
        political: 0,
        public: 0,
        rally: 0,
      },
      by_department: {},
      by_district: {},
      by_party: {},
    };

    data.forEach((banner) => {
      // by_type
      stats.by_type[banner.banner_type]++;

      // by_department (public only)
      if (banner.banner_type === 'public' && banner.department) {
        if (!stats.by_department[banner.department]) {
          stats.by_department[banner.department] = {
            total: 0,
            active: 0,
            expired: 0,
          };
        }
        stats.by_department[banner.department].total++;
        if (banner.is_active) stats.by_department[banner.department].active++;
        if (isExpired(banner)) stats.by_department[banner.department].expired++;
      }

      // by_district
      if (banner.administrative_district) {
        stats.by_district[banner.administrative_district] =
          (stats.by_district[banner.administrative_district] || 0) + 1;
      }

      // by_party (political only)
      if (banner.banner_type === 'political' && banner.party_id) {
        stats.by_party[banner.party_id] = (stats.by_party[banner.party_id] || 0) + 1;
      }
    });

    return stats;
  }

  /**
   * Get unique administrative districts
   */
  static async getAdministrativeDistricts(): Promise<string[]> {
    const { data, error } = await supabase
      .from('banners')
      .select('administrative_district')
      .not('administrative_district', 'is', null)
      .order('administrative_district');

    if (error) {
      throw new Error(`Failed to fetch administrative districts: ${error.message}`);
    }

    const districts = [...new Set(data.map(item => item.administrative_district).filter(Boolean))];
    return districts as string[];
  }

  /**
   * Bulk update banners
   */
  static async bulkUpdate(bannerIds: string[], updates: Partial<BannerUpdateInput>): Promise<void> {
    const { error } = await supabase
      .from('banners')
      .update(updates)
      .in('id', bannerIds);

    if (error) {
      throw new Error(`Failed to bulk update banners: ${error.message}`);
    }

    // Log audit for each banner
    for (const bannerId of bannerIds) {
      await this.logAudit('BULK_UPDATE', bannerId, null, updates);
    }
  }

  /**
   * Bulk delete banners
   */
  static async bulkDelete(bannerIds: string[]): Promise<void> {
    const { error } = await supabase
      .from('banners')
      .update({ is_active: false })
      .in('id', bannerIds);

    if (error) {
      throw new Error(`Failed to bulk delete banners: ${error.message}`);
    }

    // Log audit for each banner
    for (const bannerId of bannerIds) {
      await this.logAudit('BULK_DELETE', bannerId, null, { is_active: false });
    }
  }

  /**
   * Log audit trail
   */
  private static async logAudit(
    action: string,
    recordId: string,
    oldValues: any,
    newValues: any,
    userEmail?: string
  ): Promise<void> {
    try {
      await supabase.from('audit_logs').insert({
        action_type: action,
        table_name: 'banners',
        record_id: recordId,
        old_values: oldValues,
        new_values: newValues,
        user_email: userEmail,
      });
    } catch (error) {
      // Don't fail the main operation if audit logging fails
      console.error('Failed to log audit:', error);
    }
  }
}
