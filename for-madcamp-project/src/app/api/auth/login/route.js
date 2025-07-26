import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabaseClient';

export async function POST(req) {
  try {
    // 1. 요청 본문에서 email과 password를 추출합니다.
    const { email, password } = await req.json();

    // 2. 필수 필드 유효성 검사 (400 Bad Request)
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    // 3. Supabase auth를 사용하여 이메일과 비밀번호로 로그인을 시도합니다.
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    // 4. Supabase 에러 처리
    if (error) {
      // 4-1. 유효하지 않은 로그인 정보 (401 Unauthorized)
      // Supabase는 잘못된 이메일/비밀번호에 대해 'Invalid login credentials' 에러를 반환합니다.
      if (error.message.includes('Invalid login credentials')) {
        return NextResponse.json(
          { error: 'Invalid credentials.' },
          { status: 401 }
        );
      }
      
      // 4-2. 그 외 서버 내부 에러
      console.error('Supabase login error:', error);
      return NextResponse.json(
        { error: error.message || 'Internal server error.' },
        { status: error.status || 500 }
      );
    }

    // 5. 성공 시 (200 OK)
    // 명세에 맞는 응답 객체를 구성합니다.
    if (data.session && data.user) {
      const responsePayload = {
        accessToken: data.session.access_token,
        user: {
          id: data.user.id, // Supabase user.id는 UUID(String) 타입입니다.
          name: data.user.user_metadata.name,
        },
      };
      return NextResponse.json(responsePayload, { status: 200 });
    }

    // 예외적인 경우
    return NextResponse.json(
      { error: 'Login failed unexpectedly.' },
      { status: 500 }
    );

  } catch (err) {
    // 6. 예기치 못한 서버 에러 처리
    console.error('Unexpected server error during login:', err);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}