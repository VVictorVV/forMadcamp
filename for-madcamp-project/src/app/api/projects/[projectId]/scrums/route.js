import { NextResponse } from 'next/server';
import { supabase } from '../../../../../../lib/supabaseClient';

// POST /api/projects/{projectId}/scrums
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

    // 2. projectId 파라미터 추출
    const { projectId } = await params;
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required.' },
        { status: 400 }
      );
    }

    // 3. 요청 본문 파싱
    const { done, plan, others } = await req.json();

    // 4. 필수 필드 유효성 검사
    if (!done || !plan) {
      return NextResponse.json(
        { error: 'Invalid request body.' },
        { status: 400 }
      );
    }

    // 5. 프로젝트 존재 여부 확인
    const { data: project, error: projectError } = await supabase
      .from('PROJECTS')
      .select('project_id, project_name, class_id')
      .eq('project_id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found.' },
        { status: 404 }
      );
    }

    // 6. 유저의 프로필 정보 조회
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

    // 7. 프로젝트 참여자 권한 확인
    const { data: participation, error: participationError } = await supabase
      .from('PARTICIPATOR')
      .select('profile_id, role')
      .eq('project_id', projectId)
      .eq('profile_id', profile.id)
      .single();

    if (participationError || !participation) {
      return NextResponse.json(
        { error: 'You are not a member of this project.' },
        { status: 403 }
      );
    }

    // 8. 오늘 날짜 계산
    const today = new Date();
    const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD 형식

    // 9. 오늘 이미 작성한 스크럼이 있는지 확인
    const { data: existingScrum, error: existingScrumError } = await supabase
      .from('SCRUMS')
      .select('scrum_id')
      .eq('project_id', projectId)
      .eq('date', todayString)
      .maybeSingle();

    if (existingScrumError) {
      console.error('Existing scrum query error:', existingScrumError);
      return NextResponse.json(
        { error: 'Internal server error.' },
        { status: 500 }
      );
    }

    if (existingScrum) {
      return NextResponse.json(
        { error: 'Today\'s scrum for this project already exists.' },
        { status: 409 }
      );
    }

    // 10. 스크럼 생성
    const { data: newScrum, error: scrumInsertError } = await supabase
      .from('SCRUMS')
      .insert({
        project_id: projectId,
        date: todayString,
        done: done,
        plan: plan,
        others: others || ''
      })
      .select('*')
      .single();

    if (scrumInsertError) {
      console.error('Scrum insertion error:', scrumInsertError);
      return NextResponse.json(
        { error: 'Internal server error.' },
        { status: 500 }
      );
    }

    // 11. 응답 데이터 구성
    const responseData = {
      scrumId: newScrum.scrum_id,
      projectId: newScrum.project_id,
      date: newScrum.date,
      done: newScrum.done,
      plan: newScrum.plan,
      others: newScrum.others
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