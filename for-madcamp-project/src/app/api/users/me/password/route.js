import { NextResponse } from 'next/server';
import { supabase } from '../../../../../../lib/supabaseClient';

export async function PUT(req) {
  try {
    // 1. JWT 토큰 추출 및 검증
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Access token is invalid.' },
        { status: 401 }
      );
    }
    const token = authHeader.replace('Bearer ', '');

    // JWT 토큰에서 유저 정보 추출
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Access token is invalid.' },
        { status: 401 }
      );
    }
    const userId = user.id;
    const userEmail = user.email;

    // 2. 요청 본문 파싱
    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required.' },
        { status: 400 }
      );
    }

    // 3. 현재 비밀번호로 로그인 시도 (확인)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: currentPassword
    });
    if (signInError) {
      if (signInError.message.includes('Invalid login credentials')) {
        return NextResponse.json(
          { error: 'Current password does not match.' },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: 'Internal server error.' },
        { status: 500 }
      );
    }

    // 4. 비밀번호 변경
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });
    if (updateError) {
      if (updateError.message && updateError.message.toLowerCase().includes('password')) {
        return NextResponse.json(
          { error: 'New password does not meet policy.' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Internal server error.' },
        { status: 500 }
      );
    }

    // 5. 성공 (204 No Content)
    return new Response(null, { status: 204 });

  } catch (err) {
    console.error('Unexpected server error during password change:', err);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
} 