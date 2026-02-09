import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase as clientSupabase } from '@/lib/database/supabase';

// Supabase Admin Client (Service Role)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// GET /api/admin/users - 전체 사용자 목록 조회
export async function GET(request: NextRequest) {
  try {
    // 1. Get Authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      console.error('No authorization token found');
      return NextResponse.json(
        { success: false, error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    // 2. Verify user with token using admin client
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error('Failed to verify user:', userError);
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    // 3. Check if user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || roleData?.role !== 'admin') {
      console.error('User is not admin:', user.email, roleData?.role);
      return NextResponse.json(
        { success: false, error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // 4. Fetch all user roles
    const { data: userRoles, error: userRolesError } = await supabaseAdmin
      .from('user_roles')
      .select('*')
      .order('created_at', { ascending: false });

    if (userRolesError) {
      console.error('Failed to fetch user roles:', userRolesError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch user roles' },
        { status: 500 }
      );
    }

    // 5. Fetch auth users data
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      console.error('Failed to fetch auth users:', authError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    // 6. Combine data
    const combinedUsers = userRoles
      ?.map((ur) => {
        const authUser = authData.users.find((au) => au.id === ur.user_id);

        if (!authUser) return null;

        return {
          id: ur.user_id,
          email: authUser.email || '',
          role: ur.role,
          created_at: authUser.created_at,
          updated_at: ur.updated_at,
        };
      })
      .filter(Boolean); // Remove null values

    return NextResponse.json({
      success: true,
      data: combinedUsers,
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/admin/users:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
