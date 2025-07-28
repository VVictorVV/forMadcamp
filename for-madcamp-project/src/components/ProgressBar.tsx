"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import styles from './ProgressBar.module.css';

interface ProgressData {
  projectId: number;
  projectName: string;
  progress: number;
  totalScrums: number;
  hasPlanning: boolean;
}

const ProgressBar = () => {
  const { user } = useAuth();
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 현재 사용자의 프로젝트 진행도 조회
  const fetchProgress = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // 1. 사용자가 참여한 프로젝트 조회
      const { data: participations, error: participationError } = await supabase
        .from('PARTICIPATOR')
        .select('project_id')
        .eq('profile_id', user.id);

      if (participationError) {
        throw participationError;
      }

      if (!participations || participations.length === 0) {
        setProgressData(null);
        return;
      }

      // 2. 프로젝트 정보 조회 (week_num 순으로 정렬)
      const projectIds = participations.map(p => p.project_id);
      const { data: projects, error: projectsError } = await supabase
        .from('PROJECTS')
        .select('project_id, project_name, week_num, progress')
        .in('project_id', projectIds)
        .order('week_num', { ascending: false });

      if (projectsError || !projects || projects.length === 0) {
        throw projectsError || new Error('No projects found');
      }

      // 3. 가장 최근 주차(week_num이 가장 큰) 프로젝트의 진행도 조회
      const projectId = projects[0].project_id;
      
      const response = await fetch(`/api/projects/${projectId}/progress`, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch progress');
      }

      const data = await response.json();
      setProgressData(data);

    } catch (err) {
      console.error('Error fetching progress:', err);
      setError('진행도를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchProgress();
    }
  }, [user]);

  // 진행도가 없거나 로딩 중이면 아무것도 표시하지 않음
  if (!user || loading || !progressData) {
    return null;
  }

  return (
    <div className={styles.progressContainer}>
      <div className={styles.progressInfo}>
        <span className={styles.projectName}>{progressData.projectName}</span>
        <span className={styles.progressText}>{progressData.progress}%</span>
      </div>
      <div className={styles.progressBar}>
        <div 
          className={styles.progressFill} 
          style={{ width: `${progressData.progress}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar; 