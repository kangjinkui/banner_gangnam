// @ts-nocheck
import { supabase, supabaseAdmin, TablesInsert, TablesUpdate, TablesRow } from './supabase';
import { Party, PartyCreateInput, PartyUpdateInput, PartyWithBannerCount } from '@/types/party';
import { QueryOptions } from '@/types';

export class PartiesService {
  /**
   * Get all parties with optional filtering and pagination
   */
  static async getAll(options?: QueryOptions): Promise<{ data: Party[]; total: number }> {
    let query = supabase.from('parties').select('*', { count: 'exact' });

    // Apply filters
    if (options?.filters) {
      if (options.filters.search) {
        query = query.ilike('name', `%${options.filters.search}%`);
      }
      if (typeof options.filters.is_active === 'boolean') {
        query = query.eq('is_active', options.filters.is_active);
      }
    }

    // Apply sorting
    if (options?.sort) {
      query = query.order(options.sort.field, { ascending: options.sort.direction === 'asc' });
    } else {
      query = query.order('name', { ascending: true });
    }

    // Apply pagination
    if (options?.page && options?.limit) {
      const from = (options.page - 1) * options.limit;
      const to = from + options.limit - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch parties: ${error.message}`);
    }

    return {
      data: data || [],
      total: count || 0,
    };
  }

  /**
   * Get a single party by ID
   */
  static async getById(id: string): Promise<Party | null> {
    const { data, error } = await supabase
      .from('parties')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch party: ${error.message}`);
    }

    return data;
  }

  /**
   * Get parties with banner counts
   */
  static async getWithBannerCounts(): Promise<PartyWithBannerCount[]> {
    const { data, error } = await supabase
      .from('parties')
      .select(`
        *,
        banners:banners(count),
        active_banners:banners!inner(count)
      `)
      .eq('banners.is_active', true);

    if (error) {
      throw new Error(`Failed to fetch parties with banner counts: ${error.message}`);
    }

    return data.map((party: any) => ({
      ...party,
      banner_count: party.banners?.[0]?.count || 0,
      active_banner_count: party.active_banners?.[0]?.count || 0,
    }));
  }

  /**
   * Create a new party
   */
  static async create(input: PartyCreateInput): Promise<Party> {
    const insertData: TablesInsert<'parties'> = {
      name: input.name,
      color: input.color,
      marker_icon_url: input.marker_icon_url,
      is_active: input.is_active ?? true,
    };

    const { data, error } = await supabase
      .from('parties')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('정당명이 이미 존재합니다.');
      }
      throw new Error(`Failed to create party: ${error.message}`);
    }

    // Log audit
    await this.logAudit('CREATE', data.id, null, data);

    return data;
  }

  /**
   * Update a party
   */
  static async update(id: string, input: PartyUpdateInput): Promise<Party> {
    // First get the current data for audit log
    const currentData = await this.getById(id);
    if (!currentData) {
      throw new Error('정당을 찾을 수 없습니다.');
    }

    const updateData: TablesUpdate<'parties'> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.color !== undefined) updateData.color = input.color;
    if (input.marker_icon_url !== undefined) updateData.marker_icon_url = input.marker_icon_url;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;

    const { data, error } = await supabase
      .from('parties')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('정당명이 이미 존재합니다.');
      }
      throw new Error(`Failed to update party: ${error.message}`);
    }

    // Log audit
    await this.logAudit('UPDATE', id, currentData, data);

    return data;
  }

  /**
   * Delete a party (soft delete by setting is_active to false)
   */
  static async delete(id: string): Promise<void> {
    const currentData = await this.getById(id);
    if (!currentData) {
      throw new Error('정당을 찾을 수 없습니다.');
    }

    const { error } = await supabase
      .from('parties')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete party: ${error.message}`);
    }

    // Log audit
    await this.logAudit('DELETE', id, currentData, { ...currentData, is_active: false });
  }

  /**
   * Hard delete a party (only for admin)
   */
  static async hardDelete(id: string): Promise<void> {
    if (!supabaseAdmin) {
      throw new Error('Admin access required');
    }

    const currentData = await this.getById(id);
    if (!currentData) {
      throw new Error('정당을 찾을 수 없습니다.');
    }

    // Check if party has associated banners
    const { count } = await supabase
      .from('banners')
      .select('id', { count: 'exact', head: true })
      .eq('party_id', id);

    if (count && count > 0) {
      throw new Error('연결된 현수막이 있어 삭제할 수 없습니다. 먼저 현수막을 삭제하세요.');
    }

    const { error } = await supabaseAdmin
      .from('parties')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to hard delete party: ${error.message}`);
    }

    // Log audit
    await this.logAudit('HARD_DELETE', id, currentData, null);
  }

  /**
   * Check if party name exists
   */
  static async nameExists(name: string, excludeId?: string): Promise<boolean> {
    let query = supabase
      .from('parties')
      .select('id', { count: 'exact', head: true })
      .eq('name', name);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { count, error } = await query;

    if (error) {
      throw new Error(`Failed to check party name: ${error.message}`);
    }

    return (count || 0) > 0;
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
        table_name: 'parties',
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