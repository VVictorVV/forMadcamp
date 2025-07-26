import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabaseClient'; // 경로 확인 필요

export async function POST(req) {
  // App Router에서는 함수의 이름(POST)으로 HTTP 메서드를 구분하므로
  // 별도의 메서드 체크가 필요 없습니다.
  
  try {
    // 1. 요청(Request) 객체에서 JSON 본문을 파싱합니다.
    const { email, name, password } = await req.json();

    // 2. 필수 필드 유효성 검사 (400 Bad Request)
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, name, and password are required.' },
        { status: 400 }
      );
    }

    // 3. Supabase auth를 사용하여 신규 유저를 생성합니다.
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          name: name,
        },
      },
    });

    // 4. Supabase 에러 처리
    if (error) {
      if (error.message.includes('already registered')) {
        // 4-1. 이미 존재하는 이메일 (409 Conflict)
        return NextResponse.json(
          { error: 'This email is already taken.' },
          { status: 409 }
        );
      }
      // 4-2. 그 외 서버 내부 에러
      console.error('Supabase signup error:', error);
      return NextResponse.json(
        { error: error.message || 'Internal server error.' },
        { status: error.status || 500 }
      );
    }
    
    // 5. 성공 시 (201 Created)
    if (data.user) {
      const responseUser = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata.name,
        createdAt: data.user.created_at,
      };
      return NextResponse.json(responseUser, { status: 201 });
    }
    
    return NextResponse.json(
      { error: 'User creation failed unexpectedly.' },
      { status: 500 }
    );

  } catch (err) {
    // 6. 예기치 못한 서버 에러 처리
    console.error('Unexpected server error:', err);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
