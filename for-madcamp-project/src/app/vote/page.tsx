"use client";

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import styles from './vote.module.css';
import Image from 'next/image';

interface Poll {
  pollId: number;
  pollName: string;
  creatorName: string;
  createdAt: string;
  deadline: string | null;
  totalVotes: number;
  hasVoted: boolean;
}

const VotePage = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userClassId, setUserClassId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'deadline' | 'latest' | 'creator'>('latest');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (!user) {
      router.push('/auth');
      return;
    }

    const fetchPolls = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. 유저의 class_id 조회
        const { data: profile, error: profileError } = await supabase
          .from('PROFILES')
          .select('class_id')
          .eq('id', user.id)
          .single();

        if (profileError || !profile?.class_id) {
          setError('분반 정보를 찾을 수 없습니다.');
          return;
        }

        setUserClassId(profile.class_id);

        // 2. 투표 목록 조회
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setError('인증 토큰이 없습니다.');
          return;
        }

        const response = await fetch(`/api/classes/${profile.class_id}/polls`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        if (!response.ok) {
          throw new Error('투표 목록을 불러오는데 실패했습니다.');
        }

        const data = await response.json();
        setPolls(data.polls || []);
      } catch (err) {
        console.error('Error fetching polls:', err);
        setError('투표 목록을 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchPolls();
  }, [user, router]);

  // 실시간 시간 업데이트 (1초마다)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleCreatePoll = () => {
    router.push('/vote/create');
  };

  const handlePollClick = (pollId: number) => {
    router.push(`/vote/${pollId}`);
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return '방금 전';
    if (diffInHours < 24) return `${diffInHours}시간 전`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}일 전`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks}주 전`;
    
    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths}개월 전`;
  };

  const isPollClosed = (deadline: string | null) => {
    if (!deadline) return false;
    return new Date() > new Date(deadline);
  };

  const getTimeUntilDeadline = (deadline: string | null) => {
    if (!deadline) return Infinity;
    const deadlineDate = new Date(deadline);
    if (deadlineDate <= currentTime) return Infinity; // 마감된 투표는 무시
    return deadlineDate.getTime() - currentTime.getTime();
  };

  const formatTimeRemaining = (deadline: string | null) => {
    if (!deadline) return null;
    const timeRemaining = getTimeUntilDeadline(deadline);
    if (timeRemaining === Infinity) return null;
    
    const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
    
    // 24시간이 넘으면 null 반환
    if (hours >= 24) return null;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const sortedPolls = useMemo(() => {
    const pollsCopy = [...polls];
    
    switch (sortBy) {
      case 'deadline':
        return pollsCopy.sort((a, b) => {
          const aTime = getTimeUntilDeadline(a.deadline);
          const bTime = getTimeUntilDeadline(b.deadline);
          return aTime - bTime; // 마감일이 가까운 순
        });
      case 'latest':
        return pollsCopy.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case 'creator':
        return pollsCopy.sort((a, b) => 
          a.creatorName.localeCompare(b.creatorName)
        );
      default:
        return pollsCopy;
    }
  }, [polls, sortBy]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>투표 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.titleSection}>
            <h1 className={styles.title}>투표</h1>
            <p className={styles.subtitle}>
              분반 내에서 진행되는 투표들을 확인하고 참여해보세요.
            </p>
          </div>
          <button onClick={handleCreatePoll} className={styles.createButton}>
            <Image src="/pencil.svg" alt="Create" width={16} height={16} />
            <span>투표 만들기</span>
          </button>
        </div>
        
        <div className={styles.sortContainer}>
          <span className={styles.sortLabel}>정렬:</span>
          <div className={styles.sortButtons}>
            <button
              className={`${styles.sortButton} ${sortBy === 'deadline' ? styles.sortButtonActive : ''}`}
              onClick={() => setSortBy('deadline')}
            >
              마감 순
            </button>
            <button
              className={`${styles.sortButton} ${sortBy === 'latest' ? styles.sortButtonActive : ''}`}
              onClick={() => setSortBy('latest')}
            >
              최신 순
            </button>
            <button
              className={`${styles.sortButton} ${sortBy === 'creator' ? styles.sortButtonActive : ''}`}
              onClick={() => setSortBy('creator')}
            >
              유저 이름 순
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className={styles.errorContainer}>
          <p className={styles.errorMessage}>{error}</p>
        </div>
      )}

      <main className={styles.main}>
        {polls.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📊</div>
            <h3 className={styles.emptyTitle}>아직 투표가 없습니다</h3>
            <p className={styles.emptyDescription}>
              첫 번째 투표를 만들어보세요!
            </p>
            <button onClick={handleCreatePoll} className={styles.emptyButton}>
              투표 만들기
            </button>
          </div>
        ) : (
          <div className={styles.pollsGrid}>
            {sortedPolls.map((poll) => (
              <div
                key={poll.pollId}
                className={`${styles.pollCard} ${poll.hasVoted ? styles.voted : ''}`}
                onClick={() => handlePollClick(poll.pollId)}
              >
                <div className={styles.pollHeader}>
                  <div className={styles.pollCategory}>
                    <span className={styles.categoryTag}>{poll.creatorName}님이 생성</span>
                  </div>
                  <div className={styles.voteCount}>
                    <span className={styles.voteCountText}>{poll.totalVotes}표</span>
                  </div>
                </div>
                
                <div className={styles.pollContent}>
                  <h3 className={styles.pollQuestion}>{poll.pollName}</h3>
                  <p className={styles.pollTime}>
                    {formatTimeAgo(poll.createdAt)}
                  </p>
                </div>

                {poll.deadline && (
                  <div className={styles.pollDeadline}>
                    {isPollClosed(poll.deadline) ? (
                      <span className={styles.deadlineClosed}>마감됨</span>
                    ) : (
                      <div className={styles.deadlineInfo}>
                        <span className={styles.deadlineActive}>
                          마감: {new Date(poll.deadline).toLocaleDateString()}
                        </span>
                        {formatTimeRemaining(poll.deadline) && (
                          <span className={styles.timeRemaining}>
                            남은 시간 {formatTimeRemaining(poll.deadline)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {poll.hasVoted && (
                  <div className={styles.votedBadge}>
                    <span>투표 완료</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default VotePage; 