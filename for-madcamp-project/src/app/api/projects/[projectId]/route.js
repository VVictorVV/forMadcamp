import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabaseClient';

export async function PUT(req, { params }) {
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

    // 2. 경로 파라미터에서 projectId 추출
    const { projectId } = await params;
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required.' },
        { status: 400 }
      );
    }

    // 3. 요청 본문 파싱
    const requestBody = await req.json();
    const { projectName, planning, progress } = requestBody;

    // 4. 프로젝트 존재 여부 확인
    const { data: project, error: projectError } = await supabase
      .from('PROJECTS')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found.' },
        { status: 404 }
      );
    }

    // 5. 권한 검증: PARTICIPATOR에서 참여자인지 확인
    const { data: participatorsRaw, error: participatorsError } = await supabase
      .from('PARTICIPATOR')
      .select('profile_id, role')
      .eq('project_id', projectId);
    if (participatorsError) {
      return NextResponse.json(
        { error: 'Internal server error.' },
        { status: 500 }
      );
    }
    const isParticipant = participatorsRaw.some(p => p.profile_id === user.id);
    if (!isParticipant) {
      return NextResponse.json(
        { error: 'You are not a member of this project.' },
        { status: 403 }
      );
    }

    // 6. 업데이트할 데이터 준비
    const updateData = {};
    if (projectName !== undefined) updateData.project_name = projectName;
    if (planning !== undefined) updateData.planning = planning;
    if (progress !== undefined) {
      if (progress < 0 || progress > 100) {
        return NextResponse.json(
          { error: 'Progress must be between 0 and 100.' },
          { status: 400 }
        );
      }
      updateData.progress = progress;
    }

    // 7. 프로젝트 정보 업데이트
    const { data: updatedProject, error: updateError } = await supabase
      .from('PROJECTS')
      .update(updateData)
      .eq('project_id', projectId)
      .select('*')
      .single();
    if (updateError) {
      console.error('Project update error:', updateError);
      return NextResponse.json(
        { error: 'Internal server error.' },
        { status: 500 }
      );
    }

    // 8. 참여자 정보 조회 (profileId, name, role)
    const profileIds = participatorsRaw.map(p => p.profile_id);
    const { data: profiles, error: profilesError } = await supabase
      .from('PROFILES')
      .select('id, name')
      .in('id', profileIds);
    if (profilesError) {
      console.error('Profiles query error:', profilesError);
    }
    const participators = participatorsRaw.map(p => {
      const profile = profiles?.find(pr => pr.id === p.profile_id);
      return {
        profileId: p.profile_id,
        name: profile?.name || '',
        role: p.role
      };
    });

    // 9. 응답 데이터 구성
    const responseData = {
      projectId: updatedProject.project_id,
      projectName: updatedProject.project_name,
      classId: updatedProject.class_id,
      weekNum: updatedProject.week_num,
      createdAt: updatedProject.created_at,
      planning: updatedProject.planning,
      progress: updatedProject.progress,
      representativeImageUri: updatedProject.representative_image_uri,
      participators
    };

    return NextResponse.json(responseData, { status: 200 });

  } catch (err) {
    console.error('Unexpected server error:', err);
    
    // JSON 파싱 에러 처리
    if (err instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid request body.' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
} 