import { NextResponse } from 'next/server';
import { supabase } from '../../../../../../../lib/supabaseClient';

// PUT /api/schedules/{scheduleId}/participants/me
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
    const { status } = await req.json();
    if (!status) {
      return NextResponse.json(
        { error: 'Status is required.' },
        { status: 400 }
      );
    }

    // 4. 상태 값 유효성 검사
    const validStatuses = ['참석', '불참', '미정'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value. Must be one of \'참석\', \'불참\', \'미정\'.' },
        { status: 400 }
      );
    }

    // 5. 일정 존재 여부 확인
    const { data: schedule, error: scheduleError } = await supabase
      .from('SCHEDULES')
      .select('schedule_id, class_id')
      .eq('schedule_id', scheduleId)
      .single();

    if (scheduleError || !schedule) {
      return NextResponse.json(
        { error: 'Schedule not found.' },
        { status: 404 }
      );
    }

    // 6. 유저의 프로필 정보 조회
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

    // 7. 권한 확인: 같은 분반에 속하는지 확인
    if (String(profile.class_id) !== String(schedule.class_id)) {
      return NextResponse.json(
        { error: 'Access denied.' },
        { status: 403 }
      );
    }

    // 8. 현재 사용자의 기존 참여 정보 조회
    const { data: existingParticipation, error: participationError } = await supabase
      .from('SCHEDULE_USERS')
      .select('role, status')
      .eq('schedule_id', scheduleId)
      .eq('profile_id', profile.id)
      .maybeSingle();

    if (participationError) {
      console.error('Participation query error:', participationError);
      return NextResponse.json(
        { error: 'Internal server error.' },
        { status: 500 }
      );
    }

    // 9. 주최자 권한 검증 (주최자는 '참석' 상태를 유지해야 함)
    if (existingParticipation && existingParticipation.role === '주최자') {
      if (status !== '참석') {
        return NextResponse.json(
          { error: 'The creator cannot change their status from \'attending\'.' },
          { status: 403 }
        );
      }
    }

    // 10. 참여 상태 업데이트 또는 새로 추가
    let upsertResult;
    if (existingParticipation) {
      // 기존 참여자: 상태만 업데이트
      const { data: updatedParticipation, error: updateError } = await supabase
        .from('SCHEDULE_USERS')
        .update({ status: status })
        .eq('schedule_id', scheduleId)
        .eq('profile_id', profile.id)
        .select('role, status')
        .single();

      if (updateError) {
        console.error('Participation update error:', updateError);
        return NextResponse.json(
          { error: 'Internal server error.' },
          { status: 500 }
        );
      }
      upsertResult = updatedParticipation;
    } else {
      // 새로운 참여자: 새로 추가
      const { data: newParticipation, error: insertError } = await supabase
        .from('SCHEDULE_USERS')
        .insert({
          schedule_id: scheduleId,
          profile_id: profile.id,
          role: '참여자',
          status: status
        })
        .select('role, status')
        .single();

      if (insertError) {
        console.error('Participation insertion error:', insertError);
        return NextResponse.json(
          { error: 'Internal server error.' },
          { status: 500 }
        );
      }
      upsertResult = newParticipation;
    }

    // 11. 응답 데이터 구성
    const responseData = {
      message: 'Your participation status has been updated successfully.',
      scheduleId: parseInt(scheduleId),
      myStatus: upsertResult.role === '주최자' ? '주최자' : upsertResult.status
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