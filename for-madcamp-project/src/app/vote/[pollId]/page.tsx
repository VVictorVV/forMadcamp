"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabaseClient';
import styles from './pollDetail.module.css';
import Image from 'next/image';
import DeleteConfirmModal from './components/DeleteConfirmModal';

interface PollOption {
  optionId: number;
  optionName: string;
  voteCount: number;
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
  options: PollOption[];
}

const PollDetailPage = () => {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const pollId = params.pollId as string;
  
  const [poll, setPoll] = useState<PollDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
      setSelectedOption(data.currentUserVote);
    } catch (err) {
      console.error('Error fetching poll detail:', err);
      setError('투표 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async () => {
    if (!selectedOption || !poll) return;

    try {
      setVoting(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`/api/polls/${pollId}/votes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ optionId: selectedOption })
      });

      if (!response.ok) {
        throw new Error('투표에 실패했습니다.');
      }

      // 투표 성공 후 데이터 새로고침
      await fetchPollDetail();
    } catch (err) {
      console.error('Error voting:', err);
      setError('투표에 실패했습니다.');
    } finally {
      setVoting(false);
    }
  };

  const handleCancelVote = async () => {
    if (!poll) return;

    try {
      setCancelling(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`/api/polls/${pollId}/votes`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('투표 취소에 실패했습니다.');
      }

      // 투표 취소 성공 후 데이터 새로고침
      await fetchPollDetail();
      setShowCancelConfirm(false);
    } catch (err) {
      console.error('Error cancelling vote:', err);
      setError('투표 취소에 실패했습니다.');
    } finally {
      setCancelling(false);
    }
  };

  const handleDeletePoll = async () => {
    if (!poll) return;

    try {
      setDeleting(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`/api/polls/${pollId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '투표 삭제에 실패했습니다.');
      }

      // 삭제 성공 후 투표 목록으로 이동
      router.push('/vote');
    } catch (err) {
      console.error('Error deleting poll:', err);
      setError(err instanceof Error ? err.message : '투표 삭제에 실패했습니다.');
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleOptionClick = (optionId: number) => {
    if (poll?.hasVoted) return; // 이미 투표한 경우 선택 불가
    setSelectedOption(optionId);
  };

  const getVotePercentage = (voteCount: number) => {
    if (!poll || poll.totalVotes === 0) return 0;
    return Math.round((voteCount / poll.totalVotes) * 100);
  };

  const getProgressBarColor = (index: number) => {
    const colors = ['#ef4444', '#10b981', '#f59e0b', '#3b82f6'];
    return colors[index % colors.length];
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

  const isPollClosed = () => {
    if (!poll?.deadline) return false;
    return new Date() > new Date(poll.deadline);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert('링크가 복사되었습니다!');
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const shareToTwitter = () => {
    const text = `${poll?.pollName} - 투표에 참여해보세요!`;
    const url = window.location.href;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`);
  };

  const shareToFacebook = () => {
    const url = window.location.href;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
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
        <button onClick={() => router.push('/vote')} className={styles.backButton}>
          ← 투표 목록으로
        </button>
      </header>

      {/* 제목과 메타 정보 섹션 */}
      <div className={styles.titleSection}>
        <h1 className={styles.pollTitle}>{poll.pollName}</h1>
        <div className={styles.pollMeta}>
          <span className={styles.creatorInfo}>
            {poll.creatorName}님이 {formatTimeAgo(poll.createdAt)}에 생성한 투표
          </span>
        </div>
      </div>

      <main className={styles.main}>
        <div className={styles.contentWrapper}>
          {/* 왼쪽 섹션 - 투표 옵션들 */}
          <div className={styles.leftSection}>
            <div className={styles.optionsContainer}>
              {poll.options.map((option, index) => {
                const percentage = getVotePercentage(option.voteCount);
                const isSelected = selectedOption === option.optionId;
                const isVoted = poll.hasVoted;
                
                return (
                  <div
                    key={option.optionId}
                    className={`${styles.optionItem} ${isSelected ? styles.selected : ''} ${isVoted ? styles.voted : ''}`}
                    onClick={() => handleOptionClick(option.optionId)}
                  >
                    <div className={styles.optionContent}>
                      <div className={styles.optionInfo}>
                        <span className={styles.optionName}>{option.optionName}</span>
                        <div className={styles.optionStats}>
                          <span className={styles.percentage}>{percentage}%</span>
                          <span className={styles.voteCount}>({option.voteCount}표)</span>
                        </div>
                      </div>
                      <div className={styles.progressBarContainer}>
                        <div 
                          className={styles.progressBar}
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: getProgressBarColor(index)
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 오른쪽 섹션 - 투표 버튼과 총 투표 수 */}
          <div className={styles.rightSection}>
            {/* 관리 버튼 (투표 생성자만) */}
            {poll.creatorName === user?.user_metadata?.name && (
              <div className={styles.manageSection}>
                <button 
                  onClick={() => router.push(`/vote/${pollId}/edit`)}
                  className={styles.editButton}
                >
                  수정하기
                </button>
                <button 
                  onClick={() => setShowDeleteModal(true)}
                  className={styles.deleteButton}
                >
                  삭제하기
                </button>
              </div>
            )}

            {/* 투표 버튼 */}
            {!poll.hasVoted && !isPollClosed() && (
              <div className={styles.voteSection}>
                <button
                  onClick={handleVote}
                  disabled={!selectedOption || voting}
                  className={`${styles.voteButton} ${!selectedOption ? styles.disabled : ''}`}
                >
                  {voting ? '투표 중...' : '투표하기'}
                </button>
              </div>
            )}

            {/* 투표 완료 상태 */}
            {poll.hasVoted && !isPollClosed() && (
              <div 
                className={styles.votedMessage}
                onMouseEnter={() => setShowCancelConfirm(true)}
                onMouseLeave={() => setShowCancelConfirm(false)}
                onClick={handleCancelVote}
              >
                <span className={showCancelConfirm ? styles.cancelText : styles.votedText}>
                  {showCancelConfirm ? '투표를 취소하시겠습니까?' : '✓ 투표를 완료했습니다'}
                </span>
                {cancelling && <span className={styles.cancellingText}>취소 중...</span>}
              </div>
            )}

            {/* 마감 상태 */}
            {isPollClosed() && (
              <div className={styles.closedMessage}>
                <span>투표가 마감되었습니다</span>
              </div>
            )}

            {/* 총 투표 수 */}
            <div className={styles.totalVotes}>
              <span className={styles.totalVotesLabel}>총 투표 수</span>
              <span className={styles.totalVotesCount}>{poll.totalVotes}표</span>
            </div>
          </div>
        </div>

        {/* 공유 섹션 - 주석 처리 */}
        {/* 
        <div className={styles.shareSection}>
          <h3 className={styles.shareTitle}>공유하기</h3>
          <div className={styles.shareButtons}>
            <button onClick={shareToTwitter} className={styles.shareButton}>
              <span>Twitter</span>
            </button>
            <button onClick={shareToFacebook} className={styles.shareButton}>
              <span>Facebook</span>
            </button>
            <button onClick={copyToClipboard} className={styles.shareButton}>
              <span>링크 복사</span>
            </button>
          </div>
        </div>
        */}

        {/* 신고 링크 - 주석 처리 */}
        {/* 
        <div className={styles.reportSection}>
          <button className={styles.reportButton}>
            신고하기
          </button>
        </div>
        */}
      </main>

      {/* 삭제 확인 모달 */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeletePoll}
        pollName={poll?.pollName || ''}
        loading={deleting}
      />
    </div>
  );
};

export default PollDetailPage; 