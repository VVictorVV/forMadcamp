import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabaseClient';

// POST /api/polls
export async function POST(req) {
  try {
    // 1. 인증 토큰 추출 및 검증
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 }
      );
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 }
      );
    }

    // 2. 요청 본문 파싱
    const { pollName, deadline, options } = await req.json();

    // 3. 필수 필드 유효성 검사
    if (!pollName || !options || !Array.isArray(options) || options.length < 2) {
      return NextResponse.json(
        { error: 'Invalid request body. A poll must have at least 2 options.' },
        { status: 400 }
      );
    }

    // 4. 유저의 프로필 정보 조회 (class_id 확인)
    const { data: profile, error: profileError } = await supabase
      .from('PROFILES')
      .select('id, class_id, name')
      .eq('id', user.id)
      .single();
    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 }
      );
    }
    if (!profile.class_id) {
      return NextResponse.json(
        { error: 'User is not assigned to any class.' },
        { status: 400 }
      );
    }

    // 5. 투표 생성 (POLLS 테이블에 삽입)
    const { data: newPoll, error: pollInsertError } = await supabase
      .from('POLLS')
      .insert({
        class_id: profile.class_id,
        made_by: profile.id,
        poll_name: pollName,
        deadline: deadline || null,
      })
      .select('*')
      .single();

    if (pollInsertError) {
      console.error('Poll creation error:', pollInsertError);
      return NextResponse.json(
        { error: 'Internal server error.' },
        { status: 500 }
      );
    }

    // 6. 선택지 생성 (POLL_OPTIONS 테이블에 삽입)
    const optionsToInsert = options.map(optionName => ({
      poll_id: newPoll.poll_id,
      option_name: optionName,
    }));

    const { data: newOptions, error: optionsInsertError } = await supabase
      .from('POLL_OPTIONS')
      .insert(optionsToInsert)
      .select('*');

    if (optionsInsertError) {
      console.error('Options creation error:', optionsInsertError);
      return NextResponse.json(
        { error: 'Internal server error.' },
        { status: 500 }
      );
    }

    // 7. 응답 데이터 구성 (API22와 동일한 형식)
    const responseData = {
      pollId: newPoll.poll_id,
      pollName: newPoll.poll_name,
      creatorName: profile.name,
      createdAt: newPoll.created_at,
      deadline: newPoll.deadline,
      totalVotes: 0,
      hasVoted: false,
      currentUserVote: null,
      options: newOptions.map(option => ({
        optionId: option.option_id,
        optionName: option.option_name,
        voteCount: 0,
      })),
    };

    return NextResponse.json(responseData, { status: 201 });
  } catch (err) {
    console.error('Unexpected server error:', err);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
} 