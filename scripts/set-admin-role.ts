import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// .env.local 파일 로드
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setAdminRole() {
  const email = 'hsg3511@gangnam.go.kr';

  try {
    // 1. 사용자 조회
    const { data: users, error: getUserError } = await supabase.auth.admin.listUsers();

    if (getUserError) {
      console.error('사용자 목록 조회 실패:', getUserError);
      return;
    }

    const user = users.users.find(u => u.email === email);

    if (!user) {
      console.error(`사용자를 찾을 수 없습니다: ${email}`);
      return;
    }

    console.log('사용자 발견:', user.id, user.email);

    // 2. user_roles 테이블에서 기존 역할 확인
    const { data: existingRole, error: getRoleError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (getRoleError && getRoleError.code !== 'PGRST116') { // PGRST116은 데이터 없음 에러
      console.error('역할 조회 실패:', getRoleError);
      return;
    }

    // 3. 관리자 권한 부여
    if (existingRole) {
      // 기존 역할 업데이트
      const { error: updateError } = await supabase
        .from('user_roles')
        .update({ role: 'admin' })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('역할 업데이트 실패:', updateError);
        return;
      }

      console.log('✅ 관리자 권한이 업데이트되었습니다.');
    } else {
      // 새로운 역할 추가
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({ user_id: user.id, role: 'admin' });

      if (insertError) {
        console.error('역할 추가 실패:', insertError);
        return;
      }

      console.log('✅ 관리자 권한이 부여되었습니다.');
    }

    // 4. 결과 확인
    const { data: updatedRole } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    console.log('현재 역할:', updatedRole);

  } catch (error) {
    console.error('오류 발생:', error);
  }
}

setAdminRole();
