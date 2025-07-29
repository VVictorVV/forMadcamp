import { NextResponse } from 'next/server';
import { supabase } from '../../../../../../lib/supabaseClient';

// GET /api/classes/{classId}/schedules
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

    // 5. 해당 분반의 모든 일정 조회
    const { data: schedules, error: schedulesError } = await supabase
      .from('SCHEDULES')
      .select(`
        schedule_id,
        schedule_name,
        when,
        until,
        description,
        created_at,
        related_poll
      `)
      .eq('class_id', classId)
      .order('when', { ascending: true });

    if (schedulesError) {
      console.error('Schedules query error:', schedulesError);
      return NextResponse.json(
        { error: 'Internal server error.' },
        { status: 500 }
      );
    }

    // 6. 각 일정별 참여자 수와 현재 사용자의 참여 상태 조회
    const schedulesWithDetails = await Promise.all(
      (schedules || []).map(async (schedule) => {
        // 해당 일정의 총 참여자 수 조회
        const { count: participantCount, error: countError } = await supabase
          .from('SCHEDULE_USERS')
          .select('profile_id', { count: 'exact', head: true })
          .eq('schedule_id', schedule.schedule_id);

        // 현재 사용자의 참여 상태 조회
        const { data: myParticipation, error: participationError } = await supabase
          .from('SCHEDULE_USERS')
          .select('role, status')
          .eq('schedule_id', schedule.schedule_id)
          .eq('profile_id', profile.id)
          .maybeSingle();

        // myStatus 결정 로직
        let myStatus = null;
        if (myParticipation) {
          if (myParticipation.role === '주최자') {
            myStatus = '주최자';
          } else {
            myStatus = myParticipation.status; // '참석', '불참', '미정'
          }
        }

        return {
          scheduleId: schedule.schedule_id,
          scheduleName: schedule.schedule_name,
          when: schedule.when,
          until: schedule.until,
          participantCount: participantCount || 0,
          myStatus: myStatus
        };
      })
    );

    return NextResponse.json({ schedules: schedulesWithDetails }, { status: 200 });

  } catch (err) {
    console.error('Unexpected server error:', err);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
} 