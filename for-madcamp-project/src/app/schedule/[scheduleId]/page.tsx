"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabaseClient';
import styles from './scheduleDetail.module.css';
import Image from 'next/image';
import TimeSelector from '../../../components/TimeSelector';
import RelatedPolls from '../../../components/RelatedPolls';

interface Participant {
  id: string;
  name: string;
  role: string;
  status: string;
  profileImageUri?: string;
}

interface ScheduleDetail {
  scheduleId: number;
  scheduleName: string;
  when: string;
  until?: string;
  description: string;
  relatedPollId?: number;
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
  const [isCreator, setIsCreator] = useState(false);
  const [myStatus, setMyStatus] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedPollId, setSelectedPollId] = useState<number | null>(null);

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

        // 폼 데이터 설정 (한국 시간 처리)
        const startDateTime = new Date(data.when);
        const endDateTime = data.until ? new Date(data.until) : new Date(startDateTime.getTime() + 60 * 60 * 1000);
        
        // 디버깅 정보
        console.log('Schedule detail - Original when:', data.when);
        console.log('Schedule detail - Parsed start:', startDateTime.toISOString());
        
        // 한국 시간으로 변환 (UTC+9)
        const koreaOffset = 9 * 60; // 9시간을 분으로 변환
        const koreaStartTime = new Date(startDateTime.getTime() + koreaOffset * 60 * 1000);
        const koreaEndTime = new Date(endDateTime.getTime() + koreaOffset * 60 * 1000);
        
        console.log('Schedule detail - Korea start hours:', koreaStartTime.getUTCHours(), 'minutes:', koreaStartTime.getUTCMinutes());
        
        setScheduleName(data.scheduleName);
        setDescription(data.description);
        setSelectedPollId(data.relatedPollId || null);
        
        // 한국 시간 기준으로 날짜와 시간 설정 (30분 단위로 반올림)
        const startYear = koreaStartTime.getUTCFullYear();
        const startMonth = (koreaStartTime.getUTCMonth() + 1).toString().padStart(2, '0');
        const startDay = koreaStartTime.getUTCDate().toString().padStart(2, '0');
        setStartDate(`${startYear}-${startMonth}-${startDay}`);
        
        // 30분 단위로 반올림
        const startMinutes = koreaStartTime.getUTCMinutes();
        const roundedStartMinutes = startMinutes >= 30 ? 30 : 0;
        setStartTime(`${koreaStartTime.getUTCHours().toString().padStart(2, '0')}:${roundedStartMinutes.toString().padStart(2, '0')}`);
        
        const endYear = koreaEndTime.getUTCFullYear();
        const endMonth = (koreaEndTime.getUTCMonth() + 1).toString().padStart(2, '0');
        const endDay = koreaEndTime.getUTCDate().toString().padStart(2, '0');
        setEndDate(`${endYear}-${endMonth}-${endDay}`);
        
        // 30분 단위로 반올림
        const endMinutes = koreaEndTime.getUTCMinutes();
        const roundedEndMinutes = endMinutes >= 30 ? 30 : 0;
        setEndTime(`${koreaEndTime.getUTCHours().toString().padStart(2, '0')}:${roundedEndMinutes.toString().padStart(2, '0')}`);

        // 참여자 데이터 설정 및 현재 사용자 정보 확인
        const participantData = data.participants.map((p: { userId: number; name: string; role: string; status: string }) => ({
          id: p.userId.toString(),
          name: p.name,
          role: p.role,
          status: p.status
        }));
        setParticipants(participantData);

        // 현재 사용자의 역할과 상태 확인
        const currentUserParticipant = data.participants.find((p: { userId: number; name: string; role: string; status: string }) => p.userId.toString() === user?.id);
        if (currentUserParticipant) {
          setIsCreator(currentUserParticipant.role === '주최자');
          setMyStatus(currentUserParticipant.status);
        } else {
          setIsCreator(false);
          setMyStatus(null);
        }

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
  }, [scheduleId, user?.id]); // user?.id로 수정

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

    // 시작 시간과 종료 시간 비교 (한국 시간대로 처리)
    const startDateTime = new Date(`${startDate}T${startTime}:00`);
    const endDateTime = new Date(`${endDate}T${endTime}:00`);
    
    console.log('Form submission - Start:', startDateTime.toISOString(), 'End:', endDateTime.toISOString());
    
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
          until: endDateTime.toISOString(),
          relatedPollId: selectedPollId
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

  // 참여 상태 변경 함수
  const handleParticipationStatus = async (status: '참석' | '불참' | '미정') => {
    try {
      setUpdatingStatus(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('인증 토큰이 없습니다.');
        return;
      }

      const response = await fetch(`/api/schedules/${scheduleId}/participants/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '참여 상태 변경에 실패했습니다.');
      }

      // 상태 업데이트
      setMyStatus(status);
      
      // 일정 데이터 다시 불러오기
      const updatedResponse = await fetch(`/api/schedules/${scheduleId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (updatedResponse.ok) {
        const updatedData = await updatedResponse.json();
        setSchedule(updatedData);
        
        // 참여자 데이터 업데이트
        const updatedParticipantData = updatedData.participants.map((p: { userId: number; name: string; role: string; status: string }) => ({
          id: p.userId.toString(),
          name: p.name,
          role: p.role,
          status: p.status
        }));
        setParticipants(updatedParticipantData);
      }

    } catch (err) {
      console.error('Error updating participation status:', err);
      setError(err instanceof Error ? err.message : '참여 상태 변경에 실패했습니다.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // 일정 삭제 함수
  const handleDeleteSchedule = async () => {
    try {
      setDeleting(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('인증 토큰이 없습니다.');
        return;
      }

      const response = await fetch(`/api/schedules/${scheduleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '일정 삭제에 실패했습니다.');
      }

      // 성공 시 일정 목록으로 이동
      router.push('/schedule');

    } catch (err) {
      console.error('Error deleting schedule:', err);
      setError(err instanceof Error ? err.message : '일정 삭제에 실패했습니다.');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
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
        <div className={styles.titleHeader}>
          <div className={styles.titleContent}>
            <h1 className={styles.pageTitle}>
              {isEditing ? '일정 수정하기' : '일정 상세보기'}
            </h1>
            <p className={styles.pageDescription}>
              {isEditing ? '일정 정보를 수정하고 저장하세요' : '일정의 상세 정보를 확인하세요'}
            </p>
          </div>
          {isCreator && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className={styles.deleteButton}
              title="일정 삭제"
            >
              삭제하기
            </button>
          )}
        </div>
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
                    <TimeSelector
                      value={startTime}
                      onChange={setStartTime}
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
                    <TimeSelector
                      value={endTime}
                      onChange={setEndTime}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 연관 투표 섹션 */}
            <div className={styles.formSection}>
              <label className={styles.label}>연관 투표</label>
              <div className={styles.relatedPollsContainer}>
                <RelatedPolls
                  scheduleId={schedule?.scheduleId}
                  relatedPollId={selectedPollId || undefined}
                  onPollSelect={isEditing ? setSelectedPollId : undefined}
                  readonly={!isEditing}
                />
              </div>
            </div>
          </div>

          {/* 오른쪽 섹션 - 참여자 관리 */}
          <div className={styles.rightSection}>
            <div className={styles.participantsSection}>
              <label className={styles.label}>참여자 ({participants.length}명)</label>
              
              {/* 참여 상태 요약 */}
              <div className={styles.participationSummary}>
                <div className={styles.summaryItem}>
                  <span className={`${styles.summaryDot} ${styles.summary참석}`}></span>
                  <span className={styles.summaryText}>
                    참석 {participants.filter(p => p.status === '참석').length}명
                  </span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={`${styles.summaryDot} ${styles.summary불참}`}></span>
                  <span className={styles.summaryText}>
                    불참 {participants.filter(p => p.status === '불참').length}명
                  </span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={`${styles.summaryDot} ${styles.summary미정}`}></span>
                  <span className={styles.summaryText}>
                    미정 {participants.filter(p => p.status === '미정' || !p.status).length}명
                  </span>
                </div>
              </div>
              
              <div className={styles.participantsList}>
                {participants.map((participant, index) => (
                  <div 
                    key={participant.id} 
                    className={`${styles.participantItem} ${styles[`participant${participant.status?.replace(/\s/g, '') || 'None'}`]}`}
                  >
                    <div className={styles.participantInfo}>
                      <div className={styles.participantAvatar}>
                        <Image src="/logo.svg" alt={`${participant.name} profile`} width={40} height={40} />
                      </div>
                      <span className={styles.participantName}>{participant.name}</span>
                    </div>
                    <div className={styles.participantDetails}>
                      <span className={styles.participantRole}>{participant.role}</span>
                      <span className={`${styles.participantStatus} ${styles[`status${participant.status?.replace(/\s/g, '') || 'None'}`]}`}>
                        {participant.status || '미정'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 수정/저장 버튼 또는 참여/불참 버튼 */}
            <div className={styles.actionSection}>
              {isCreator ? (
                // 주최자인 경우 - 기존 수정/저장 버튼
                isEditing ? (
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
                )
              ) : (
                // 주최자가 아닌 경우 - 참여/불참 버튼
                <div className={styles.participationActions}>
                  <div className={styles.statusInfo}>
                    <span className={styles.statusLabel}>참여 상태:</span>
                    <span className={`${styles.statusValue} ${styles[`status${myStatus?.replace(/\s/g, '') || 'None'}`]}`}>
                      {myStatus || '미참여'}
                    </span>
                  </div>
                  <div className={styles.participationButtons}>
                    <button
                      onClick={() => handleParticipationStatus('참석')}
                      disabled={updatingStatus}
                      className={`${styles.participationButton} ${styles.attendButton} ${myStatus === '참석' ? styles.active : ''}`}
                    >
                      {updatingStatus && myStatus !== '참석' ? '처리 중...' : '참여'}
                    </button>
                    <button
                      onClick={() => handleParticipationStatus('불참')}
                      disabled={updatingStatus}
                      className={`${styles.participationButton} ${styles.absentButton} ${myStatus === '불참' ? styles.active : ''}`}
                    >
                      {updatingStatus && myStatus !== '불참' ? '처리 중...' : '불참'}
                    </button>
                    <button
                      onClick={() => handleParticipationStatus('미정')}
                      disabled={updatingStatus}
                      className={`${styles.participationButton} ${styles.pendingButton} ${myStatus === '미정' ? styles.active : ''}`}
                    >
                      {updatingStatus && myStatus !== '미정' ? '처리 중...' : '미정'}
                    </button>
                  </div>
                </div>
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

      {/* 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className={styles.modalOverlay} onClick={() => setShowDeleteModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>일정 삭제</h3>
              <button 
                className={styles.modalCloseButton}
                onClick={() => setShowDeleteModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <p className={styles.modalDescription}>
                정말로 이 일정을 삭제하시겠습니까?
              </p>
              <p className={styles.modalWarning}>
                삭제된 일정은 복구할 수 없으며, 모든 참여자 정보도 함께 삭제됩니다.
              </p>
            </div>
            
            <div className={styles.modalFooter}>
              <button 
                className={styles.modalCancelButton}
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                취소
              </button>
              <button 
                className={styles.modalDeleteButton}
                onClick={handleDeleteSchedule}
                disabled={deleting}
              >
                {deleting ? '삭제 중...' : '삭제하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleDetailPage; 