import { NextResponse } from 'next/server';
import { supabase } from '../../../../../../lib/supabaseClient';

// GET /api/classes/{classId}/scrums
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

    // 4. 해당 분반이 존재하는지 확인
    const { data: classExists, error: classError } = await supabase
      .from('CAMP_CLASSES')
      .select('class_id')
      .eq('class_id', classId)
      .single();
    if (classError || !classExists) {
      return NextResponse.json(
        { error: 'Class not found.' },
        { status: 404 }
      );
    }

    // 5. 날짜 파라미터 추출 (선택적, 기본값: 모든 날짜)
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');
    let targetDate = null;
    
    if (dateParam) {
      // 날짜 형식 검증 (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(dateParam)) {
        return NextResponse.json(
          { error: 'Invalid date format. Use YYYY-MM-DD format.' },
          { status: 400 }
        );
      }
      targetDate = dateParam;
    }
    // dateParam이 없으면 targetDate는 null로 유지 (모든 날짜 조회)

    // 6. 해당 분반의 모든 프로젝트 조회
    const { data: projects, error: projectsError } = await supabase
      .from('PROJECTS')
      .select('project_id, project_name')
      .eq('class_id', classId);

    if (projectsError) {
      console.error('Projects query error:', projectsError);
      return NextResponse.json(
        { error: 'Internal server error.' },
        { status: 500 }
      );
    }

    // 7. 각 프로젝트별로 스크럼과 참여자 정보 조회
    const scrumsWithDetails = await Promise.all(
      (projects || []).map(async (project) => {
        // 프로젝트의 참여자들 조회
        const { data: participators, error: participatorsError } = await supabase
          .from('PARTICIPATOR')
          .select(`
            profile_id,
            role,
            PROFILES!inner(id, name)
          `)
          .eq('project_id', project.project_id);

        if (participatorsError) {
          console.error('Participators query error:', participatorsError);
          return [];
        }

        // 스크럼 조회 (날짜 필터링 조건부 적용)
        let query = supabase
          .from('SCRUMS')
          .select(`
            scrum_id,
            date,
            done,
            plan,
            others
          `)
          .eq('project_id', project.project_id);
        
        // 특정 날짜가 지정된 경우에만 날짜 필터 적용
        if (targetDate) {
          query = query.eq('date', targetDate);
        } else {
          // 모든 날짜 조회 시 최신순으로 정렬
          query = query.order('date', { ascending: false });
        }
        
        const { data: scrums, error: scrumsError } = await query;

        if (scrumsError) {
          console.error('Scrums query error:', scrumsError);
          return [];
        }

        // 각 스크럼을 API 명세서 형식으로 변환
        return (scrums || []).map(scrum => ({
          scrumId: scrum.scrum_id,
          project: {
            projectId: project.project_id,
            projectName: project.project_name
          },
          participators: (participators || []).map(p => ({
            userId: p.profile_id,
            name: p.PROFILES.name,
            role: p.role
          })),
          date: scrum.date,
          done: scrum.done,
          plan: scrum.plan,
          others: scrum.others
        }));
      })
    );

    // 8. 모든 스크럼을 하나의 배열로 합치기
    const allScrums = scrumsWithDetails.flat();

    return NextResponse.json({ scrums: allScrums }, { status: 200 });

  } catch (err) {
    console.error('Unexpected server error:', err);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
} 