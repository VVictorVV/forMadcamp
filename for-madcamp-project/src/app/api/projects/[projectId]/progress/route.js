import { NextResponse } from 'next/server';
import { supabase } from '../../../../../../lib/supabaseClient';

// GET /api/projects/{projectId}/progress
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

    // 3. 프로젝트 정보 조회 (진행도 포함)
    const { data: project, error: projectError } = await supabase
      .from('PROJECTS')
      .select('project_id, project_name, progress, planning')
      .eq('project_id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found.' },
        { status: 404 }
      );
    }

    // 4. 프로젝트 참여자 권한 확인
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

    // 5. 스크럼 개수 조회 (추가 정보)
    const { count: scrumCount, error: scrumCountError } = await supabase
      .from('SCRUMS')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId);

    if (scrumCountError) {
      console.error('Scrum count error:', scrumCountError);
      // 스크럼 개수 조회 실패해도 진행도는 반환
    }

    // 6. 응답 데이터 구성
    const responseData = {
      projectId: parseInt(projectId),
      projectName: project.project_name,
      progress: project.progress || 0,
      totalScrums: scrumCount || 0,
      hasPlanning: !!project.planning,
      lastUpdated: new Date().toISOString()
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