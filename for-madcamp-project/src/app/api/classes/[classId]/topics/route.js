import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabaseClient';

export async function GET(req, { params }) {
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

    const userId = user.id;
    const { classId } = params;
    console.log(`Fetching topics for classId: ${classId} by userId: ${userId}`);

    // 2. classId 유효성 검사
    if (!classId || isNaN(parseInt(classId))) {
      return NextResponse.json(
        { error: 'Invalid class ID.' },
        { status: 400 }
      );
    }

    // 3. 요청한 유저가 해당 분반에 속하는지 확인
    const { data: userClass, error: userClassError } = await supabase
      .from('PROFILES')
      .select('class_id')
      .eq('id', userId)
      .single();

    if (userClassError || !userClass) {
      return NextResponse.json(
        { error: 'Access denied.' },
        { status: 403 }
      );
    }

    if (userClass.class_id !== parseInt(classId)) {
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

    // 5. 해당 분반의 모든 주제 조회 (생성자 정보 포함)
    const { data: topics, error: topicsError } = await supabase
      .from('TOPICS')
      .select(`
        topic_id,
        title,
        PROFILES!TOPICS_creator_id_fkey(
          id,
          name
        )
      `)
      .eq('PROFILES.class_id', classId);

    if (topicsError) {
      console.error('Error fetching topics:', topicsError);
      return NextResponse.json(
        { error: 'Internal server error.' },
        { status: 500 }
      );
    }

    // 6. 각 주제에 대한 관심 정보 조회
    const topicsWithInterests = await Promise.all(
      topics.map(async (topic) => {
        const { data: interests, error: interestsError } = await supabase
          .from('TOPIC_INTERESTS')
          .select(`
            level,
            PROFILES!TOPIC_INTERESTS_profile_id_fkey(
              id,
              name
            )
          `)
          .eq('topic_id', topic.topic_id);

        if (interestsError) {
          console.error('Error fetching interests for topic:', topic.topic_id, interestsError);
          return {
            topicId: topic.topic_id,
            title: topic.title,
            creator: {
              userId: topic.PROFILES.id,
              name: topic.PROFILES.name
            },
            interests: []
          };
        }

        return {
          topicId: topic.topic_id,
          title: topic.title,
          creator: {
            userId: topic.PROFILES.id,
            name: topic.PROFILES.name
          },
          interests: interests.map(interest => ({
            userId: interest.PROFILES.id,
            level: interest.level
          }))
        };
      })
    );

    // 7. 성공 응답 (200 OK)
    return NextResponse.json({ topics: topicsWithInterests }, { status: 200 });

  } catch (err) {
    // 8. 예기치 못한 서버 에러 처리
    console.error('Unexpected server error during topics fetch:', err);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
} 