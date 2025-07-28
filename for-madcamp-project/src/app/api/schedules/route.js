import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabaseClient';

// POST /api/schedules
export async function POST(req) {
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

    // 2. 요청 본문 파싱
    const { scheduleName, when, description, participantIds } = await req.json();

    // 3. 필수 필드 유효성 검사
    if (!scheduleName || !when || !description) {
      return NextResponse.json(
        { error: 'Invalid request body.' },
        { status: 400 }
      );
    }

    // 4. participantIds 유효성 검사 (UUID 형식 확인)
    if (participantIds && Array.isArray(participantIds)) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      for (const participantId of participantIds) {
        if (typeof participantId !== 'string' || !uuidRegex.test(participantId)) {
          return NextResponse.json(
            { error: 'Invalid participant ID format. Must be valid UUID.' },
            { status: 400 }
          );
        }
      }
    }

    // 5. 날짜 형식 검증
    const scheduleDate = new Date(when);
    if (isNaN(scheduleDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format.' },
        { status: 400 }
      );
    }

    // 6. 유저의 프로필 정보 조회 (class_id 확인)
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
    if (!profile.class_id) {
      return NextResponse.json(
        { error: 'User is not assigned to any class.' },
        { status: 400 }
      );
    }

    // 7. 일정 생성 (SCHEDULES 테이블에 삽입)
    const { data: newSchedule, error: scheduleInsertError } = await supabase
      .from('SCHEDULES')
      .insert({
        class_id: profile.class_id,
        schedule_name: scheduleName,
        when: when,
        description: description,
        related_poll: null // API 33에서는 연관된 투표가 없음
      })
      .select('*')
      .single();

    if (scheduleInsertError) {
      console.error('Schedule creation error:', scheduleInsertError);
      return NextResponse.json(
        { error: 'Internal server error.' },
        { status: 500 }
      );
    }

    // 8. 생성자를 주최자로 등록
    const { error: creatorInsertError } = await supabase
      .from('SCHEDULE_USERS')
      .insert({
        schedule_id: newSchedule.schedule_id,
        profile_id: profile.id,
        role: '주최자',
        status: '참석' // 주최자는 기본적으로 참석 상태
      });

    if (creatorInsertError) {
      console.error('Creator insertion error:', creatorInsertError);
      return NextResponse.json(
        { error: 'Internal server error.' },
        { status: 500 }
      );
    }

    // 9. 초대된 참여자들을 등록 (있는 경우)
    if (participantIds && Array.isArray(participantIds) && participantIds.length > 0) {
      // 생성자 자신을 participantIds에서 제외
      const filteredParticipantIds = participantIds.filter(id => id !== profile.id);
      
      // 참여자들이 같은 분반에 속하는지 확인
      const { data: participants, error: participantsError } = await supabase
        .from('PROFILES')
        .select('id, name')
        .in('id', filteredParticipantIds)
        .eq('class_id', profile.class_id);

      if (participantsError) {
        console.error('Participants validation error:', participantsError);
        return NextResponse.json(
          { error: 'Internal server error.' },
          { status: 500 }
        );
      }

      // 유효한 참여자들만 등록 (생성자 제외)
      if (participants && participants.length > 0) {
        const participantsToInsert = participants.map(participant => ({
          schedule_id: newSchedule.schedule_id,
          profile_id: participant.id,
          role: '참여자',
          status: '미정' // 초대된 참여자는 기본적으로 미정 상태
        }));

        const { error: participantsInsertError } = await supabase
          .from('SCHEDULE_USERS')
          .insert(participantsToInsert);

        if (participantsInsertError) {
          console.error('Participants insertion error:', participantsInsertError);
          return NextResponse.json(
            { error: 'Internal server error.' },
            { status: 500 }
          );
        }
      }
    }

    // 10. 생성된 일정의 상세 정보 조회 (응답용)
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
      .eq('schedule_id', newSchedule.schedule_id)
      .single();

    if (detailsError) {
      console.error('Schedule details error:', detailsError);
      return NextResponse.json(
        { error: 'Internal server error.' },
        { status: 500 }
      );
    }

    // 11. 참여자 목록 조회
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
      .eq('schedule_id', newSchedule.schedule_id)
      .order('role', { ascending: false }); // 주최자 먼저, 그 다음 참여자

    if (participantsQueryError) {
      console.error('Participants query error:', participantsQueryError);
      return NextResponse.json(
        { error: 'Internal server error.' },
        { status: 500 }
      );
    }

    // 12. 응답 데이터 구성
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

    return NextResponse.json(responseData, { status: 201 });

  } catch (err) {
    console.error('Unexpected server error:', err);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
} 