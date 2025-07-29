"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../../context/AuthContext';
import { supabase } from '../../../../lib/supabaseClient';
import styles from './editPoll.module.css';

interface PollOption {
  id: string;
  optionId?: number;
  name: string;
}

interface PollDetail {
  pollId: number;
  pollName: string;
  creatorName: string;
  createdAt: string;
  deadline: string | null;
  totalVotes: number;
  hasVoted: boolean;
  currentUserVote: number | null;
  options: {
    optionId: number;
    optionName: string;
    voteCount: number;
  }[];
}

const EditPollPage = () => {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const pollId = params.pollId as string;
  
  const [poll, setPoll] = useState<PollDetail | null>(null);
  const [pollName, setPollName] = useState('');
  const [options, setOptions] = useState<PollOption[]>([]);
  const [deadline, setDeadline] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/auth');
      return;
    }

    if (!pollId) {
      setError('투표 ID가 없습니다.');
      return;
    }

    fetchPollDetail();
  }, [user, pollId, router]);

  const fetchPollDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('인증 토큰이 없습니다.');
        return;
      }

      const response = await fetch(`/api/polls/${pollId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('투표 정보를 불러오는데 실패했습니다.');
      }

      const data = await response.json();
      setPoll(data);
      
      // 폼 데이터 설정
      setPollName(data.pollName);
      
      // 마감일 설정
      if (data.deadline) {
        const deadlineDate = new Date(data.deadline);
        setDeadline(deadlineDate.toISOString().split('T')[0]);
        setDeadlineTime(deadlineDate.toTimeString().split(' ')[0]);
      }
      
      // 선택지 설정
      const pollOptions = data.options.map((option: { optionId: number; optionName: string }, index: number) => ({
        id: Date.now().toString() + index,
        optionId: option.optionId,
        name: option.optionName
      }));
      setOptions(pollOptions);
    } catch (err) {
      console.error('Error fetching poll detail:', err);
      setError('투표 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const addOption = () => {
    const newId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    setOptions([...options, { id: newId, name: '' }]);
  };

  const removeOption = (id: string) => {
    if (options.length <= 2) {
      setError('최소 2개의 선택지가 필요합니다.');
      return;
    }
    setOptions(options.filter(option => option.id !== id));
    setError(null);
  };

  const updateOption = (id: string, name: string) => {
    setOptions(options.map(option => 
      option.id === id ? { ...option, name } : option
    ));
  };

  const handleSubmit = async () => {
    // 유효성 검사
    if (!pollName.trim()) {
      setError('투표 제목을 입력해주세요.');
      return;
    }

    const validOptions = options.filter(option => option.name.trim());
    if (validOptions.length < 2) {
      setError('최소 2개의 선택지를 입력해주세요.');
      return;
    }

    // 마감일 설정
    let finalDeadline = null;
    if (deadline && deadlineTime) {
      const deadlineDate = new Date(`${deadline}T${deadlineTime}`);
      finalDeadline = deadlineDate.toISOString();
    }

    try {
      setSaving(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('인증 토큰이 없습니다.');
        return;
      }

      const response = await fetch(`/api/polls/${pollId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          pollName: pollName.trim(),
          deadline: finalDeadline
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '투표 수정에 실패했습니다.');
      }

      // 수정 성공 후 투표 상세 페이지로 이동
      router.push(`/vote/${pollId}`);
    } catch (err) {
      console.error('Error updating poll:', err);
      setError(err instanceof Error ? err.message : '투표 수정에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const isFormValid = () => {
    return pollName.trim() && 
           options.filter(option => option.name.trim()).length >= 2;
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>투표 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !poll) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <p className={styles.errorMessage}>{error || '투표를 찾을 수 없습니다.'}</p>
          <button onClick={() => router.push('/vote')} className={styles.backButton}>
            투표 목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button onClick={() => router.push(`/vote/${pollId}`)} className={styles.backButton}>
          ← 투표 상세보기로
        </button>
      </header>

      {/* 제목 섹션 */}
      <div className={styles.titleSection}>
        <h1 className={styles.pageTitle}>투표 수정하기</h1>
        <p className={styles.pageDescription}>
          투표 제목과 마감일을 수정할 수 있습니다
        </p>
      </div>

      <main className={styles.main}>
        <div className={styles.contentWrapper}>
          {/* 왼쪽 섹션 - 투표 폼 */}
          <div className={styles.leftSection}>
            {/* 투표 제목 입력 */}
            <div className={styles.formSection}>
              <label className={styles.label}>투표 제목</label>
              <input
                type="text"
                value={pollName}
                onChange={(e) => setPollName(e.target.value)}
                placeholder="투표 제목을 입력하세요"
                className={styles.titleInput}
                maxLength={100}
              />
            </div>

            {/* 선택지 표시 (수정 불가) */}
            <div className={styles.formSection}>
              <label className={styles.label}>투표 선택지</label>
              <div className={styles.optionsContainer}>
                {options.map((option, index) => (
                  <div key={option.id} className={styles.optionItem}>
                    <div className={styles.optionContent}>
                      <input
                        type="text"
                        value={option.name}
                        onChange={(e) => updateOption(option.id, e.target.value)}
                        placeholder={`선택지 ${index + 1}`}
                        className={styles.optionInput}
                        maxLength={50}
                        disabled={option.optionId !== undefined} // 기존 선택지는 수정 불가
                      />
                      {option.optionId === undefined && options.length > 2 && (
                        <button
                          onClick={() => removeOption(option.id)}
                          className={styles.removeButton}
                          type="button"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* 새로운 선택지 추가 버튼 */}
              <button
                onClick={addOption}
                className={styles.addOptionButton}
                type="button"
              >
                + 새로운 선택지 추가
              </button>
            </div>
          </div>

          {/* 오른쪽 섹션 - 마감일 설정 및 수정 버튼 */}
          <div className={styles.rightSection}>
            {/* 마감일 설정 */}
            <div className={styles.deadlineSection}>
              <label className={styles.label}>마감일 설정 (선택사항)</label>
              <div className={styles.deadlineInputs}>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className={styles.dateInput}
                  min={new Date().toISOString().split('T')[0]}
                />
                <input
                  type="time"
                  value={deadlineTime}
                  onChange={(e) => setDeadlineTime(e.target.value)}
                  className={styles.timeInput}
                />
              </div>
              <p className={styles.deadlineHint}>
                마감일을 설정하지 않으면 무기한 투표가 됩니다
              </p>
            </div>

            {/* 투표 수정 버튼 */}
            <div className={styles.updateSection}>
              <button
                onClick={handleSubmit}
                disabled={!isFormValid() || saving}
                className={`${styles.updateButton} ${!isFormValid() ? styles.disabled : ''}`}
              >
                {saving ? '투표 수정 중...' : '투표 수정 완료하기'}
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
    </div>
  );
};

export default EditPollPage; 