import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req) {
  try {
    // 1. JWT 토큰 추출 및 검증
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    // 2. FormData에서 파일 추출
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'File is required.' }, { status: 400 });
    }

    // 3. 파일 유효성 검사 (MIME 타입, 크기 등)
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only JPEG, PNG, GIF are allowed.' }, { status: 400 });
    }
    
    const maxFileSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxFileSize) {
        return NextResponse.json({ error: 'File size exceeds the 5MB limit.' }, { status: 400 });
    }

    // 4. Supabase Storage에 파일 업로드
    const fileName = `${user.id}/${uuidv4()}-${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('project-images') // 'project-images' 버킷 사용
      .upload(fileName, file);

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file.' }, { status: 500 });
    }

    // 5. 업로드된 파일의 공개 URL 가져오기
    const { data: urlData } = supabase.storage
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