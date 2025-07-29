"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabaseClient';
import styles from './scheduleDetail.module.css';
import Image from 'next/image';

interface Participant {
  id: string;
  name: string;
  role: string;
  profileImageUri?: string;
}

interface ScheduleDetail {
  scheduleId: number;
  scheduleName: string;
  when: string;
  until?: string;
  description: string;
  participants: Array<{
    userId: number;
    name: string;
    role: string;
    status: string;
  }>;
}

const ScheduleDetailPage = () => {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const scheduleId = params.scheduleId as string;
  
  const [schedule, setSchedule] = useState<ScheduleDetail | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [scheduleName, setScheduleName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 일정 데이터 불러오기
  useEffect(() => {
    const fetchScheduleDetail = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setError('인증 토큰이 없습니다.');
          return;
        }

        const response = await fetch(`/api/schedules/${scheduleId}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        if (!response.ok) {
          throw new Error('일정을 불러올 수 없습니다.');
        }

        const data = await response.json();
        setSchedule(data);

        // 폼 데이터 설정
        const startDateTime = new Date(data.when);
        const endDateTime = data.until ? new Date(data.until) : new Date(startDateTime.getTime() + 60 * 60 * 1000);
        
        setScheduleName(data.scheduleName);
        setDescription(data.description);
        setStartDate(startDateTime.toISOString().split('T')[0]);
        setStartTime(startDateTime.toTimeString().slice(0, 5));
        setEndDate(endDateTime.toISOString().split('T')[0]);
        setEndTime(endDateTime.toTimeString().slice(0, 5));

        // 참여자 데이터 설정
        const participantData = data.participants.map((p: { userId: number; name: string; role: string; status: string }) => ({
          id: p.userId.toString(),
          name: p.name,
          role: p.role
        }));
        setParticipants(participantData);

      } catch (error) {
        console.error('Error fetching schedule:', error);
        setError('일정을 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    if (scheduleId) {
      fetchScheduleDetail();
    }
  }, [scheduleId]);

  const handleSubmit = async () => {
    // 유효성 검사
    if (!scheduleName.trim()) {
      setError('일정 제목을 입력해주세요.');
      return;
    }

    if (!description.trim()) {
      setError('일정 설명을 입력해주세요.');
      return;
    }

    if (!startDate || !startTime || !endDate || !endTime) {
      setError('시작 시간과 종료 시간을 모두 입력해주세요.');
      return;
    }

    // 시작 시간과 종료 시간 비교
    const startDateTime = new Date(`${startDate}T${startTime}`);
    const endDateTime = new Date(`${endDate}T${endTime}`);
    
    if (endDateTime <= startDateTime) {
      setError('종료 시간은 시작 시간보다 늦어야 합니다.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('인증 토큰이 없습니다.');
        return;
      }

      const response = await fetch(`/api/schedules/${scheduleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          scheduleName: scheduleName.trim(),
          description: description.trim(),
          when: startDateTime.toISOString(),
          until: endDateTime.toISOString()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '일정 수정에 실패했습니다.');
      }

      // 수정 모드 종료
      setIsEditing(false);
      
      // 업데이트된 데이터 다시 불러오기
      const updatedResponse = await fetch(`/api/schedules/${scheduleId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (updatedResponse.ok) {
        const updatedData = await updatedResponse.json();
        setSchedule(updatedData);
      }

    } catch (err) {
      console.error('Error updating schedule:', err);
      setError(err instanceof Error ? err.message : '일정 수정에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const isFormValid = () => {
    return scheduleName.trim() && 
           description.trim() && 
           startDate && 
           startTime && 
           endDate && 
           endTime;
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>일정을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error && !schedule) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <p className={styles.errorMessage}>{error}</p>
          <button onClick={() => router.push('/schedule')} className={styles.backButton}>
            일정 목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <p className={styles.errorMessage}>일정을 찾을 수 없습니다.</p>
          <button onClick={() => router.push('/schedule')} className={styles.backButton}>
            일정 목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button onClick={() => router.push('/schedule')} className={styles.backButton}>
          ← 일정 목록으로
        </button>
      </header>

      {/* 제목 섹션 */}
      <div className={styles.titleSection}>
        <h1 className={styles.pageTitle}>
          {isEditing ? '일정 수정하기' : '일정 상세보기'}
        </h1>
        <p className={styles.pageDescription}>
          {isEditing ? '일정 정보를 수정하고 저장하세요' : '일정의 상세 정보를 확인하세요'}
        </p>
      </div>

      <main className={styles.main}>
        <div className={styles.contentWrapper}>
          {/* 왼쪽 섹션 - 일정 폼 */}
          <div className={styles.leftSection}>
            {/* 일정 제목 입력 */}
            <div className={styles.formSection}>
              <label className={styles.label}>일정 제목</label>
              <input
                type="text"
                value={scheduleName}
                onChange={(e) => setScheduleName(e.target.value)}
                placeholder="일정 제목을 입력하세요"
                className={styles.titleInput}
                maxLength={100}
                disabled={!isEditing}
              />
            </div>

            {/* 일정 설명 입력 */}
            <div className={styles.formSection}>
              <label className={styles.label}>일정 설명</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="일정에 대한 설명을 입력하세요"
                className={styles.descriptionInput}
                rows={4}
                maxLength={500}
                disabled={!isEditing}
              />
            </div>

            {/* 시간 설정 */}
            <div className={styles.formSection}>
              <label className={styles.label}>일정 시간</label>
              <div className={styles.timeContainer}>
                <div className={styles.timeGroup}>
                  <label className={styles.timeLabel}>시작 시간</label>
                  <div className={styles.timeInputs}>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className={styles.dateInput}
                      disabled={!isEditing}
                    />
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className={styles.timeInput}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
                <div className={styles.timeGroup}>
                  <label className={styles.timeLabel}>종료 시간</label>
                  <div className={styles.timeInputs}>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className={styles.dateInput}
                      disabled={!isEditing}
                    />
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className={styles.timeInput}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 오른쪽 섹션 - 참여자 관리 */}
          <div className={styles.rightSection}>
            <div className={styles.participantsSection}>
              <label className={styles.label}>참여자</label>
              <div className={styles.participantsList}>
                {participants.map((participant, index) => (
                  <div key={participant.id} className={styles.participantItem}>
                    <div className={styles.participantInfo}>
                      <div className={styles.participantAvatar}>
                        <Image src="/logo.svg" alt={`${participant.name} profile`} width={40} height={40} />
                      </div>
                      <span className={styles.participantName}>{participant.name}</span>
                    </div>
                    <span className={styles.participantRole}>{participant.role}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 수정/저장 버튼 */}
            <div className={styles.actionSection}>
              {isEditing ? (
                <div className={styles.editActions}>
                  <button
                    onClick={() => setIsEditing(false)}
                    className={styles.cancelButton}
                    disabled={saving}
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!isFormValid() || saving}
                    className={`${styles.saveButton} ${!isFormValid() ? styles.disabled : ''}`}
                  >
                    {saving ? '저장 중...' : '저장하기'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className={styles.editButton}
                >
                  수정하기
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className={styles.errorContainer}>
            <p className={styles.errorMessage}>{error}</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default ScheduleDetailPage; 