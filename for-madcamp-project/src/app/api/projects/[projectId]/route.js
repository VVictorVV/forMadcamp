import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function PUT(request, { params }) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { projectId } = params;
    const updateData = await request.json();

    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401 });
        }
        const token = authHeader.split(' ')[1];
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        
        if (userError || !user) {
            return new Response(JSON.stringify({ error: 'Authentication failed' }), { status: 401 });
        }

        const userId = user.id;

        const { data: participator, error: participatorError } = await supabase
            .from('PARTICIPATOR')
            .select('profile_id')
            .eq('project_id', projectId)
            .eq('profile_id', userId)
            .single();

        if (participatorError || !participator) {
            return new Response(JSON.stringify({ error: 'Forbidden: You are not a member of this project.' }), { status: 403 });
        }

        const { data, error } = await supabase
            .from('PROJECTS')
            .update({
                project_name: updateData.project_name,
                planning: updateData.planning,
                description: updateData.description,
                representative_image_uri: updateData.representative_image_uri,
            })
            .eq('project_id', projectId)
            .select()
            .single();

        if (error) {
            throw error;
        }

        return new Response(JSON.stringify(data), { status: 200 });
    } catch (error) {
        console.error('Error updating project:', error);
        return new Response(JSON.stringify({ error: error.message || 'Failed to update project' }), { status: 500 });
    }
} 