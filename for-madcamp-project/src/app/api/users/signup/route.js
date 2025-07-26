import { NextResponse } from 'next/server';
import { supabase } from '../../../../../src/lib/supabaseClient'; // 올바른 상대 경로로 수정

export async function POST(req) {
  try {
    const { email, name, password, class_num } = await req.json();

    // 1. 필수 필드 유효성 검사 (class_num 포함)
    if (!email || !password || !name || !class_num) {
      return NextResponse.json(
        { error: 'Email, name, password, and class number are required.' },
        { status: 400 }
      );
    }

    // 2. season_id=1과 class_num으로 class_id 찾기
    const { data: classData, error: classError } = await supabase
      .from('CAMP_CLASSES')
      .select('class_id')
      .eq('season_id', 1)
      .eq('class_num', class_num)
      .single();

    if (classError || !classData) {
      console.error('API Error - find class:', classError);
      return NextResponse.json(
        { error: 'Invalid class number for the current season.' },
        { status: 404 } // Not Found
      );
    }
    const class_id = classData.class_id;

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
    
    // 4. 회원가입 성공 후, PROFILES 테이블에 class_id 업데이트
    if (signUpData.user) {
       const { error: updateError } = await supabase
        .from('PROFILES')
        .update({ class_id: class_id })
        .eq('id', signUpData.user.id);
      
      if (updateError) {
        console.error('API Error - FAILED to update profile with class_id:', updateError);
        // 여기서 트랜잭션 롤백 등을 고려할 수 있지만, 일단은 에러 로깅만 합니다.
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
