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

    // 3. 스크럼 데이터 집계 및 디버깅
    const allDoneItems = scrums.map(scrum => scrum.done).filter(Boolean);
    const allPlanItems = scrums.map(scrum => scrum.plan).filter(Boolean);
    
    console.log(`Project ${projectId} - Total scrums: ${scrums.length}`);
    console.log(`Done items: ${allDoneItems.length}, Plan items: ${allPlanItems.length}`);
    
    const doneText = allDoneItems.join('\n• ');
    const planText = allPlanItems.join('\n• ');

    // 4. 개선된 LLM 프롬프트 구성
    const prompt = `프로젝트 진행도를 0-100 사이의 정수로만 평가해주세요.

프로젝트명: ${project.project_name}

기획서:
${project.planning || '기획서가 없습니다.'}

완료된 작업들 (총 ${allDoneItems.length}개):
${doneText || '완료된 작업이 없습니다.'}

계획된 작업들 (총 ${allPlanItems.length}개):
${planText || '계획된 작업이 없습니다.'}

평가 기준:
- 완료된 작업이 많을수록 높은 진행도
- 기획서가 있고 완료된 작업이 있으면 최소 20% 이상
- 모든 작업이 완료되면 100%

중요: 숫자만 응답해주세요. 설명이나 다른 텍스트는 포함하지 마세요.

진행도:`;

    // 5. Groq LLM API 호출
    const llmApiKey = process.env.LLM_API_KEY;
    console.log('LLM_API_KEY exists:', !!llmApiKey);
    if (!llmApiKey) {
      console.error('LLM_API_KEY not found in environment variables');
      return { success: false, error: 'LLM service not configured.' };
    }

    console.log('Sending prompt to LLM:', prompt.substring(0, 200) + '...');

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
            role: 'system',
            content: '당신은 프로젝트 진행도를 계산하는 전문가입니다. 항상 0-100 사이의 정수만 응답하세요. 설명이나 다른 텍스트는 절대 포함하지 마세요.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 5,
        temperature: 0.1
      })
    });

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      console.error('LLM API error:', errorText);
      return { success: false, error: 'Failed to calculate progress with LLM.' };
    }

    const llmData = await llmResponse.json();
    const progressText = llmData.choices[0]?.message?.content?.trim();
    
    console.log('LLM Response:', progressText);
    
    // 6. 진행도 파싱 (숫자만 추출)
    const progressMatch = progressText.match(/\d+/);
    const calculatedProgress = progressMatch ? parseInt(progressMatch[0]) : 0;
    
    console.log('Parsed progress:', calculatedProgress);
    
    // 진행도 범위 제한 (0-100)
    const finalProgress = Math.max(0, Math.min(100, calculatedProgress));
    
    console.log('Final progress:', finalProgress);

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