import { NextResponse } from 'next/server';
import { supabase } from '../../../../../src/lib/supabaseClient'; // 올바른 상대 경로로 수정

export async function POST(req) {
  try {
    const { email, name, password, class_id, school, instagram_uri } = await req.json();

    // 1. 필수 필드 유효성 검사 (class_id로 변경)
    if (!email || !password || !name || !class_id || !school) {
      return NextResponse.json(
        { error: 'Email, name, password, class ID, and school are required.' },
        { status: 400 }
      );
    }

    // 2. season_id=1과 class_num으로 class_id를 찾는 로직 제거 (이미 class_id를 받음)

    // 3. Supabase auth를 사용하여 신규 유저 생성
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          name: name, // handle_new_user 트리거가 사용할 데이터
        },
      },
    });

    if (signUpError) {
      if (signUpError.message.includes('already registered')) {
        return NextResponse.json({ error: 'This email is already registered.' }, { status: 409 });
      }
      console.error('API Error - Supabase signup:', signUpError);
      return NextResponse.json(
        { error: signUpError.message || 'An internal server error occurred.' },
        { status: 500 }
      );
    }
    
    // 4. 회원가입 성공 후, PROFILES 테이블에 class_id, school, instagram_url 업데이트
    if (signUpData.user) {
       const { error: updateError } = await supabase
        .from('PROFILES')
        .update({ 
          class_id: class_id,
          school: school,
          instagram_uri: instagram_uri // instagram_url -> instagram_uri
        })
        .eq('id', signUpData.user.id);
      
      if (updateError) {
        console.error('API Error - FAILED to update profile:', updateError);
        // 트랜잭션 롤백을 고려할 수 있지만, 일단 에러 로깅만 합니다.
      }

      const responseUser = {
        id: signUpData.user.id,
        email: signUpData.user.email,
        name: signUpData.user.user_metadata.name,
      };
      return NextResponse.json(responseUser, { status: 201 });
    }
    
    return NextResponse.json(
      { error: 'User creation failed unexpectedly after signup.' },
      { status: 500 }
    );

  } catch (err) {
    console.error('API Error - Unexpected server error:', err);
    return NextResponse.json(
      { error: 'An internal server error occurred.' },
      { status: 500 }
    );
  }
}
