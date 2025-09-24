import { createClient } from '@supabase/supabase-js';

// Supabase client configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side Supabase client with service role key (for admin operations)
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

// Database types (will be auto-generated in production)
export type Database = {
  public: {
    Tables: {
      parties: {
        Row: {
          id: string;
          name: string;
          color: string;
          marker_icon_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          color: string;
          marker_icon_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          color?: string;
          marker_icon_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      banners: {
        Row: {
          id: string;
          party_id: string;
          address: string;
          lat: number;
          lng: number;
          administrative_district: string | null;
          text: string;
          start_date: string;
          end_date: string;
          image_url: string | null;
          thumbnail_url: string | null;
          memo: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          party_id: string;
          address: string;
          lat: number;
          lng: number;
          administrative_district?: string | null;
          text: string;
          start_date: string;
          end_date: string;
          image_url?: string | null;
          thumbnail_url?: string | null;
          memo?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          party_id?: string;
          address?: string;
          lat?: number;
          lng?: number;
          administrative_district?: string | null;
          text?: string;
          start_date?: string;
          end_date?: string;
          image_url?: string | null;
          thumbnail_url?: string | null;
          memo?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          action_type: string;
          table_name: string;
          record_id: string;
          old_values: any | null;
          new_values: any | null;
          user_id: string | null;
          user_email: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          action_type: string;
          table_name: string;
          record_id: string;
          old_values?: any | null;
          new_values?: any | null;
          user_id?: string | null;
          user_email?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          action_type?: string;
          table_name?: string;
          record_id?: string;
          old_values?: any | null;
          new_values?: any | null;
          user_id?: string | null;
          user_email?: string | null;
          created_at?: string;
        };
      };
    };
  };
};

export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
export type TablesRow<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];