import { NextResponse } from 'next/server';
import { supabase } from '../../../../../../lib/supabaseClient';

// POST /api/polls/{pollId}/votes
export async function POST(req, { params }) {
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
    const { optionId } = await req.json();
    if (!optionId) {
      return NextResponse.json(
        { error: 'Invalid request body.' },
        { status: 400 }
      );
    }

    // 4. 유저의 프로필 정보 조회
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

    // 5. 투표 정보 조회 (마감 시간 확인)
    const { data: poll, error: pollError } = await supabase
      .from('POLLS')
      .select(`
        poll_id,
        poll_name,
        deadline,
        class_id
      `)
      .eq('poll_id', pollId)
      .single();
    if (pollError || !poll) {
      return NextResponse.json(
        { error: 'Poll or option not found.' },
        { status: 404 }
      );
    }

    // 6. 권한 확인 (같은 분반인지)
    if (String(profile.class_id) !== String(poll.class_id)) {
      return NextResponse.json(
        { error: 'Access denied.' },
        { status: 403 }
      );
    }

    // 7. 투표 마감 여부 확인
    if (poll.deadline && new Date() > new Date(poll.deadline)) {
      return NextResponse.json(
        { error: 'This poll is closed.' },
        { status: 403 }
      );
    }

    // 8. 선택지가 해당 투표의 것인지 확인
    const { data: option, error: optionError } = await supabase
      .from('POLL_OPTIONS')
      .select('option_id')
      .eq('option_id', optionId)
      .eq('poll_id', pollId)
      .single();
    if (optionError || !option) {
      return NextResponse.json(
        { error: 'Poll or option not found.' },
        { status: 404 }
      );
    }

    // 9. 기존 투표 삭제 (투표 변경을 위해)
    const { error: deleteError } = await supabase
      .from('VOTES')
      .delete()
      .eq('poll_id', pollId)
      .eq('profile_id', profile.id);

    if (deleteError) {
      console.error('Error deleting existing vote:', deleteError);
      return NextResponse.json(
        { error: 'Internal server error.' },
        { status: 500 }
      );
    }

    // 10. 새 투표 삽입
    const { data: newVote, error: insertError } = await supabase
      .from('VOTES')
      .insert({
        profile_id: profile.id,
        poll_id: pollId,
        option_id: optionId,
      })
      .select('*')
      .single();

    if (insertError) {
      console.error('Error inserting vote:', insertError);
      return NextResponse.json(
        { error: 'Internal server error.' },
        { status: 500 }
      );
    }

    // 11. 성공 응답
    const responseData = {
      message: 'Your vote has been successfully recorded.',
      pollId: parseInt(pollId),
      myVote: optionId,
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

// DELETE /api/polls/{pollId}/votes
export async function DELETE(req, { params }) {
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

    // 3. 유저의 프로필 정보 조회
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

    // 4. 투표 정보 조회 (마감 시간 확인)
    const { data: poll, error: pollError } = await supabase
      .from('POLLS')
      .select(`
        poll_id,
        poll_name,
        deadline,
        class_id
      `)
      .eq('poll_id', pollId)
      .single();
    if (pollError || !poll) {
      return NextResponse.json(
        { error: 'Poll not found or no vote to cancel.' },
        { status: 404 }
      );
    }

    // 5. 권한 확인 (같은 분반인지)
    if (String(profile.class_id) !== String(poll.class_id)) {
      return NextResponse.json(
        { error: 'Access denied.' },
        { status: 403 }
      );
    }

    // 6. 투표 마감 여부 확인
    if (poll.deadline && new Date() > new Date(poll.deadline)) {
      return NextResponse.json(
        { error: 'This poll is closed.' },
        { status: 403 }
      );
    }

    // 7. 기존 투표 삭제
    const { data: deletedVote, error: deleteError } = await supabase
      .from('VOTES')
      .delete()
      .eq('poll_id', pollId)
      .eq('profile_id', profile.id)
      .select('*')
      .single();

    if (deleteError) {
      // 투표가 존재하지 않는 경우
      if (deleteError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Poll not found or no vote to cancel.' },
          { status: 404 }
        );
      }
      console.error('Error deleting vote:', deleteError);
      return NextResponse.json(
        { error: 'Internal server error.' },
        { status: 500 }
      );
    }

    // 8. 성공 응답
    const responseData = {
      message: 'Your vote has been successfully cancelled.',
      pollId: parseInt(pollId),
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