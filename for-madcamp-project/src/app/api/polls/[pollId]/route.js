import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabaseClient';

// GET /api/polls/{pollId}
export async function GET(req, { params }) {
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

    // 2. pollId 파라미터 추출
    const { pollId } = await params;
    if (!pollId) {
      return NextResponse.json(
        { error: 'Poll ID is required.' },
        { status: 400 }
      );
    }

    // 3. 투표 정보 조회 (생성자 정보 포함)
    const { data: poll, error: pollError } = await supabase
      .from('POLLS')
      .select(`
        poll_id,
        poll_name,
        made_by,
        created_at,
        deadline,
        class_id,
        PROFILES!POLLS_made_by_fkey(name)
      `)
      .eq('poll_id', pollId)
      .single();
    if (pollError || !poll) {
      return NextResponse.json(
        { error: 'Poll not found.' },
        { status: 404 }
      );
    }

    // 4. 유저의 프로필 정보 조회 (권한 확인)
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
    if (String(profile.class_id) !== String(poll.class_id)) {
      return NextResponse.json(
        { error: 'Access denied.' },
        { status: 403 }
      );
    }

    // 5. 총 투표수 조회
    const { count: totalVotes, error: countError } = await supabase
      .from('VOTES')
      .select('vote_id', { count: 'exact', head: true })
      .eq('poll_id', pollId);

    // 6. 현재 유저의 투표 정보 조회
    const { data: myVote, error: myVoteError } = await supabase
      .from('VOTES')
      .select('option_id')
      .eq('poll_id', pollId)
      .eq('profile_id', profile.id)
      .maybeSingle();

    // 7. 투표 선택지 및 각 선택지별 투표수 조회
    const { data: options, error: optionsError } = await supabase
      .from('POLL_OPTIONS')
      .select(`
        option_id,
        option_name
      `)
      .eq('poll_id', pollId)
      .order('option_id');

    if (optionsError) {
      return NextResponse.json(
        { error: 'Internal server error.' },
        { status: 500 }
      );
    }

    // 8. 각 선택지별 투표수 계산
    const optionsWithVotes = await Promise.all(
      (options || []).map(async (option) => {
        const { count: voteCount, error: voteCountError } = await supabase
          .from('VOTES')
          .select('vote_id', { count: 'exact', head: true })
          .eq('option_id', option.option_id);
        return {
          optionId: option.option_id,
          optionName: option.option_name,
          voteCount: voteCount || 0,
        };
      })
    );

    // 9. 응답 데이터 구성
    const responseData = {
      pollId: poll.poll_id,
      pollName: poll.poll_name,
      creatorName: poll.PROFILES?.name || '',
      createdAt: poll.created_at,
      deadline: poll.deadline,
      totalVotes: totalVotes || 0,
      hasVoted: !!myVote,
      currentUserVote: myVote?.option_id || null,
      options: optionsWithVotes,
    };

    return NextResponse.json(responseData, { status: 200 });
  } catch (err) {
    console.error('Unexpected server error:', err);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}

// PUT /api/polls/{pollId}
export async function PUT(req, { params }) {
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

    // 2. pollId 파라미터 추출
    const { pollId } = await params;
    if (!pollId) {
      return NextResponse.json(
        { error: 'Poll ID is required.' },
        { status: 400 }
      );
    }

    // 3. 요청 본문 파싱
    const { pollName, deadline } = await req.json();
    if (!pollName && !deadline) {
      return NextResponse.json(
        { error: 'Invalid request body.' },
        { status: 400 }
      );
    }

    // 4. 투표 정보 조회 (생성자 확인)
    const { data: poll, error: pollError } = await supabase
      .from('POLLS')
      .select(`
        poll_id,
        poll_name,
        made_by,
        created_at,
        deadline,
        class_id,
        PROFILES!POLLS_made_by_fkey(name)
      `)
      .eq('poll_id', pollId)
      .single();
    if (pollError || !poll) {
      return NextResponse.json(
        { error: 'Poll not found.' },
        { status: 404 }
      );
    }

    // 5. 생성자 권한 확인
    if (poll.made_by !== user.id) {
      return NextResponse.json(
        { error: 'You are not the creator of this poll.' },
        { status: 403 }
      );
    }

    // 6. 투표 정보 업데이트
    const updateData = {};
    if (pollName !== undefined) updateData.poll_name = pollName;
    if (deadline !== undefined) updateData.deadline = deadline;

    const { data: updatedPoll, error: updateError } = await supabase
      .from('POLLS')
      .update(updateData)
      .eq('poll_id', pollId)
      .select(`
        poll_id,
        poll_name,
        made_by,
        created_at,
        deadline,
        class_id,
        PROFILES!POLLS_made_by_fkey(name)
      `)
      .single();

    if (updateError) {
      console.error('Poll update error:', updateError);
      return NextResponse.json(
        { error: 'Internal server error.' },
        { status: 500 }
      );
    }

    // 7. 총 투표수 조회
    const { count: totalVotes, error: countError } = await supabase
      .from('VOTES')
      .select('vote_id', { count: 'exact', head: true })
      .eq('poll_id', pollId);

    // 8. 현재 유저의 투표 정보 조회
    const { data: myVote, error: myVoteError } = await supabase
      .from('VOTES')
      .select('option_id')
      .eq('poll_id', pollId)
      .eq('profile_id', user.id)
      .maybeSingle();

    // 9. 투표 선택지 및 각 선택지별 투표수 조회
    const { data: options, error: optionsError } = await supabase
      .from('POLL_OPTIONS')
      .select(`
        option_id,
        option_name
      `)
      .eq('poll_id', pollId)
      .order('option_id');

    if (optionsError) {
      return NextResponse.json(
        { error: 'Internal server error.' },
        { status: 500 }
      );
    }

    // 10. 각 선택지별 투표수 계산
    const optionsWithVotes = await Promise.all(
      (options || []).map(async (option) => {
        const { count: voteCount, error: voteCountError } = await supabase
          .from('VOTES')
          .select('vote_id', { count: 'exact', head: true })
          .eq('option_id', option.option_id);
        return {
          optionId: option.option_id,
          optionName: option.option_name,
          voteCount: voteCount || 0,
        };
      })
    );

    // 11. 응답 데이터 구성 (API22와 동일한 형식)
    const responseData = {
      pollId: updatedPoll.poll_id,
      pollName: updatedPoll.poll_name,
      creatorName: updatedPoll.PROFILES?.name || '',
      createdAt: updatedPoll.created_at,
      deadline: updatedPoll.deadline,
      totalVotes: totalVotes || 0,
      hasVoted: !!myVote,
      currentUserVote: myVote?.option_id || null,
      options: optionsWithVotes,
    };

    return NextResponse.json(responseData, { status: 200 });
  } catch (err) {
    console.error('Unexpected server error:', err);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
} 