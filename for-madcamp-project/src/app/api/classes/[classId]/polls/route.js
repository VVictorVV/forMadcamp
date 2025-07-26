import { NextResponse } from 'next/server';
import { supabase } from '../../../../../../lib/supabaseClient';

// GET /api/classes/{classId}/polls
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

    // 2. classId 파라미터 추출
    const { classId } = await params;
    if (!classId) {
      return NextResponse.json(
        { error: 'Class ID is required.' },
        { status: 400 }
      );
    }

    // 3. 유저의 프로필 정보 조회 (class_id 확인)
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
    if (String(profile.class_id) !== String(classId)) {
      return NextResponse.json(
        { error: 'Access denied.' },
        { status: 403 }
      );
    }

    // 4. 해당 분반의 모든 투표 조회 (생성자 이름 포함)
    const { data: polls, error: pollsError } = await supabase
      .from('POLLS')
      .select(`
        poll_id,
        poll_name,
        made_by,
        created_at,
        deadline,
        PROFILES!POLLS_made_by_fkey(name)
      `)
      .eq('class_id', classId)
      .order('created_at', { ascending: false });
    if (pollsError) {
      return NextResponse.json(
        { error: 'Internal server error.' },
        { status: 500 }
      );
    }

    // 5. 각 투표별 투표수, 내 투표여부 조회
    const pollsWithVotes = await Promise.all(
      (polls || []).map(async (poll) => {
        // 총 투표수
        const { count: totalVotes, error: countError } = await supabase
          .from('VOTES')
          .select('vote_id', { count: 'exact', head: true })
          .eq('poll_id', poll.poll_id);
        // 내 투표여부
        const { data: myVote, error: myVoteError } = await supabase
          .from('VOTES')
          .select('vote_id')
          .eq('poll_id', poll.poll_id)
          .eq('profile_id', profile.id)
          .maybeSingle();
        return {
          pollId: poll.poll_id,
          pollName: poll.poll_name,
          creatorName: poll.PROFILES?.name || '',
          createdAt: poll.created_at,
          deadline: poll.deadline,
          totalVotes: totalVotes || 0,
          hasVoted: !!myVote,
        };
      })
    );

    return NextResponse.json({ polls: pollsWithVotes }, { status: 200 });
  } catch (err) {
    console.error('Unexpected server error:', err);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
} 