import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabaseClient';

export async function POST(req) {
  try {
    // 테스트용 사용자 데이터 생성
    const testUsers = [
      {
        email: 'test1@example.com',
        password: 'password123',
        name: '김테스트1'
      },
      {
        email: 'test2@example.com',
        password: 'password123',
        name: '이테스트2'
      },
      {
        email: 'test3@example.com',
        password: 'password123',
        name: '박테스트3'
      }
    ];

    const createdUsers = [];

    for (const userData of testUsers) {
      // Supabase Auth로 사용자 생성
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            name: userData.name,
          },
        },
      });

      if (authError) {
        console.error(`Error creating user ${userData.email}:`, authError);
        continue;
      }

      if (authData.user) {
        createdUsers.push({
          id: authData.user.id,
          email: authData.user.email,
          name: authData.user.user_metadata.name,
          createdAt: authData.user.created_at
        });
      }
    }

    return NextResponse.json({
      message: 'Test users created successfully',
      users: createdUsers
    }, { status: 201 });

  } catch (err) {
    console.error('Unexpected server error:', err);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
} 