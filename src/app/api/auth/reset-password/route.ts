// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/database/supabase';
import crypto from 'crypto';

// Generate random temporary password
function generateTempPassword(length: number = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * POST /api/auth/reset-password
 * Request temporary password for account
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: '이메일을 입력해주세요.' },
        { status: 400 }
      );
    }

    // Check if user exists in auth.users
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
      // For security, don't reveal if email exists or not
      // Always return success to prevent email enumeration
      return NextResponse.json({
        success: true,
        message: '등록된 이메일인 경우 임시 비밀번호가 발급되었습니다.',
        tempPassword: null
      });
    }

    // Generate temporary password
    const tempPassword = generateTempPassword(10);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Expires in 24 hours

    // Hash the temp password for storage (simple hash for demo)
    const hashedTempPassword = crypto
      .createHash('sha256')
      .update(tempPassword)
      .digest('hex');

    // Delete any existing temp passwords for this user
    await supabase
      .from('temp_passwords')
      .delete()
      .eq('user_id', user.id);

    // Store temporary password in database
    const { error: insertError } = await supabase
      .from('temp_passwords')
      .insert({
        user_id: user.id,
        temp_password: hashedTempPassword,
        expires_at: expiresAt.toISOString(),
        is_used: false
      });

    if (insertError) {
      console.error('Error inserting temp password:', insertError);
      return NextResponse.json(
        { success: false, error: '임시 비밀번호 생성 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    // In production, you would send this via email
    // For development, we'll return it in the response
    console.log(`Temporary password for ${email}: ${tempPassword}`);

    return NextResponse.json({
      success: true,
      message: '임시 비밀번호가 발급되었습니다.',
      // ONLY return password in development mode
      // In production, send via email instead
      tempPassword: process.env.NODE_ENV === 'development' ? tempPassword : null,
      expiresAt: expiresAt.toISOString()
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { success: false, error: '비밀번호 재설정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
