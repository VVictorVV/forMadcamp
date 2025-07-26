import { NextResponse } from 'next/server';
import { supabase } from '../../../../../../lib/supabaseClient';

export async function GET(req, { params }) {
  try {
    // 1. JWT 토큰 추출 및 검증
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // JWT 토큰 검증
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 }
      );
    }

    // 2. 경로 파라미터에서 userId 추출
    const { userId } = await params;
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required.' },
        { status: 400 }
      );
    }

    // 3. 권한 검증: 자신의 정보만 조회 가능
    if (user.id !== userId) {
      return NextResponse.json(
        { error: 'Access denied.' },
        { status: 403 }
      );
    }

    // 4. 사용자 존재 여부 확인
    const { data: profile, error: profileError } = await supabase
      .from('PROFILES')
      .select('id, class_id')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User not found.' },
        { status: 404 }
      );
    }

    // 5. 사용자가 참여하고 있는 프로젝트 조회 (PARTICIPATOR 기준)
    const { data: participatorRows, error: participatorError } = await supabase
      .from('PARTICIPATOR')
      .select('project_id')
      .eq('profile_id', userId);
    if (participatorError) {
      return NextResponse.json(
        { error: 'Internal server error.' },
        { status: 500 }
      );
    }
    const projectIds = participatorRows.map(row => row.project_id);
    if (projectIds.length === 0) {
      return NextResponse.json({ projects: [] }, { status: 200 });
    }
    // 프로젝트 정보 조회
    const { data: projects, error: projectsError } = await supabase
      .from('PROJECTS')
      .select('*')
      .in('project_id', projectIds)
      .order('created_at', { ascending: false });
    if (projectsError) {
      console.error('Projects query error:', projectsError);
      return NextResponse.json(
        { error: 'Internal server error.' },
        { status: 500 }
      );
    }
    // 각 프로젝트의 참여자 정보 조회
    const allProjectIds = projects.map(p => p.project_id);
    const { data: allParticipators, error: allParticipatorsError } = await supabase
      .from('PARTICIPATOR')
      .select('project_id, profile_id, role')
      .in('project_id', allProjectIds);
    if (allParticipatorsError) {
      return NextResponse.json(
        { error: 'Internal server error.' },
        { status: 500 }
      );
    }
    // 참여자 프로필 정보 조회
    const allProfileIds = allParticipators.map(p => p.profile_id);
    const { data: allProfiles, error: allProfilesError } = await supabase
      .from('PROFILES')
      .select('id, name')
      .in('id', allProfileIds);
    if (allProfilesError) {
      return NextResponse.json(
        { error: 'Internal server error.' },
        { status: 500 }
      );
    }
    // 프로젝트별 참여자 매핑
    const projectsWithParticipants = projects.map(project => {
      const participators = allParticipators
        .filter(p => p.project_id === project.project_id)
        .map(p => {
          const profile = allProfiles.find(pr => pr.id === p.profile_id);
          return {
            profileId: p.profile_id,
            name: profile?.name || '',
            role: p.role
          };
        });
      return {
        projectId: project.project_id,
        projectName: project.project_name,
        classId: project.class_id,
        weekNum: project.week_num,
        createdAt: project.created_at,
        planning: project.planning,
        progress: project.progress,
        representativeImageUri: project.representative_image_uri,
        participators
      };
    });
    // 7. 응답 데이터 구성
    const responseData = {
      projects: projectsWithParticipants
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