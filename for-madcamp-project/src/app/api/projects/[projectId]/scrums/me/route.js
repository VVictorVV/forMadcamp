import { NextResponse } from 'next/server';
import { supabase } from '../../../../../../../lib/supabaseClient';

// GET /api/projects/{projectId}/scrums/me
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

    // 2. projectId 파라미터 추출
    const { projectId } = await params;
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required.' },
        { status: 400 }
      );
    }

    // 3. 프로젝트 존재 여부 확인
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

    // 4. 유저의 프로필 정보 조회
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

    // 5. 프로젝트 참여자 권한 확인
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

    // 6. 오늘 날짜 계산
    const today = new Date();
    const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD 형식

    // 7. 오늘 작성한 스크럼 조회
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
      .eq('project_id', projectId)
      .eq('date', todayString)
      .maybeSingle();

    if (scrumError) {
      console.error('Scrum query error:', scrumError);
      return NextResponse.json(
        { error: 'Internal server error.' },
        { status: 500 }
      );
    }

    // 8. 응답 데이터 구성
    if (scrum) {
      // 스크럼이 있는 경우
      const responseData = {
        scrumId: scrum.scrum_id,
        projectId: scrum.project_id,
        date: scrum.date,
        done: scrum.done,
        plan: scrum.plan,
        others: scrum.others
      };
      return NextResponse.json(responseData, { status: 200 });
    } else {
      // 스크럼이 없는 경우
      return NextResponse.json(null, { status: 200 });
    }

  } catch (err) {
    console.error('Unexpected server error:', err);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
} 