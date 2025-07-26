import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabaseClient';

export async function GET(req) {
  try {
    // 모든 사용자 프로필 조회 (테스트용)
    const { data: profiles, error } = await supabase
      .from('PROFILES')
      .select(`
        id,
        name,
        profile_image_uri,
        created_at
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching profiles:', error);
      return NextResponse.json(
        { error: 'Failed to fetch profiles.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Available user IDs for testing:',
      users: profiles || []
    }, { status: 200 });

  } catch (err) {
    console.error('Unexpected server error:', err);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
} 