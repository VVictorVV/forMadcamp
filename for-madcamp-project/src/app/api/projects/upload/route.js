import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req) {
  try {
    // 1. JWT 토큰 추출 및 검증
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');

    // Create a new Supabase client with the user's token
    const supabaseWithAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseWithAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    // 2. FormData에서 파일 추출
    const formData = await req.formData();
    const file = formData.get('file');

    console.log('--- File Upload Request Received ---');
    console.log('File from FormData:', file);

    if (!file || typeof file === 'string' || !file.name) {
      console.error('Validation Failed: File is missing or not a file object.');
      return NextResponse.json({ error: 'File is required.' }, { status: 400 });
    }
    
    console.log(`File details: name=${file.name}, size=${file.size}, type=${file.type}`);

    // 3. 파일 유효성 검사 (MIME 타입, 크기 등)
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']; // webp 형식 추가
    if (!allowedMimeTypes.includes(file.type)) {
      console.error(`Validation Failed: Invalid file type - ${file.type}`);
      return NextResponse.json({ error: `Invalid file type. Only JPEG, PNG, GIF, WEBP are allowed. Received: ${file.type}` }, { status: 400 });
    }
    
    const maxFileSize = 10 * 1024 * 1024; // 10MB로 상향
    if (file.size > maxFileSize) {
        console.error(`Validation Failed: File size ${file.size} exceeds the 10MB limit.`);
        return NextResponse.json({ error: `File size exceeds the 10MB limit. Max: ${maxFileSize}, Received: ${file.size}` }, { status: 400 });
    }

    console.log('File validation successful. Proceeding to upload...');
    // 4. Supabase Storage에 파일 업로드
    // 파일 이름에 포함될 수 있는 한글 등 비ASCII 문자를 안전하게 인코딩하는 대신,
    // UUID와 확장자를 조합하여 새로운 파일 이름을 생성합니다.
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${uuidv4()}.${fileExt}`;
    
    const { data: uploadData, error: uploadError } = await supabaseWithAuth.storage
      .from('project-images') // 'project-images' 버킷 사용
      .upload(fileName, file);

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file.' }, { status: 500 });
    }

    // 5. 업로드된 파일의 공개 URL 가져오기
    const { data: urlData } = supabaseWithAuth.storage
      .from('project-images')
      .getPublicUrl(fileName);

    if (!urlData || !urlData.publicUrl) {
        return NextResponse.json({ error: 'Failed to get public URL.' }, { status: 500 });
    }

    // 6. 공개 URL 반환
    return NextResponse.json({
      message: 'File uploaded successfully.',
      url: urlData.publicUrl
    }, { status: 200 });

  } catch (err) {
    console.error('Unexpected server error:', err);
    if (err.name === 'PayloadTooLargeError') {
        return NextResponse.json({ error: 'File size exceeds the server limit.' }, { status: 413 });
    }
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
} 