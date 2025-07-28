'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import styles from './scrum.module.css';
import { supabase } from '../../../lib/supabaseClient';
import { type User } from '@supabase/supabase-js';

// 스크럼 데이터 타입 정의
interface Scrum {
  scrumId: number;
  project?: {
    projectId: number;
    projectName: string;
  };
  participators?: {
    userId: string;
    name: string;
    role: string;
  }[];
  done?: string;
  plan?: string;
  others?: string;
}

const ScrumPage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [scrums, setScrums] = useState<Scrum[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [userClassId, setUserClassId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingScrumId, setEditingScrumId] = useState<number | null>(null);
  const [userProjects, setUserProjects] = useState<{projectId: number, projectName: string}[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [scrumForm, setScrumForm] = useState({
    done: '',
    plan: '',
    others: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const dateListRef = useRef<HTMLDivElement>(null);

  // 날짜 관련 함수들
  const getCurrentMonth = () => {
    return selectedDate.getMonth() + 1;
  };

  const getCurrentYear = () => {
    return selectedDate.getFullYear();
  };

  const getVisibleDays = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const selectedDay = selectedDate.getDate();
    
    const visibleDays = [];
    
    // 선택된 날짜를 중심으로 7일을 보여줌
    for (let i = -3; i <= 3; i++) {
      const targetDate = new Date(year, month, selectedDay + i);
      
      visibleDays.push({
        day: targetDate.getDate(),
        month: targetDate.getMonth(),
        year: targetDate.getFullYear(),
        isCurrentMonth: targetDate.getMonth() === month
      });
    }
    
    return visibleDays;
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isToday = (dateInfo: { day: number; month: number; year: number }) => {
    const today = new Date();
    return today.getDate() === dateInfo.day && 
           today.getMonth() === dateInfo.month && 
           today.getFullYear() === dateInfo.year;
  };

  const isSelected = (dateInfo: { day: number; month: number; year: number }) => {
    return selectedDate.getDate() === dateInfo.day &&
           selectedDate.getMonth() === dateInfo.month &&
           selectedDate.getFullYear() === dateInfo.year;
  };

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        setCurrentUserId(session.user.id);
        await fetchUserClass(session.user.id);
      }
      setLoading(false);
    };
    initialize();
  }, []);

  useEffect(() => {
    if (userClassId) {
      fetchScrums(userClassId);
    }
  }, [selectedDate, userClassId]);

  const fetchUserClass = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('PROFILES')
        .select('class_id')
        .eq('id', userId)
        .single();
      
      if (profile) {
        setUserClassId(profile.class_id);
        await fetchScrums(profile.class_id);
      }
    } catch (error) {
      console.error('Error fetching user class:', error);
    }
  };

  const fetchScrums = async (classId: number) => {
    try {
      const formattedDate = formatDate(selectedDate);
      
      const response = await fetch(`/api/classes/${classId}/scrums?date=${formattedDate}`, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setScrums(data.scrums || []);
      }
    } catch (error) {
      console.error('Error fetching scrums:', error);
    }
  };

  const fetchUserProjects = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: participations, error: participationError } = await supabase
        .from('PARTICIPATOR')
        .select('project_id')
        .eq('profile_id', session.user.id);
      
      if (participationError) throw participationError;

      if (participations && participations.length > 0) {
        const projectIds = participations.map(p => p.project_id);
        const { data: projectsData, error: projectsError } = await supabase
          .from('PROJECTS')
          .select('project_id, project_name')
          .in('project_id', projectIds);
        
        if (projectsError) throw projectsError;
        setUserProjects(projectsData?.map(p => ({
          projectId: p.project_id,
          projectName: p.project_name
        })) || []);
      }
    } catch (error) {
      console.error('Error fetching user projects:', error);
    }
  };

  const handleDateSelect = (dateInfo: { day: number; month: number; year: number }) => {
    const newDate = new Date(dateInfo.year, dateInfo.month, dateInfo.day);
    setSelectedDate(newDate);
    
    // 선택된 날짜를 중앙으로 스크롤
    setTimeout(() => {
      if (dateListRef.current) {
        const buttons = dateListRef.current.querySelectorAll('button');
        const selectedButton = Array.from(buttons).find(button => 
          button.textContent?.trim() === dateInfo.day.toString()
        );
        
        if (selectedButton) {
          const containerWidth = dateListRef.current.offsetWidth;
          const buttonWidth = selectedButton.offsetWidth;
          const buttonLeft = selectedButton.offsetLeft;
          const scrollLeft = buttonLeft - (containerWidth / 2) + (buttonWidth / 2);
          
          dateListRef.current.scrollTo({
            left: scrollLeft,
            behavior: 'smooth'
          });
        }
      }
    }, 100);
  };

  const handleCreateScrum = () => {
    setIsEditMode(false);
    setEditingScrumId(null);
    setScrumForm({ done: '', plan: '', others: '' });
    setSelectedProject(null);
    setShowModal(true);
    fetchUserProjects();
  };

  const isUserParticipant = (scrum: Scrum) => {
    if (!currentUserId || !scrum.participators) return false;
    return scrum.participators.some(p => p.userId === currentUserId);
  };

  const handleEditScrum = (scrum: Scrum) => {
    if (!isUserParticipant(scrum)) return;
    
    setIsEditMode(true);
    setEditingScrumId(scrum.scrumId);
    setScrumForm({
      done: scrum.done || '',
      plan: scrum.plan || '',
      others: scrum.others || ''
    });
    setSelectedProject(scrum.project?.projectId || null);
    setShowModal(true);
  };

  const handleSubmitScrum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) {
      alert('프로젝트를 선택해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('로그인이 필요합니다.');
        return;
      }

      let response;
      if (isEditMode && editingScrumId) {
        // 수정 모드
        response = await fetch(`/api/scrums/${editingScrumId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(scrumForm),
        });
      } else {
        // 생성 모드
        response = await fetch(`/api/projects/${selectedProject}/scrums`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(scrumForm),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || (isEditMode ? 'Scrum update failed' : 'Scrum creation failed'));
      }

      setShowModal(false);
      setScrumForm({ done: '', plan: '', others: '' });
      setSelectedProject(null);
      setIsEditMode(false);
      setEditingScrumId(null);
      
      // 스크럼 목록 새로고침
      if (userClassId) {
        await fetchScrums(userClassId);
      }
      
    } catch (error) {
      console.error(isEditMode ? 'Scrum update error:' : 'Scrum creation error:', error);
      alert(error instanceof Error ? `스크럼 ${isEditMode ? '수정' : '생성'} 실패: ${error.message}` : '알 수 없는 오류 발생');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <main className={styles.container}><p>Loading...</p></main>;
  }

  return (
    <main className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Scrums</h1>
        
        <div className={styles.dateSelector}>
          <div className={styles.monthLabel}>{getCurrentYear()}년 {getCurrentMonth()}월</div>
          <div className={styles.dateList} ref={dateListRef}>
            {getVisibleDays().map((dateInfo, index) => {
              // 위치에 따른 투명도와 크기 계산
              const position = index; // 0-6
              const centerDistance = Math.abs(3 - position); // 중앙(3)으로부터의 거리
              let opacity = Math.max(0.3, 1 - (centerDistance * 0.2)); // 0.3 ~ 1.0
              let scale = Math.max(0.7, 1 - (centerDistance * 0.1)); // 0.7 ~ 1.0
              
              // 선택된 날짜나 오늘 날짜는 투명도와 크기를 보정
              if (isSelected(dateInfo) || isToday(dateInfo)) {
                opacity = Math.max(opacity, 0.8); // 최소 0.8
                scale = Math.max(scale, 0.85); // 최소 0.85
              }
              
              return (
                <button
                  key={`${dateInfo.year}-${dateInfo.month}-${dateInfo.day}`}
                  className={`${styles.dateButton} ${
                    !dateInfo.isCurrentMonth ? styles.otherMonth : ''
                  } ${
                    isToday(dateInfo) ? styles.today : ''
                  } ${
                    isSelected(dateInfo) ? styles.selected : ''
                  }`}
                  style={{
                    opacity: opacity,
                    transform: `scale(${scale})`,
                  }}
                  onClick={() => handleDateSelect(dateInfo)}
                >
                  {dateInfo.day}
                  {isSelected(dateInfo) && <div className={styles.selectedIndicator}></div>}
                </button>
              );
            })}
          </div>
        </div>

        <button onClick={handleCreateScrum} className={styles.createButton}>
          + 오늘의 스크럼 생성
        </button>
      </div>

      <div className={styles.gridContainer}>
        {scrums.length > 0 ? (
          scrums.map((scrum, index) => (
            <div 
              key={scrum.scrumId} 
              className={`${styles.scrumCard} ${isUserParticipant(scrum) ? styles.editable : ''}`}
              onClick={() => handleEditScrum(scrum)}
            >
              <div className={styles.scrumContent}>
                <h3 className={styles.projectName}>{scrum.project?.projectName || '알 수 없는 프로젝트'}</h3>
                <div className={styles.participators}>
                  {scrum.participators?.map((participator, idx) => (
                    <span key={participator.userId} className={styles.participator}>
                      {participator.name} ({participator.role})
                      {idx < (scrum.participators?.length || 0) - 1 && ', '}
                    </span>
                  )) || '참여자 정보 없음'}
                </div>
                <div className={styles.scrumDetails}>
                  <p><strong>어제 한 일:</strong> {scrum.done || '내용 없음'}</p>
                  <p><strong>오늘 할 일:</strong> {scrum.plan || '내용 없음'}</p>
                  {scrum.others && <p><strong>기타:</strong> {scrum.others}</p>}
                </div>
              </div>
              {isUserParticipant(scrum) && (
                <div className={styles.editOverlay}>
                  <span className={styles.editText}>수정</span>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className={styles.noScrumsMessage}>
            <div className={styles.noScrumsContent}>
              <p className={styles.noScrumsText}>이 날짜에는 스크럼이 없습니다</p>
              <p className={styles.noScrumsSubtext}>오늘의 스크럼을 작성해보세요!</p>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <span className={styles.closeButton} onClick={() => setShowModal(false)}>&times;</span>
            <h2>{isEditMode ? '스크럼 수정' : '오늘의 스크럼 생성'}</h2>
            <form onSubmit={handleSubmitScrum}>
              <div className={styles.formSection}>
                <label>프로젝트 선택</label>
                <select 
                  value={selectedProject || ''} 
                  onChange={(e) => setSelectedProject(Number(e.target.value))}
                  required
                  disabled={isEditMode}
                >
                  <option value="">프로젝트를 선택하세요</option>
                  {userProjects.map(project => (
                    <option key={project.projectId} value={project.projectId}>
                      {project.projectName}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className={styles.formSection}>
                <label>어제 한 일</label>
                <textarea 
                  value={scrumForm.done}
                  onChange={(e) => setScrumForm(prev => ({ ...prev, done: e.target.value }))}
                  placeholder="어제 완료한 작업을 입력하세요"
                  required
                />
              </div>

              <div className={styles.formSection}>
                <label>오늘 할 일</label>
                <textarea 
                  value={scrumForm.plan}
                  onChange={(e) => setScrumForm(prev => ({ ...prev, plan: e.target.value }))}
                  placeholder="오늘 진행할 작업을 입력하세요"
                  required
                />
              </div>

              <div className={styles.formSection}>
                <label>기타 공유 사항</label>
                <textarea 
                  value={scrumForm.others}
                  onChange={(e) => setScrumForm(prev => ({ ...prev, others: e.target.value }))}
                  placeholder="기타 공유하고 싶은 내용을 입력하세요 (선택사항)"
                />
              </div>

              <button type="submit" className={styles.saveButton} disabled={isSubmitting}>
                {isSubmitting ? (isEditMode ? '수정 중...' : '생성 중...') : (isEditMode ? '스크럼 수정' : '스크럼 생성')}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

export default ScrumPage; 