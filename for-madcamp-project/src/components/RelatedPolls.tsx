import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import styles from './RelatedPolls.module.css';

interface Poll {
  pollId: number;
  pollName: string;
  creatorName: string;
  createdAt: string;
  deadline: string | null;
  totalVotes: number;
  hasVoted: boolean;
}

interface RelatedPollsProps {
  scheduleId?: number; // 수정 시에만 사용
  relatedPollId?: number; // 현재 연관된 투표 ID
  onPollSelect?: (pollId: number | null) => void; // 투표 선택 콜백
  readonly?: boolean; // 읽기 전용 모드
}

const RelatedPolls = ({ scheduleId, relatedPollId, onPollSelect, readonly = false }: RelatedPollsProps) => {
  const router = useRouter();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPollId, setSelectedPollId] = useState<number | null>(relatedPollId || null);

  useEffect(() => {
    fetchPolls();
  }, []);

  useEffect(() => {
    setSelectedPollId(relatedPollId || null);
  }, [relatedPollId]);

  const fetchPolls = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('인증 토큰이 없습니다.');
        return;
      }

      // readonly 모드이고 relatedPollId가 없으면 투표를 가져오지 않음
      if (readonly && !relatedPollId) {
        setPolls([]);
        return;
      }

      // 1. 유저의 class_id 조회
      const { data: profile, error: profileError } = await supabase
        .from('PROFILES')
        .select('class_id')
        .eq('id', session.user.id)
        .single();

      if (profileError || !profile?.class_id) {
        setError('분반 정보를 찾을 수 없습니다.');
        return;
      }

      // readonly 모드이고 특정 투표 ID가 있으면 그 투표만 가져오기
      if (readonly && relatedPollId) {
        const response = await fetch(`/api/polls/${relatedPollId}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        if (!response.ok) {
          throw new Error('연관된 투표를 불러오는데 실패했습니다.');
        }

        const data = await response.json();
        setPolls([{
          pollId: data.pollId,
          pollName: data.pollName,
          creatorName: data.creatorName,
          createdAt: data.createdAt,
          deadline: data.deadline,
          totalVotes: data.totalVotes,
          hasVoted: data.hasVoted
        }]);
        return;
      }

      // 편집 모드일 때만 전체 투표 목록 조회
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

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return '방금 전';
    if (diffInHours < 24) return `${diffInHours}시간 전`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}일 전`;
    
    return `${diffInDays}일 전`;
  };

  const isPollClosed = (deadline: string | null) => {
    if (!deadline) return false;
    return new Date() > new Date(deadline);
  };

  const handlePollSelect = (pollId: number) => {
    if (readonly) {
      // 읽기 전용 모드에서는 투표 상세 페이지로 이동
      router.push(`/vote/${pollId}`);
      return;
    }

    const newSelectedId = selectedPollId === pollId ? null : pollId;
    setSelectedPollId(newSelectedId);
    onPollSelect?.(newSelectedId);
  };

  const handleCreatePoll = () => {
    router.push('/vote/create');
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>연관 투표</h3>
        </div>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>투표 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>연관 투표</h3>
        </div>
        <div className={styles.errorContainer}>
          <p className={styles.errorMessage}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>연관 투표</h3>
        {!readonly && (
          <button onClick={handleCreatePoll} className={styles.createButton}>
            + 투표 만들기
          </button>
        )}
      </div>

      {polls.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📊</div>
          <p className={styles.emptyDescription}>
            {readonly ? '연관된 투표가 없습니다.' : '아직 생성된 투표가 없습니다.'}
          </p>
          {!readonly && (
            <button onClick={handleCreatePoll} className={styles.emptyButton}>
              투표 만들기
            </button>
          )}
        </div>
      ) : (
        <div className={styles.pollsList}>
          {(readonly ? polls : polls.slice(0, 3)).map((poll) => (
            <div
              key={poll.pollId}
              className={`${styles.pollCard} ${
                selectedPollId === poll.pollId ? styles.selected : ''
              } ${poll.hasVoted ? styles.voted : ''}`}
              onClick={() => handlePollSelect(poll.pollId)}
            >
              <div className={styles.pollHeader}>
                <div className={styles.pollInfo}>
                  <h4 className={styles.pollQuestion}>{poll.pollName}</h4>
                  <p className={styles.pollMeta}>
                    {poll.creatorName} • {formatTimeAgo(poll.createdAt)} • {poll.totalVotes}표
                  </p>
                </div>
                <div className={styles.pollStatus}>
                  {poll.deadline && (
                    <span className={`${styles.deadline} ${isPollClosed(poll.deadline) ? styles.closed : styles.active}`}>
                      {isPollClosed(poll.deadline) ? '마감' : '진행중'}
                    </span>
                  )}
                  {poll.hasVoted && (
                    <span className={styles.votedBadge}>투표완료</span>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {!readonly && polls.length > 3 && (
            <button 
              onClick={() => router.push('/vote')} 
              className={styles.viewAllButton}
            >
              전체 투표 보기 ({polls.length}개)
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default RelatedPolls; 