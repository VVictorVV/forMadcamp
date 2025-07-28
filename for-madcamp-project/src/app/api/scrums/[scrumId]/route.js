import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabaseClient';

// PUT /api/scrums/{scrumId}
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

    // 2. scrumId 파라미터 추출
    const { scrumId } = await params;
    if (!scrumId) {
      return NextResponse.json(
        { error: 'Scrum ID is required.' },
        { status: 400 }
      );
    }

    // 3. 요청 본문 파싱
    const { done, plan, others } = await req.json();
    if (!done && !plan && !others) {
      return NextResponse.json(
        { error: 'Invalid request body.' },
        { status: 400 }
      );
    }

    // 4. 스크럼 존재 여부 확인
    const { data: scrum, error: scrumError } = await supabase
      .from('SCRUMS')
      .select(`
        scrum_id,
        project_id,
        date,
        done,
        plan,
        others
      `)
      .eq('scrum_id', scrumId)
      .single();

    if (scrumError || !scrum) {
      return NextResponse.json(
        { error: 'Scrum not found.' },
        { status: 404 }
      );
    }

    // 5. 유저의 프로필 정보 조회
    const { data: profile, error: profileError } = await supabase
      .from('PROFILES')
      .select('id, name')
      .eq('id', user.id)
      .single();
    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 }
      );
    }

    // 6. 프로젝트 참여자 권한 확인 (스크럼은 프로젝트 참여자 누구나 수정 가능)
    const { data: participation, error: participationError } = await supabase
      .from('PARTICIPATOR')
      .select('profile_id')
      .eq('project_id', scrum.project_id)
      .eq('profile_id', profile.id)
      .single();

    if (participationError || !participation) {
      return NextResponse.json(
        { error: 'You are not a member of this project.' },
        { status: 403 }
      );
    }

    // 7. 스크럼 정보 업데이트
    const updateData = {};
    if (done !== undefined) updateData.done = done;
    if (plan !== undefined) updateData.plan = plan;
    if (others !== undefined) updateData.others = others;

    const { data: updatedScrum, error: updateError } = await supabase
      .from('SCRUMS')
      .update(updateData)
      .eq('scrum_id', scrumId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Scrum update error:', updateError);
      return NextResponse.json(
        { error: 'Internal server error.' },
        { status: 500 }
      );
    }

    // 8. 업데이트된 스크럼의 상세 정보 조회
    const { data: scrumDetails, error: detailsError } = await supabase
      .from('SCRUMS')
      .select(`
        scrum_id,
        project_id,
        date,
        done,
        plan,
        others
      `)
      .eq('scrum_id', scrumId)
      .single();

    if (detailsError) {
      console.error('Scrum details error:', detailsError);
      return NextResponse.json(
        { error: 'Internal server error.' },
        { status: 500 }
      );
    }

    // 9. 응답 데이터 구성
    const responseData = {
      scrumId: scrumDetails.scrum_id,
      projectId: scrumDetails.project_id,
      date: scrumDetails.date,
      done: scrumDetails.done,
      plan: scrumDetails.plan,
      others: scrumDetails.others
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