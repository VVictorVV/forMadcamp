"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabaseClient';
import styles from './createSchedule.module.css';
import Image from 'next/image';

interface Participant {
  id: string;
  name: string;
  role: string;
  profileImageUri?: string;
}

const CreateSchedulePage = () => {
  const { user } = useAuth();
  const router = useRouter();
  
  const [scheduleName, setScheduleName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showParticipantModal, setShowParticipantModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<Array<{
    id: string;
    name: string;
    class_id: number | null;
  }>>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // 현재 날짜와 시간을 기본값으로 설정
  useEffect(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 5);
    
    setStartDate(today);
    setStartTime(currentTime);
    setEndDate(today);
    setEndTime(currentTime);
  }, []);

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
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('인증 토큰이 없습니다.');
        return;
      }

      const response = await fetch('/api/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          scheduleName: scheduleName.trim(),
          description: description.trim(),
          when: startDateTime.toISOString(),
          until: endDateTime.toISOString(),
          participantIds: participants.map(p => p.id)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '일정 생성에 실패했습니다.');
      }

      const data = await response.json();
      router.push('/schedule');
    } catch (err) {
      console.error('Error creating schedule:', err);
      setError(err instanceof Error ? err.message : '일정 생성에 실패했습니다.');
    } finally {
      setLoading(false);
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

  // 사용자 목록 불러오기
  const fetchAvailableUsers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      // 현재 사용자의 프로필 정보 가져오기
      const { data: currentProfile } = await supabase
        .from('PROFILES')
        .select('class_id')
        .eq('id', user?.id)
        .single();

      if (!currentProfile?.class_id) return;

      // 같은 분반의 다른 사용자들 가져오기
      const { data: users } = await supabase
        .from('PROFILES')
        .select('id, name, class_id')
        .eq('class_id', currentProfile.class_id)
        .neq('id', user?.id);

      if (users) {
        // 이미 추가된 사용자들을 제외
        const addedUserIds = participants.map(p => p.id);
        const availableUsers = users.filter(user => !addedUserIds.includes(user.id));
        setAvailableUsers(availableUsers);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  // 모달 열기
  const openParticipantModal = () => {
    setSelectedUserIds([]);
    fetchAvailableUsers();
    setShowParticipantModal(true);
  };

  // 모달 닫기
  const closeParticipantModal = () => {
    setShowParticipantModal(false);
    setSelectedUserIds([]);
  };

  // 사용자 선택/해제
  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // 선택된 사용자들을 참여자로 추가
  const addSelectedParticipants = () => {
    const newParticipants = availableUsers
      .filter(user => selectedUserIds.includes(user.id))
      .map(user => ({
        id: user.id,
        name: user.name,
        role: '참여자'
      }));

    setParticipants(prev => [...prev, ...newParticipants]);
    closeParticipantModal();
  };

  // 참여자 삭제
  const removeParticipant = (participantId: string) => {
    setParticipants(prev => prev.filter(p => p.id !== participantId));
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button onClick={() => router.push('/schedule')} className={styles.backButton}>
          ← 일정 목록으로
        </button>
      </header>

      {/* 제목 섹션 */}
      <div className={styles.titleSection}>
        <h1 className={styles.pageTitle}>새 일정 만들기</h1>
        <p className={styles.pageDescription}>
          새로운 일정을 생성하고 공유해보세요
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
                    />
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className={styles.timeInput}
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
                    />
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className={styles.timeInput}
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
                                 {/* 주최자 (생성자) */}
                 <div className={styles.participantItem}>
                   <div className={styles.participantInfo}>
                     <div className={styles.participantAvatar}>
                       <Image src="/logo.svg" alt="Profile" width={40} height={40} />
                     </div>
                     <span className={styles.participantName}>나 (주최자)</span>
                   </div>
                   <span className={styles.participantRole}>주최자</span>
                 </div>
                
                                 {/* 추가된 참여자들 */}
                 {participants.map((participant, index) => (
                   <div key={participant.id} className={styles.participantItem}>
                     <div className={styles.participantInfo}>
                       <div className={styles.participantAvatar}>
                         <Image src="/logo.svg" alt={`${participant.name} profile`} width={40} height={40} />
                       </div>
                       <span className={styles.participantName}>{participant.name}</span>
                     </div>
                     <input
                       type="text"
                       value={participant.role}
                       onChange={(e) => {
                         const updatedParticipants = [...participants];
                         updatedParticipants[index].role = e.target.value;
                         setParticipants(updatedParticipants);
                       }}
                       placeholder="역할"
                       className={styles.roleInput}
                     />
                     <button
                       className={styles.removeParticipantButton}
                       onClick={() => removeParticipant(participant.id)}
                       title="삭제하기"
                     >
                       ×
                     </button>
                   </div>
                 ))}
              </div>
              
                             {/* 참여자 추가 버튼 */}
               <button 
                 className={styles.addParticipantButton}
                 onClick={openParticipantModal}
               >
                 + 참여자 추가
               </button>
            </div>

            {/* 일정 생성 버튼 */}
            <div className={styles.createSection}>
              <button
                onClick={handleSubmit}
                disabled={!isFormValid() || loading}
                className={`${styles.createButton} ${!isFormValid() ? styles.disabled : ''}`}
              >
                {loading ? '일정 생성 중...' : '일정 생성하기'}
              </button>
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

       {/* 참여자 선택 모달 */}
       {showParticipantModal && (
         <div className={styles.modalOverlay} onClick={closeParticipantModal}>
           <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
             <div className={styles.modalHeader}>
               <h3 className={styles.modalTitle}>참여자 선택</h3>
               <button 
                 className={styles.modalCloseButton}
                 onClick={closeParticipantModal}
               >
                 ×
               </button>
             </div>
             
             <div className={styles.modalBody}>
               <p className={styles.modalDescription}>
                 일정에 참여할 사람들을 선택해주세요
               </p>
               
               <div className={styles.userList}>
                 {availableUsers.map((user) => (
                   <div 
                     key={user.id}
                     className={`${styles.userItem} ${
                       selectedUserIds.includes(user.id) ? styles.selected : ''
                     }`}
                     onClick={() => toggleUserSelection(user.id)}
                   >
                     <div className={styles.userInfo}>
                       <div className={styles.userAvatar}>
                         <Image src="/logo.svg" alt={`${user.name} profile`} width={40} height={40} />
                       </div>
                       <span className={styles.userName}>{user.name}</span>
                     </div>
                     <div className={styles.userCheckbox}>
                       {selectedUserIds.includes(user.id) && (
                         <div className={styles.checkmark}>✓</div>
                       )}
                     </div>
                   </div>
                 ))}
               </div>
             </div>
             
             <div className={styles.modalFooter}>
               <button 
                 className={styles.modalCancelButton}
                 onClick={closeParticipantModal}
               >
                 취소
               </button>
               <button 
                 className={styles.modalConfirmButton}
                 onClick={addSelectedParticipants}
                 disabled={selectedUserIds.length === 0}
               >
                 선택 완료 ({selectedUserIds.length}명)
               </button>
             </div>
           </div>
         </div>
       )}
     </div>
   );
 };

export default CreateSchedulePage; 