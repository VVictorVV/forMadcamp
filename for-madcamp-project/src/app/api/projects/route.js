import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabaseClient';

export async function POST(req) {
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

    // 2. 요청 본문 파싱
    const requestBody = await req.json();
    const { projectName, weekNum, planning, representativeImageUri, participators } = requestBody;

    // 3. 필수 필드 검증
    if (!projectName) {
      return NextResponse.json(
        { error: 'Project name is required.' },
        { status: 400 }
      );
    }

    if (!weekNum || weekNum < 1 || weekNum > 4) {
      return NextResponse.json(
        { error: 'Week number must be between 1 and 4.' },
        { status: 400 }
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

    if (!currentUserProfile.class_id) {
      return NextResponse.json(
        { error: 'User is not assigned to any class.' },
        { status: 400 }
      );
    }

    // 5. 이미 해당 주차에 프로젝트가 있는지 확인
    const { data: existingProjects, error: existingError } = await supabase
      .from('PROJECTS')
      .select('project_id')
      .eq('class_id', currentUserProfile.class_id)
      .eq('week_num', weekNum);

    if (existingError) {
      console.error('Existing projects query error:', existingError);
    } else if (existingProjects && existingProjects.length > 0) {
      return NextResponse.json(
        { error: 'A project already exists for this week.' },
        { status: 409 }
      );
    }

    // 6. 새 프로젝트 생성
    const newProjectData = {
      project_name: projectName,
      class_id: currentUserProfile.class_id,
      week_num: weekNum,
      planning: planning || null,
      progress: 0,
      representative_image_uri: representativeImageUri || null
    };

    const { data: newProject, error: createError } = await supabase
      .from('PROJECTS')
      .insert(newProjectData)
      .select('*')
      .single();

    if (createError) {
      console.error('Project creation error:', createError);
      return NextResponse.json(
        { error: 'Internal server error.' },
        { status: 500 }
      );
    }

    // 7. PARTICIPATOR 테이블에 참여자 추가
    // participators 배열이 없으면 생성자만 추가
    let participatorList = [
      {
        profile_id: currentUserProfile.id,
        role: '팀장'
      }
    ];
    if (Array.isArray(participators)) {
      participatorList = participators.map(p => ({
        profile_id: p.profileId,
        role: p.role || '팀원'
      }));
      // 생성자가 participators에 없으면 추가
      if (!participatorList.some(p => p.profile_id === currentUserProfile.id)) {
        participatorList.unshift({ profile_id: currentUserProfile.id, role: '팀장' });
      }
    }

    // 중복 제거
    participatorList = participatorList.filter((v,i,a)=>a.findIndex(t=>(t.profile_id===v.profile_id))===i);

    // 참여자 insert
    const participatorRows = participatorList.map(p => ({
      project_id: newProject.project_id,
      profile_id: p.profile_id,
      role: p.role
    }));
    const { error: participatorError } = await supabase
      .from('PARTICIPATOR')
      .insert(participatorRows);
    if (participatorError) {
      console.error('Participator insert error:', participatorError);
      return NextResponse.json(
        { error: 'Internal server error.' },
        { status: 500 }
      );
    }

    // 8. 참여자 정보 조회
    const profileIds = participatorList.map(p => p.profile_id);
    const { data: profiles, error: profilesError } = await supabase
      .from('PROFILES')
      .select('id, name')
      .in('id', profileIds);
    if (profilesError) {
      console.error('Profiles query error:', profilesError);
    }
    // role 매핑
    const participatorsResp = participatorList.map(p => {
      const profile = profiles?.find(pr => pr.id === p.profile_id);
      return {
        profileId: p.profile_id,
        name: profile?.name || '',
        role: p.role
      };
    });

    // 9. 응답 데이터 구성
    const responseData = {
      projectId: newProject.project_id,
      projectName: newProject.project_name,
      classId: newProject.class_id,
      weekNum: newProject.week_num,
      createdAt: newProject.created_at,
      planning: newProject.planning,
      progress: newProject.progress,
      representativeImageUri: newProject.representative_image_uri,
      participators: participatorsResp
    };

    return NextResponse.json(responseData, { status: 201 });

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