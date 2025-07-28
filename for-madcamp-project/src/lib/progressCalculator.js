import { supabase } from './supabaseClient';

/**
 * 프로젝트 진행도를 LLM을 통해 계산하는 함수
 * @param {number} projectId - 프로젝트 ID
 * @returns {Promise<{success: boolean, progress?: number, error?: string}>}
 */
export async function calculateProjectProgress(projectId) {
  try {
    // 1. 프로젝트 정보 조회 (기획서 포함)
    const { data: project, error: projectError } = await supabase
      .from('PROJECTS')
      .select('project_id, project_name, planning, progress')
      .eq('project_id', projectId)
      .single();

    if (projectError || !project) {
      return { success: false, error: 'Project not found.' };
    }

    // 2. 모든 스크럼 데이터 조회
    const { data: scrums, error: scrumsError } = await supabase
      .from('SCRUMS')
      .select('done, plan, date')
      .eq('project_id', projectId)
      .order('date', { ascending: true });

    if (scrumsError) {
      console.error('Scrums query error:', scrumsError);
      return { success: false, error: 'Failed to fetch scrum data.' };
    }

    // 3. 스크럼 데이터 집계
    const allDoneItems = scrums.map(scrum => scrum.done).filter(Boolean).join('\n');
    const allPlanItems = scrums.map(scrum => scrum.plan).filter(Boolean).join('\n');

    // 4. LLM 호출을 위한 프롬프트 구성
    const prompt = `다음 프로젝트 정보를 바탕으로 현재 진행도를 0-100 사이의 정수로 평가해주세요:\n\n프로젝트 기획서:\n${project.planning || '기획서가 없습니다.'}\n\n완료된 작업들:\n${allDoneItems || '완료된 작업이 없습니다.'}\n\n계획된 작업들:\n${allPlanItems || '계획된 작업이 없습니다.'}\n\n평가 기준:\n1. 기획서 대비 완료된 작업의 비율\n2. 완료된 작업의 중요도와 복잡도\n3. 남은 작업의 양과 복잡도\n4. 전체적인 프로젝트 진행 상황\n\n진행도는 0-100 사이의 정수로만 응답해주세요.`;

    // 5. Groq LLM API 호출
    const llmApiKey = process.env.LLM_API_KEY;
    if (!llmApiKey) {
      console.error('LLM_API_KEY not found in environment variables');
      return { success: false, error: 'LLM service not configured.' };
    }

    const llmResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${llmApiKey}`
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 50,
        temperature: 0.1
      })
    });

    if (!llmResponse.ok) {
      console.error('LLM API error:', await llmResponse.text());
      return { success: false, error: 'Failed to calculate progress with LLM.' };
    }

    const llmData = await llmResponse.json();
    const progressText = llmData.choices[0]?.message?.content?.trim();
    
    // 6. 진행도 파싱 (숫자만 추출)
    const progressMatch = progressText.match(/\d+/);
    const calculatedProgress = progressMatch ? parseInt(progressMatch[0]) : 0;
    
    // 진행도 범위 제한 (0-100)
    const finalProgress = Math.max(0, Math.min(100, calculatedProgress));

    // 7. 프로젝트 진행도 업데이트
    const { error: updateError } = await supabase
      .from('PROJECTS')
      .update({ progress: finalProgress })
      .eq('project_id', projectId);

    if (updateError) {
      console.error('Progress update error:', updateError);
      return { success: false, error: 'Failed to update project progress.' };
    }

    return { success: true, progress: finalProgress };

  } catch (err) {
    console.error('Progress calculation error:', err);
    return { success: false, error: 'Internal server error.' };
  }
} 