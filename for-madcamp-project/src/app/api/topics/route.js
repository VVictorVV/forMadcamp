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

    const creatorId = user.id; // 프로필 ID (UUID)
    console.log(`Creating topic for creatorId: ${creatorId}`);

    // 2. 요청 본문 파싱
    const { title, description } = await req.json();

    // 3. 필수 필드 유효성 검사 (400 Bad Request)
    if (!title || !description) {
      return NextResponse.json(
        { error: 'Invalid request body.' },
        { status: 400 }
      );
    }

    // 4. 제목 길이 검증 (50자 이내)
    if (title.length > 50) {
      return NextResponse.json(
        { error: 'Title must be 50 characters or less.' },
        { status: 400 }
      );
    }

    // 5. TOPICS 테이블에 새 주제 삽입
    const { data: newTopic, error: insertError } = await supabase
      .from('TOPICS')
      .insert({
        creator_id: creatorId,
        title: title,
        description: description
      })
      .select('*')
      .single();

    if (insertError) {
      console.error('Topic creation error:', insertError);
      return NextResponse.json(
        { error: 'Internal server error.' },
        { status: 500 }
      );
    }

    // 6. 성공 응답 (201 Created)
    const responseData = {
      topicId: newTopic.topic_id,
      creatorId: newTopic.creator_id,
      title: newTopic.title,
      description: newTopic.description,
      createdAt: newTopic.created_at
    };

    return NextResponse.json(responseData, { status: 201 });

  } catch (err) {
    // 7. 예기치 못한 서버 에러 처리
    console.error('Unexpected server error during topic creation:', err);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
} 