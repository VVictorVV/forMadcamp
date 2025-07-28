'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // useRouter 임포트
import styles from './project.module.css';
import { supabase } from '../../../lib/supabaseClient';
import { type User } from '@supabase/supabase-js';

// 프로젝트와 프로필 데이터 타입을 정의합니다.
interface Project {
  project_id: number;
  project_name: string;
  class_id: number;
  week_num: number;
  created_at: string;
  planning: string | null;
  progress: number;
  representative_image_uri: string | null;
}

interface Profile {
  id: string;
  name: string;
  class_id: number;
}

const ProjectPage = () => {
  const router = useRouter(); // useRouter 훅 사용
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // 새 프로젝트 폼 상태
  const [newProjectWeek, setNewProjectWeek] = useState(0);
  const [classmates, setClassmates] = useState<Profile[]>([]);
  const [selectedParticipators, setSelectedParticipators] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const weeks = [1, 2, 3, 4];

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        await fetchProjects(session.user.id);
      }
      setLoading(false);
    };
    initialize();
  }, []);

  const fetchProjects = async (userId: string) => {
    try {
      const { data: participations, error: participationError } = await supabase
        .from('PARTICIPATOR')
        .select('project_id')
        .eq('profile_id', userId);
      if (participationError) throw participationError;

      if (participations && participations.length > 0) {
        const projectIds = participations.map(p => p.project_id);
        const { data: projectsData, error: projectsError } = await supabase
          .from('PROJECTS')
          .select('*')
          .in('project_id', projectIds);
        if (projectsError) throw projectsError;
        setProjects(projectsData || []);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchClassmates = async () => {
    if (!user) return;
    try {
      // 1. 현재 유저의 프로필(class_id) 조회
      const { data: currentUserProfile, error: profileError } = await supabase
        .from('PROFILES')
        .select('class_id')
        .eq('id', user.id)
        .single();
      if (profileError || !currentUserProfile) throw profileError || new Error("User profile not found");

      // 2. 같은 class_id를 가진 모든 프로필 조회
      const { data: classmatesData, error: classmatesError } = await supabase
        .from('PROFILES')
        .select('id, name, class_id') // class_id도 함께 조회
        .eq('class_id', currentUserProfile.class_id);
      if (classmatesError) throw classmatesError;

      // 자기 자신은 목록에서 제외
      setClassmates(classmatesData?.filter(p => p.id !== user.id) || []);

    } catch (error) {
      console.error('Error fetching classmates:', error);
      alert('참여자 목록을 불러오는 데 실패했습니다.');
    }
  };
  
  const openCreateModal = async () => {
    const existingWeeks = projects.map(p => p.week_num);
    const availableWeek = weeks.find(w => !existingWeeks.includes(w));
    setNewProjectWeek(availableWeek || 0);
    setSelectedParticipators([]);
    setShowModal(true);
    await fetchClassmates();
  };

  const handleParticipatorToggle = (profileId: string) => {
    setSelectedParticipators(prev =>
      prev.includes(profileId)
        ? prev.filter(id => id !== profileId)
        : [...prev, profileId]
    );
  };

  const handleCreateProject = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (newProjectWeek === 0) {
      alert('프로젝트를 생성할 주차를 선택해주세요.');
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert('로그인이 필요합니다.');
      return;
    }
    
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          projectName: `Project ${newProjectWeek}`,
          weekNum: newProjectWeek,
          participators: selectedParticipators.map(id => ({ profileId: id, role: '팀원' })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Project creation failed');
      }
      
      const newProject = await response.json();
      setShowModal(false);
      router.push(`/project/${newProject.projectId}`); // 상세 페이지로 이동
      
    } catch (error) {
      console.error('Creation error:', error);
      alert(error instanceof Error ? `프로젝트 생성 실패: ${error.message}`: '알 수 없는 오류 발생');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getProjectByWeek = (weekNum: number): Project | undefined => {
    return projects.find(p => p.week_num === weekNum);
  };

  if (loading) {
    return <main className={styles.container}><p>Loading...</p></main>;
  }

  return (
    <main className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>My Project</h1>
        <button onClick={openCreateModal} className={styles.createButton}>
          + 새 프로젝트 생성
        </button>
      </div>

      {showModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <span className={styles.closeButton} onClick={() => setShowModal(false)}>&times;</span>
            <h2>새 프로젝트 생성</h2>
            <form onSubmit={handleCreateProject}>
              <div className={styles.formSection}>
                <label>주차 선택</label>
                <select 
                  value={newProjectWeek} 
                  onChange={(e) => setNewProjectWeek(Number(e.target.value))}
                  required
                >
                  <option value={0} disabled>주차를 선택하세요</option>
                  {weeks
                    .filter(w => !projects.some(p => p.week_num === w))
                    .map(week => <option key={week} value={week}>{week}주차</option>
                  )}
                </select>
              </div>
              
              <div className={styles.formSection}>
                <label>참여자 선택</label>
                <div className={styles.participatorList}>
                  {classmates.length > 0 ? (
                    classmates.map(p => (
                      <div key={p.id} className={styles.participatorItem}>
                        <span>{p.name}</span>
                        <label className={styles.switch}>
                          <input 
                            type="checkbox" 
                            checked={selectedParticipators.includes(p.id)}
                            onChange={() => handleParticipatorToggle(p.id)}
                          />
                          <span className={`${styles.slider} ${styles.round}`}></span>
                        </label>
                      </div>
                    ))
                  ) : (
                    <p>다른 참여자가 없습니다.</p>
                  )}
                </div>
              </div>

              <button type="submit" className={styles.saveButton} disabled={isSubmitting}>
                {isSubmitting ? '생성 중...' : '생성하기'}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className={styles.cardContainer}>
        {weeks.map(weekNum => {
          const project = getProjectByWeek(weekNum);
          if (project) {
            if (project.representative_image_uri) {
              // 이미지가 있는 경우
              return (
                <Link
                  key={weekNum}
                  href={`/project/${project.project_id}`}
                  className={`${styles.card} ${styles.projectCard}`}
                  style={{ backgroundImage: `url(${project.representative_image_uri})` }}
                >
                  <div className={styles.cardOverlay}>
                    <h2 className={styles.title}>{project.project_name}</h2>
                  </div>
                </Link>
              );
            } else {
              // 이미지가 없는 경우
              return (
                <Link
                  key={weekNum}
                  href={`/project/${project.project_id}`}
                  className={`${styles.card} ${styles.projectCard}`}
                >
                  <h2 className={`${styles.title} ${styles.noImageTitle}`}>
                    {project.project_name}
                  </h2>
                </Link>
              );
            }
          } else {
            // 프로젝트가 없는 경우
            return (
              <div key={weekNum} className={`${styles.card} ${styles.emptyCard}`}>
                <h2 className={styles.title}>{weekNum}주차</h2>
              </div>
            );
          }
        })}
      </div>
    </main>
  );
};

export default ProjectPage; 