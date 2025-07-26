import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabaseClient';

export async function GET(req, { params }) {
  try {
    // 1. JWT 토큰 추출 및 검증
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Access token is invalid.' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // JWT 토큰 검증
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Access token is invalid.' },
        { status: 401 }
      );
    }

    // 2. 경로 파라미터에서 userId 추출 (Next.js 15에서는 params를 await해야 함)
    const { userId } = await params;
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required.' },
        { status: 400 }
      );
    }

    // 3. 사용자 프로필 정보 조회
    const { data: profile, error: profileError } = await supabase
      .from('PROFILES')
      .select(`
        id,
        name,
        profile_image_uri,
        class_id,
        CAMP_CLASSES!inner(
          class_num,
          SEASONS!inner(name)
        )
      `)
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User not found.' },
        { status: 404 }
      );
    }

    // 4. 사용자의 프로젝트 정보 조회
    const { data: projects, error: projectsError } = await supabase
      .from('PROJECTS')
      .select(`
        project_id,
        project_name,
        week_num
      `)
      .or(`profile_id_1.eq.${userId},profile_id_2.eq.${userId}`);

    if (projectsError) {
      console.error('Projects query error:', projectsError);
    }

    // 5. 사용자의 관심 주제 조회
    const { data: interestedTopics, error: topicsError } = await supabase
      .from('TOPIC_INTERESTS')
      .select(`
        level,
        TOPICS!inner(
          topic_id,
          title
        )
      `)
      .eq('profile_id', userId);

    if (topicsError) {
      console.error('Topics query error:', topicsError);
    }

    // 6. 사용자의 일정 조회
    const { data: schedules, error: schedulesError } = await supabase
      .from('SCHEDULE_USERS')
      .select(`
        role,
        SCHEDULES!inner(
          schedule_id,
          schedule_name,
          when
        )
      `)
      .eq('profile_id', userId);

    if (schedulesError) {
      console.error('Schedules query error:', schedulesError);
    }

    // 7. 응답 데이터 구성
    const responseData = {
      id: profile.id,
      name: profile.name,
      email: user.email, // auth.users에서 이메일 가져오기
      profileImageUri: profile.profile_image_uri,
      classInfo: {
        seasonName: profile.CAMP_CLASSES.SEASONS.name,
        classNum: profile.CAMP_CLASSES.class_num
      },
      projects: projects?.map(project => ({
        projectId: project.project_id,
        projectName: project.project_name,
        weekNum: project.week_num
      })) || [],
      interestedTopics: interestedTopics?.map(topic => ({
        topicId: topic.TOPICS.topic_id,
        title: topic.TOPICS.title,
        level: topic.level
      })) || [],
      schedules: schedules?.map(schedule => ({
        scheduleId: schedule.SCHEDULES.schedule_id,
        scheduleName: schedule.SCHEDULES.schedule_name,
        when: schedule.SCHEDULES.when,
        role: schedule.role
      })) || []
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