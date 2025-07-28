import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabaseClient';

// GET /api/schedules/{scheduleId} - 자세한 일정 정보 불러오기
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

    // 2. scheduleId 파라미터 추출
    const { scheduleId } = await params;
    if (!scheduleId) {
      return NextResponse.json(
        { error: 'Schedule ID is required.' },
        { status: 400 }
      );
    }

    // 3. 일정 상세 정보 조회
    const { data: schedule, error: scheduleError } = await supabase
      .from('SCHEDULES')
      .select(`
        schedule_id,
        schedule_name,
        when,
        description,
        created_at,
        related_poll,
        class_id
      `)
      .eq('schedule_id', scheduleId)
      .single();

    if (scheduleError || !schedule) {
      return NextResponse.json(
        { error: 'Schedule not found.' },
        { status: 404 }
      );
    }

    // 4. 유저의 프로필 정보 조회 (권한 확인용)
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

    // 5. 권한 확인: 같은 분반에 속하는지 확인
    if (String(profile.class_id) !== String(schedule.class_id)) {
      return NextResponse.json(
        { error: 'Access denied.' },
        { status: 403 }
      );
    }

    // 6. 참여자 목록 조회 (이름 포함)
    const { data: allParticipants, error: participantsError } = await supabase
      .from('SCHEDULE_USERS')
      .select(`
        role,
        status,
        PROFILES!SCHEDULE_USERS_profile_id_fkey(
          id,
          name
        )
      `)
      .eq('schedule_id', scheduleId)
      .order('role', { ascending: false }); // 주최자 먼저, 그 다음 참여자

    if (participantsError) {
      console.error('Participants query error:', participantsError);
      return NextResponse.json(
        { error: 'Internal server error.' },
        { status: 500 }
      );
    }

    // 7. 응답 데이터 구성
    const participants = (allParticipants || []).map(participant => ({
      userId: participant.PROFILES.id,
      name: participant.PROFILES.name,
      role: participant.role,
      status: participant.status
    }));

    const responseData = {
      scheduleId: schedule.schedule_id,
      scheduleName: schedule.schedule_name,
      when: schedule.when,
      description: schedule.description,
      createdAt: schedule.created_at,
      relatedPollId: schedule.related_poll,
      participants: participants
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

// PUT /api/schedules/{scheduleId} - 일정 수정
export async function PUT(req, { params }) {
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

    // 2. scheduleId 파라미터 추출
    const { scheduleId } = await params;
    if (!scheduleId) {
      return NextResponse.json(
        { error: 'Schedule ID is required.' },
        { status: 400 }
      );
    }

    // 3. 요청 본문 파싱
    const { scheduleName, when, description } = await req.json();
    if (!scheduleName && !when && !description) {
      return NextResponse.json(
        { error: 'Invalid request body.' },
        { status: 400 }
      );
    }

    // 4. 일정 존재 여부 및 주최자 권한 확인
    const { data: schedule, error: scheduleError } = await supabase
      .from('SCHEDULES')
      .select(`
        schedule_id,
        schedule_name,
        when,
        description,
        created_at,
        related_poll,
        class_id
      `)
      .eq('schedule_id', scheduleId)
      .single();

    if (scheduleError || !schedule) {
      return NextResponse.json(
        { error: 'Schedule not found.' },
        { status: 404 }
      );
    }

    // 5. 유저의 프로필 정보 조회
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

    // 6. 주최자 권한 확인
    const { data: creatorCheck, error: creatorError } = await supabase
      .from('SCHEDULE_USERS')
      .select('role')
      .eq('schedule_id', scheduleId)
      .eq('profile_id', profile.id)
      .eq('role', '주최자')
      .single();

    if (creatorError || !creatorCheck) {
      return NextResponse.json(
        { error: 'You are not the creator of this schedule.' },
        { status: 403 }
      );
    }

    // 7. 날짜 형식 검증 (when이 제공된 경우)
    if (when) {
      const scheduleDate = new Date(when);
      if (isNaN(scheduleDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format.' },
          { status: 400 }
        );
      }
    }

    // 8. 일정 정보 업데이트
    const updateData = {};
    if (scheduleName !== undefined) updateData.schedule_name = scheduleName;
    if (when !== undefined) updateData.when = when;
    if (description !== undefined) updateData.description = description;

    const { data: updatedSchedule, error: updateError } = await supabase
      .from('SCHEDULES')
      .update(updateData)
      .eq('schedule_id', scheduleId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Schedule update error:', updateError);
      return NextResponse.json(
        { error: 'Internal server error.' },
        { status: 500 }
      );
    }

    // 9. 업데이트된 일정의 상세 정보 조회
    const { data: scheduleDetails, error: detailsError } = await supabase
      .from('SCHEDULES')
      .select(`
        schedule_id,
        schedule_name,
        when,
        description,
        created_at,
        related_poll
      `)
      .eq('schedule_id', scheduleId)
      .single();

    if (detailsError) {
      console.error('Schedule details error:', detailsError);
      return NextResponse.json(
        { error: 'Internal server error.' },
        { status: 500 }
      );
    }

    // 10. 참여자 목록 조회
    const { data: allParticipants, error: participantsQueryError } = await supabase
      .from('SCHEDULE_USERS')
      .select(`
        role,
        status,
        PROFILES!SCHEDULE_USERS_profile_id_fkey(
          id,
          name
        )
      `)
      .eq('schedule_id', scheduleId)
      .order('role', { ascending: false }); // 주최자 먼저, 그 다음 참여자

    if (participantsQueryError) {
      console.error('Participants query error:', participantsQueryError);
      return NextResponse.json(
        { error: 'Internal server error.' },
        { status: 500 }
      );
    }

    // 11. 응답 데이터 구성
    const participants = (allParticipants || []).map(participant => ({
      userId: participant.PROFILES.id,
      name: participant.PROFILES.name,
      role: participant.role,
      status: participant.status
    }));

    const responseData = {
      scheduleId: scheduleDetails.schedule_id,
      scheduleName: scheduleDetails.schedule_name,
      when: scheduleDetails.when,
      description: scheduleDetails.description,
      createdAt: scheduleDetails.created_at,
      relatedPollId: scheduleDetails.related_poll,
      participants: participants
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

// DELETE /api/schedules/{scheduleId} - 일정 삭제
export async function DELETE(req, { params }) {
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

    // 2. scheduleId 파라미터 추출
    const { scheduleId } = await params;
    if (!scheduleId) {
      return NextResponse.json(
        { error: 'Schedule ID is required.' },
        { status: 400 }
      );
    }

    // 3. 일정 존재 여부 확인
    const { data: schedule, error: scheduleError } = await supabase
      .from('SCHEDULES')
      .select('schedule_id')
      .eq('schedule_id', scheduleId)
      .single();

    if (scheduleError || !schedule) {
      return NextResponse.json(
        { error: 'Schedule not found.' },
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

    // 5. 주최자 권한 확인
    const { data: creatorCheck, error: creatorError } = await supabase
      .from('SCHEDULE_USERS')
      .select('role')
      .eq('schedule_id', scheduleId)
      .eq('profile_id', profile.id)
      .eq('role', '주최자')
      .single();

    if (creatorError || !creatorCheck) {
      return NextResponse.json(
        { error: 'You are not the creator of this schedule.' },
        { status: 403 }
      );
    }

    // 6. 일정 삭제 (CASCADE로 인해 SCHEDULE_USERS도 자동 삭제됨)
    const { error: deleteError } = await supabase
      .from('SCHEDULES')
      .delete()
      .eq('schedule_id', scheduleId);

    if (deleteError) {
      console.error('Schedule deletion error:', deleteError);
      return NextResponse.json(
        { error: 'Internal server error.' },
        { status: 500 }
      );
    }

    // 7. 성공 응답 (204 No Content)
    return new NextResponse(null, { status: 204 });

  } catch (err) {
    console.error('Unexpected server error:', err);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
} 