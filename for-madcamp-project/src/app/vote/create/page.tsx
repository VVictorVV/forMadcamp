"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabaseClient';
import styles from './createPoll.module.css';

interface PollOption {
  id: string;
  name: string;
}

const CreatePollPage = () => {
  const { user } = useAuth();
  const router = useRouter();
  
  const [pollName, setPollName] = useState('');
  const [options, setOptions] = useState<PollOption[]>(() => [
    { id: Date.now().toString() + '1', name: '' },
    { id: (Date.now() + 1).toString() + '2', name: '' }
  ]);
  const [deadline, setDeadline] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('인증 토큰이 없습니다.');
        return;
      }

      const response = await fetch('/api/polls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          pollName: pollName.trim(),
          deadline: finalDeadline,
          options: validOptions.map(option => option.name.trim())
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '투표 생성에 실패했습니다.');
      }

      const data = await response.json();
      router.push(`/vote/${data.pollId}`);
    } catch (err) {
      console.error('Error creating poll:', err);
      setError(err instanceof Error ? err.message : '투표 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    return pollName.trim() && 
           options.filter(option => option.name.trim()).length >= 2;
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button onClick={() => router.push('/vote')} className={styles.backButton}>
          ← 투표 목록으로
        </button>
      </header>

      {/* 제목 섹션 */}
      <div className={styles.titleSection}>
        <h1 className={styles.pageTitle}>새 투표 만들기</h1>
        <p className={styles.pageDescription}>
          새로운 투표를 생성하고 공유해보세요
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

            {/* 선택지 입력 */}
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
                      />
                      {options.length > 2 && (
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

          {/* 오른쪽 섹션 - 마감일 설정 및 생성 버튼 */}
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

            {/* 투표 생성 버튼 */}
            <div className={styles.createSection}>
              <button
                onClick={handleSubmit}
                disabled={!isFormValid() || loading}
                className={`${styles.createButton} ${!isFormValid() ? styles.disabled : ''}`}
              >
                {loading ? '투표 생성 중...' : '투표 생성하기'}
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

export default CreatePollPage; 