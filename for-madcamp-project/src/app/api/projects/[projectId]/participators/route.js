import { NextResponse } from 'next/server';
import { supabase } from '../../../../../../lib/supabaseClient';

export async function POST(req, { params }) {
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

    // 3. 프로젝트 존재 여부 및 정보 조회
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

    // 4. 현재 사용자의 프로필 정보 조회
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('PROFILES')
      .select('id, class_id, name')
      .eq('id', user.id)
      .single();

    if (profileError || !currentUserProfile) {
      return NextResponse.json(
        { error: 'User profile not found.' },
        { status: 404 }
      );
    }

    // 5. 분반 검증: 유저가 프로젝트와 다른 분반에 속해 있는지 확인
    if (currentUserProfile.class_id !== project.class_id) {
      return NextResponse.json(
        { error: 'Cannot join a project from another class.' },
        { status: 403 }
      );
    }

    // 6. 이미 참여 중인지 확인 (PARTICIPATOR)
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
    if (participatorsRaw.some(p => p.profile_id === user.id)) {
      return NextResponse.json(
        { error: 'Project is already full or you are already a member.' },
        { status: 409 }
      );
    }
    // 7. 프로젝트 참여 인원 확인 (최대 3명)
    if (participatorsRaw.length >= 3) {
      return NextResponse.json(
        { error: 'Project is already full or you are already a member.' },
        { status: 409 }
      );
    }

    // 8. 요청 body에서 role(선택) 추출
    let role = '팀원';
    try {
      const body = await req.json();
      if (body && body.role) role = body.role;
    } catch {}

    // 9. PARTICIPATOR에 추가
    const { error: insertError } = await supabase
      .from('PARTICIPATOR')
      .insert({ project_id: projectId, profile_id: user.id, role });
    if (insertError) {
      console.error('Participator insert error:', insertError);
      return NextResponse.json(
        { error: 'Internal server error.' },
        { status: 500 }
      );
    }

    // 10. 참여자 정보 조회 (profileId, name, role)
    const allParticipators = [...participatorsRaw, { profile_id: user.id, role }];
    const profileIds = allParticipators.map(p => p.profile_id);
    const { data: profiles, error: profilesError } = await supabase
      .from('PROFILES')
      .select('id, name')
      .in('id', profileIds);
    if (profilesError) {
      console.error('Profiles query error:', profilesError);
    }
    const participators = allParticipators.map(p => {
      const profile = profiles?.find(pr => pr.id === p.profile_id);
      return {
        profileId: p.profile_id,
        name: profile?.name || '',
        role: p.role
      };
    });

    // 11. 응답 데이터 구성
    const responseData = {
      message: 'Successfully joined the project.',
      participators
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