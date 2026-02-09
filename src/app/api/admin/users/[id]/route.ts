import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

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

// PATCH /api/admin/users/[id] - 사용자 권한 변경
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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
      return NextResponse.json(
        { success: false, error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // 3. 요청 body 파싱
    const body = await request.json();
    const { role } = body;

    // 4. 역할 유효성 검증
    if (!role || !['admin', 'user'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role. Must be "admin" or "user"' },
        { status: 400 }
      );
    }

    // 5. 대상 사용자가 존재하는지 확인
    const { data: targetUser, error: targetError } = await supabaseAdmin
      .from('user_roles')
      .select('*')
      .eq('user_id', id)
      .single();

    if (targetError || !targetUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // 6. 자기 자신의 권한을 변경하려는지 확인 (선택적 보호)
    if (user.id === id && role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: '자신의 관리자 권한을 해제할 수 없습니다.',
        },
        { status: 400 }
      );
    }

    // 7. 사용자 권한 업데이트
    const { data: updatedRole, error: updateError } = await supabaseAdmin
      .from('user_roles')
      .update({
        role,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update user role:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update user role' },
        { status: 500 }
      );
    }

    // 8. 감사 로그 기록 (선택적)
    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      action: 'update_user_role',
      entity_type: 'user_roles',
      entity_id: id,
      changes: {
        old_role: targetUser.role,
        new_role: role,
      },
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      data: updatedRole,
      message: `사용자 권한이 "${role}"(으)로 변경되었습니다.`,
    });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/admin/users/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
