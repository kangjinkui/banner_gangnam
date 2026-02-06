// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/database/supabase';
import { TempPassword } from '@/types/auth';
import crypto from 'crypto';

/**
 * POST /api/auth/login-with-temp
 * Login with temporary password
 */
export async function POST(request: NextRequest) {
  try {
    const { email, tempPassword } = await request.json();

    if (!email || !tempPassword) {
      return NextResponse.json(
        { success: false, error: '이메일과 임시 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    // Get user by email
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('Error fetching users:', authError);
      return NextResponse.json(
        { success: false, error: '사용자 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    const user = authData.users.find(u => u.email === email);

    if (!user) {
      return NextResponse.json(
        { success: false, error: '이메일 또는 임시 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    // Hash the provided temp password
    const hashedTempPassword = crypto
      .createHash('sha256')
      .update(tempPassword)
      .digest('hex');

    // Check temp password in database
    const { data: tempPwData, error: tempPwError } = await supabase
      .from('temp_passwords')
      .select('*')
      .eq('user_id', user.id)
      .eq('temp_password', hashedTempPassword)
      .eq('is_used', false)
      .single() as { data: TempPassword | null; error: any };

    if (tempPwError || !tempPwData) {
      return NextResponse.json(
        { success: false, error: '이메일 또는 임시 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    // Check if temp password is expired
    const now = new Date();
    const expiresAt = new Date(tempPwData.expires_at);

    if (now > expiresAt) {
      return NextResponse.json(
        { success: false, error: '임시 비밀번호가 만료되었습니다. 새로운 임시 비밀번호를 발급받아주세요.' },
        { status: 401 }
      );
    }

    // Mark temp password as used
    const { error: updateError } = await supabase
      .from('temp_passwords')
      .update({ is_used: true })
      .eq('id', tempPwData.id);

    if (updateError) {
      console.error('Error updating temp password:', updateError);
    }

    // Generate a session token for the user
    // Note: This is a simplified approach. In production, use proper JWT tokens
    const sessionToken = crypto.randomBytes(32).toString('hex');

    return NextResponse.json({
      success: true,
      message: '임시 비밀번호로 로그인되었습니다. 비밀번호를 변경해주세요.',
      userId: user.id,
      email: user.email,
      requirePasswordChange: true,
      sessionToken
    });

  } catch (error) {
    console.error('Login with temp password error:', error);
    return NextResponse.json(
      { success: false, error: '로그인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
