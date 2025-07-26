import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabaseClient';

export async function PUT(req) {
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

    const userId = user.id;
    console.log(`Updating profile for userId: ${userId}`);

    // 2. 요청 본문 파싱
    const requestBody = await req.json();
    const { name, profileImageUri, interestedTopics } = requestBody;

    // 3. 최소한 하나의 필드가 있는지 확인
    if (!name && !profileImageUri && !interestedTopics) {
      return NextResponse.json(
        { error: 'At least one field to update is required.' },
        { status: 400 }
      );
    }

    // 4. 프로필 기본 정보 업데이트
    let profileUpdateData = {};
    if (name !== undefined) profileUpdateData.name = name;
    if (profileImageUri !== undefined) profileUpdateData.profile_image_uri = profileImageUri;

    let updatedProfile = null;
    if (Object.keys(profileUpdateData).length > 0) {
      const { data: profile, error: profileError } = await supabase
        .from('PROFILES')
        .update(profileUpdateData)
        .eq('id', userId)
        .select('*')
        .single();

      if (profileError) {
        console.error('Profile update error:', profileError);
        return NextResponse.json(
          { error: 'Failed to update profile.' },
          { status: 500 }
        );
      }
      updatedProfile = profile;
    }

    // 5. 관심사 정보 업데이트 (있는 경우)
    if (interestedTopics && Array.isArray(interestedTopics)) {
      // 기존 관심사 삭제
      const { error: deleteError } = await supabase
        .from('TOPIC_INTERESTS')
        .delete()
        .eq('profile_id', userId);

      if (deleteError) {
        console.error('Error deleting existing interests:', deleteError);
        return NextResponse.json(
          { error: 'Failed to update interests.' },
          { status: 500 }
        );
      }

      // 새로운 관심사 추가
      if (interestedTopics.length > 0) {
        const interestData = interestedTopics.map(topic => ({
          profile_id: userId,
          topic_id: topic.topicId,
          level: topic.level
        }));

        const { error: insertError } = await supabase
          .from('TOPIC_INTERESTS')
          .insert(interestData);

        if (insertError) {
          console.error('Error inserting new interests:', insertError);
          return NextResponse.json(
            { error: 'Failed to update interests.' },
            { status: 500 }
          );
        }
      }
    }

    // 6. 업데이트된 프로필 정보 조회 (전체 정보)
    const { data: finalProfile, error: finalProfileError } = await supabase
      .from('PROFILES')
      .select(`
        id,
        name,
        profile_image_uri,
        class_id,
        CAMP_CLASSES(
          class_num,
          SEASONS(name)
        )
      `)
      .eq('id', userId)
      .single();

    if (finalProfileError) {
      console.error('Error fetching final profile:', finalProfileError);
      return NextResponse.json(
        { error: 'Failed to fetch updated profile.' },
        { status: 500 }
      );
    }

    // 7. 관심사 정보 조회
    const { data: interestedTopicsData, error: topicsError } = await supabase
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
      console.error('Error fetching interests:', topicsError);
    }

    // 8. 응답 데이터 구성
    const responseData = {
      id: finalProfile.id,
      name: finalProfile.name,
      email: user.email,
      profileImageUri: finalProfile.profile_image_uri,
      classInfo: finalProfile.CAMP_CLASSES ? {
        seasonName: finalProfile.CAMP_CLASSES.SEASONS.name,
        classNum: finalProfile.CAMP_CLASSES.class_num
      } : null,
      interestedTopics: interestedTopicsData?.map(topic => ({
        topicId: topic.TOPICS.topic_id,
        title: topic.TOPICS.title,
        level: topic.level
      })) || []
    };

    return NextResponse.json(responseData, { status: 200 });

  } catch (err) {
    console.error(`Unexpected server error during profile update:`, err);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
} 