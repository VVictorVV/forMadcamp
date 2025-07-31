import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function PUT(request: Request, { params }: { params: Promise<{ memoryId: string }> }) {
    const { memoryId } = await params;

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

        // 2. 요청 데이터 파싱
        const { name } = await request.json();

        // 3. 입력 유효성 검사
        if (!name || typeof name !== 'string') {
            return NextResponse.json({ error: 'Invalid request data.' }, { status: 400 });
        }

        if (name.length > 100) {
            return NextResponse.json({ error: 'Name too long. Maximum 100 characters.' }, { status: 400 });
        }

        // 4. 추억 존재 여부 및 권한 확인
        const { data: memory, error: memoryError } = await supabase
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
            .eq('memory_id', memoryId)
            .single();

        if (memoryError || !memory) {
            return NextResponse.json({ error: 'Memory not found.' }, { status: 404 });
        }

        // 5. 수정 권한 확인 (본인이 업로드한 추억만 수정 가능)
        if (memory.creator_id !== user.id) {
            return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
        }

        // 6. 추억 수정
        const { data: updatedMemory, error: updateError } = await supabase
            .from('MEMORIES')
            .update({
                name: name,
                updated_at: new Date().toISOString()
            })
            .eq('memory_id', memoryId)
            .select(`
                memory_id,
                name,
                image_uri,
                created_at,
                updated_at,
                creator_id,
                PROFILES!MEMORIES_creator_id_fkey (
                    name
                )
            `)
            .single();

        if (updateError) {
            throw updateError;
        }

        // 7. 응답 데이터 형식 맞추기
        const responseData = {
            memoryId: updatedMemory.memory_id,
            name: updatedMemory.name,
            imageUrl: updatedMemory.image_uri,
            createdAt: updatedMemory.created_at,
            updatedAt: updatedMemory.updated_at,
            creatorName: (updatedMemory.PROFILES as any)?.name || 'Unknown User'
        };

        return NextResponse.json(responseData, { status: 200 });

    } catch (error: unknown) {
        console.error('Error updating memory:', error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
