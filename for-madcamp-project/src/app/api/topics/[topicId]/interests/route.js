import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabaseClient';

export async function POST(req, { params }) {
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
    const { topicId } = params;
    console.log(`Expressing interest for topicId: ${topicId} by userId: ${userId}`);

    // 2. topicId 유효성 검사
    if (!topicId || isNaN(parseInt(topicId))) {
      return NextResponse.json(
        { error: 'Invalid topic ID.' },
        { status: 400 }
      );
    }

    // 3. 요청 본문 파싱
    const { level } = await req.json();

    // 4. level 유효성 검사
    if (!level || !Number.isInteger(level) || level < 1 || level > 5) {
      return NextResponse.json(
        { error: 'Interest level must be between 1 and 5.' },
        { status: 400 }
      );
    }

    // 5. 해당 주제가 존재하는지 확인
    const { data: topic, error: topicError } = await supabase
      .from('TOPICS')
      .select('topic_id, creator_id')
      .eq('topic_id', topicId)
      .single();

    if (topicError || !topic) {
      return NextResponse.json(
        { error: 'Topic not found.' },
        { status: 404 }
      );
    }

    // 6. 자신이 생성한 주제에는 의견을 표명할 수 없는지 확인 (정책에 따라)
    if (topic.creator_id === userId) {
      return NextResponse.json(
        { error: 'You cannot express interest in your own topic.' },
        { status: 403 }
      );
    }

    // 7. 기존 관심 정보 확인
    const { data: existingInterest, error: existingError } = await supabase
      .from('TOPIC_INTERESTS')
      .select('*')
      .eq('profile_id', userId)
      .eq('topic_id', topicId)
      .single();

    let isNewInterest = false;

    if (existingError && existingError.code !== 'PGRST116') {
      // PGRST116는 "결과가 없음" 에러
      console.error('Error checking existing interest:', existingError);
      return NextResponse.json(
        { error: 'Internal server error.' },
        { status: 500 }
      );
    }

    // 8. 관심 정보 생성 또는 수정
    if (!existingInterest) {
      // 새로운 관심 정보 생성
      const { error: insertError } = await supabase
        .from('TOPIC_INTERESTS')
        .insert({
          profile_id: userId,
          topic_id: topicId,
          level: level
        });

      if (insertError) {
        console.error('Error inserting interest:', insertError);
        return NextResponse.json(
          { error: 'Internal server error.' },
          { status: 500 }
        );
      }
      isNewInterest = true;
    } else {
      // 기존 관심 정보 수정
      const { error: updateError } = await supabase
        .from('TOPIC_INTERESTS')
        .update({ level: level })
        .eq('profile_id', userId)
        .eq('topic_id', topicId);

      if (updateError) {
        console.error('Error updating interest:', updateError);
        return NextResponse.json(
          { error: 'Internal server error.' },
          { status: 500 }
        );
      }
    }

    // 9. 해당 주제의 최신 관심 목록 조회
    const { data: interests, error: interestsError } = await supabase
      .from('TOPIC_INTERESTS')
      .select(`
        level,
        PROFILES!TOPIC_INTERESTS_profile_id_fkey(
          id
        )
      `)
      .eq('topic_id', topicId);

    if (interestsError) {
      console.error('Error fetching interests:', interestsError);
      return NextResponse.json(
        { error: 'Internal server error.' },
        { status: 500 }
      );
    }

    // 10. 성공 응답
    const responseData = {
      message: 'Your interest has been successfully recorded.',
      topicId: parseInt(topicId),
      interests: interests.map(interest => ({
        userId: interest.PROFILES.id,
        level: interest.level
      }))
    };

    return NextResponse.json(responseData, { 
      status: isNewInterest ? 201 : 200 
    });

  } catch (err) {
    // 11. 예기치 못한 서버 에러 처리
    console.error('Unexpected server error during interest expression:', err);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
} 