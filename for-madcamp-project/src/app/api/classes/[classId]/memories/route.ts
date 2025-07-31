import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request, { params }: { params: Promise<{ classId: string }> }) {
    const { classId } = await params;

    try {
        // 1. 인증 확인
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
        }
        const token = authHeader.split(' ')[1];

        // Create a new Supabase client with the user's token
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
            }
        );

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
            return NextResponse.json({ error: 'Authentication failed.' }, { status: 401 });
        }

        // 2. 사용자가 해당 분반에 속하는지 확인
        const { data: profile, error: profileError } = await supabase
            .from('PROFILES')
            .select('class_id')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            return NextResponse.json({ error: 'User profile not found.' }, { status: 404 });
        }

        if (profile.class_id !== parseInt(classId)) {
            return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
        }

        // 3. 해당 분반의 모든 추억 조회
        const { data: memories, error: memoriesError } = await supabase
            .from('MEMORIES')
            .select(`
                memory_id,
                name,
                image_uri,
                created_at,
                creator_id,
                PROFILES!MEMORIES_creator_id_fkey (
                    name
                )
            `)
            .eq('class_id', classId)
            .order('created_at', { ascending: false });

        if (memoriesError) {
            throw memoriesError;
        }

        // 4. 응답 데이터 형식 맞추기
        const formattedMemories = memories?.map(memory => ({
            memoryId: memory.memory_id,
            name: memory.name,
            imageUrl: memory.image_uri,
            createdAt: memory.created_at,
            creatorName: (memory.PROFILES as { name: string })?.name || 'Unknown User'
        })) || [];

        return NextResponse.json({ memories: formattedMemories }, { status: 200 });

    } catch (error: unknown) {
        console.error('Error fetching memories:', error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}

export async function POST(request: Request, { params }: { params: Promise<{ classId: string }> }) {
    const { classId } = await params;

    try {
        // 1. 인증 확인
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
        }
        const token = authHeader.split(' ')[1];

        // Create a new Supabase client with the user's token
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
            }
        );

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
            return NextResponse.json({ error: 'Authentication failed.' }, { status: 401 });
        }

        // 2. 사용자가 해당 분반에 속하는지 확인
        const { data: profile, error: profileError } = await supabase
            .from('PROFILES')
            .select('class_id, name')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            return NextResponse.json({ error: 'User profile not found.' }, { status: 404 });
        }

        if (profile.class_id !== parseInt(classId)) {
            return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
        }

        // 3. FormData에서 파일과 이름 추출
        const formData = await request.formData();
        const file = formData.get('imageFile') as File;
        const name = formData.get('name') as string;

        // 4. 입력 유효성 검사
        if (!file || !name) {
            return NextResponse.json({ error: 'Invalid request data.' }, { status: 400 });
        }

        if (name.length > 100) {
            return NextResponse.json({ error: 'Name too long. Maximum 100 characters.' }, { status: 400 });
        }

        // 5. 파일 유효성 검사
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedMimeTypes.includes(file.type)) {
            return NextResponse.json({ error: 'Unsupported file type.' }, { status: 415 });
        }

        const maxFileSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxFileSize) {
            return NextResponse.json({ error: 'File size too large.' }, { status: 413 });
        }

        // 6. Supabase Storage에 파일 업로드
        const { v4: uuidv4 } = await import('uuid');
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${uuidv4()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('memory-images')
            .upload(fileName, file);

        if (uploadError) {
            console.error('Upload error:', uploadError);
            return NextResponse.json({ error: 'Failed to upload file.' }, { status: 500 });
        }

        // 7. 업로드된 파일의 공개 URL 가져오기
        const { data: urlData } = supabase.storage
            .from('memory-images')
            .getPublicUrl(fileName);

        if (!urlData || !urlData.publicUrl) {
            return NextResponse.json({ error: 'Failed to get public URL.' }, { status: 500 });
        }

        // 8. 데이터베이스에 추억 저장
        const { data: memory, error: memoryError } = await supabase
            .from('MEMORIES')
            .insert({
                class_id: parseInt(classId),
                name: name,
                image_uri: urlData.publicUrl,
                creator_id: user.id
            })
            .select(`
                memory_id,
                name,
                image_uri,
                created_at,
                creator_id,
                PROFILES!MEMORIES_creator_id_fkey (
                    name
                )
            `)
            .single();

        if (memoryError) {
            throw memoryError;
        }

        // 9. 응답 데이터 형식 맞추기
        const responseData = {
            memoryId: memory.memory_id,
            name: memory.name,
            imageUrl: memory.image_uri,
            createdAt: memory.created_at,
            creatorName: (memory.PROFILES as { name: string })?.name || 'Unknown User'
        };

        return NextResponse.json(responseData, { status: 201 });

    } catch (error: any) {
        console.error('Error creating memory:', error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
