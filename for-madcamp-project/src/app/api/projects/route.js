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

    // 4. Get current user's profile and class
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('PROFILES')
      .select('id, class_id, name')
      .eq('id', user.id)
      .single();

    if (profileError || !currentUserProfile || !currentUserProfile.class_id) {
      return NextResponse.json({ error: 'User profile or class not found.' }, { status: 404 });
    }
    const userClassId = currentUserProfile.class_id;

    // --- New Step: Validate participants are in the same class ---
    if (Array.isArray(participators) && participators.length > 0) {
        const participatorIds = participators.map(p => p.profileId);
        
        // Also include the creator in the check, if they're not already in the list
        if (!participatorIds.includes(user.id)) {
            participatorIds.push(user.id);
        }

        const { data: profiles, error: profilesError } = await supabase
            .from('PROFILES')
            .select('id, class_id')
            .in('id', participatorIds);
        
        if (profilesError) throw profilesError;

        // Check if all fetched profiles match the creator's class_id
        const allInSameClass = profiles.every(p => p.class_id === userClassId);
        if (!allInSameClass || profiles.length !== participatorIds.length) {
            return NextResponse.json({ error: 'All participants must be from the same class.' }, { status: 400 });
        }
    }

    // 5. Check if any of the intended participants are already in a project for the given week.
    const intendedParticipantIds = (Array.isArray(participators) ? participators.map(p => p.profileId) : []);
    if (!intendedParticipantIds.includes(user.id)) {
        intendedParticipantIds.push(user.id);
    }
    
    // Find projects in the same class and week
    const { data: projectsInSameWeek, error: projectsError } = await supabase
        .from('PROJECTS')
        .select('project_id')
        .eq('class_id', userClassId)
        .eq('week_num', weekNum);

    if (projectsError) {
        console.error('Error fetching projects for the week:', projectsError);
        return NextResponse.json({ error: 'Failed to check existing projects.' }, { status: 500 });
    }

    if (projectsInSameWeek.length > 0) {
        const projectIds = projectsInSameWeek.map(p => p.project_id);
        
        // Check if any of the intended participants are in any of these projects
        const { data: existingParticipations, error: participationError } = await supabase
            .from('PARTICIPATOR')
            .select('profile_id')
            .in('project_id', projectIds)
            .in('profile_id', intendedParticipantIds);
        
        if (participationError) {
            console.error('Error checking participations:', participationError);
            return NextResponse.json({ error: 'Failed to verify participant availability.' }, { status: 500 });
        }

        if (existingParticipations.length > 0) {
            // Find which user is already in a project to give a more specific error
            const existingProfileId = existingParticipations[0].profile_id;
            const { data: profile } = await supabase.from('PROFILES').select('name').eq('id', existingProfileId).single();
            const errorMessage = `${profile?.name || 'A user'} is already in a project for week ${weekNum}.`;
            return NextResponse.json(
                { error: errorMessage },
                { status: 409 }
            );
        }
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