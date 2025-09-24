import { supabase, TablesRow } from './supabase';
import { QueryOptions } from '@/types';

export interface AuditLog {
  id: string;
  action_type: string;
  table_name: string;
  record_id: string;
  old_values: any;
  new_values: any;
  user_id: string | null;
  user_email: string | null;
  created_at: string;
}

export interface AuditLogFilter {
  action_type?: string[];
  table_name?: string[];
  user_email?: string;
  date_range?: {
    start_date: string;
    end_date: string;
  };
}

export class AuditService {
  /**
   * Get audit logs with optional filtering and pagination
   */
  static async getAll(options?: QueryOptions & { filters?: AuditLogFilter }): Promise<{ data: AuditLog[]; total: number }> {
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' });

    // Apply filters
    if (options?.filters) {
      if (options.filters.action_type?.length) {
        query = query.in('action_type', options.filters.action_type);
      }
      if (options.filters.table_name?.length) {
        query = query.in('table_name', options.filters.table_name);
      }
      if (options.filters.user_email) {
        query = query.eq('user_email', options.filters.user_email);
      }
      if (options.filters.date_range) {
        if (options.filters.date_range.start_date) {
          query = query.gte('created_at', options.filters.date_range.start_date);
        }
        if (options.filters.date_range.end_date) {
          query = query.lte('created_at', options.filters.date_range.end_date);
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
      throw new Error(`Failed to fetch audit logs: ${error.message}`);
    }

    return {
      data: data || [],
      total: count || 0,
    };
  }

  /**
   * Get audit logs for a specific record
   */
  static async getByRecordId(tableName: string, recordId: string): Promise<AuditLog[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('table_name', tableName)
      .eq('record_id', recordId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch audit logs for record: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Create an audit log entry
   */
  static async create({
    actionType,
    tableName,
    recordId,
    oldValues,
    newValues,
    userId,
    userEmail,
  }: {
    actionType: string;
    tableName: string;
    recordId: string;
    oldValues?: any;
    newValues?: any;
    userId?: string;
    userEmail?: string;
  }): Promise<AuditLog> {
    const { data, error } = await supabase
      .from('audit_logs')
      .insert({
        action_type: actionType,
        table_name: tableName,
        record_id: recordId,
        old_values: oldValues,
        new_values: newValues,
        user_id: userId,
        user_email: userEmail,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create audit log: ${error.message}`);
    }

    return data;
  }

  /**
   * Get audit statistics
   */
  static async getStats(days: number = 30): Promise<{
    total: number;
    by_action: Record<string, number>;
    by_table: Record<string, number>;
    by_user: Record<string, number>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('audit_logs')
      .select('action_type, table_name, user_email')
      .gte('created_at', startDate.toISOString());

    if (error) {
      throw new Error(`Failed to fetch audit stats: ${error.message}`);
    }

    const stats = {
      total: data.length,
      by_action: {} as Record<string, number>,
      by_table: {} as Record<string, number>,
      by_user: {} as Record<string, number>,
    };

    data.forEach(log => {
      // Count by action type
      stats.by_action[log.action_type] = (stats.by_action[log.action_type] || 0) + 1;

      // Count by table name
      stats.by_table[log.table_name] = (stats.by_table[log.table_name] || 0) + 1;

      // Count by user
      const user = log.user_email || 'Anonymous';
      stats.by_user[user] = (stats.by_user[user] || 0) + 1;
    });

    return stats;
  }

  /**
   * Clean up old audit logs (older than specified days)
   */
  static async cleanup(olderThanDays: number = 365): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const { count, error } = await supabase
      .from('audit_logs')
      .delete({ count: 'exact' })
      .lt('created_at', cutoffDate.toISOString());

    if (error) {
      throw new Error(`Failed to cleanup audit logs: ${error.message}`);
    }

    return count || 0;
  }
}