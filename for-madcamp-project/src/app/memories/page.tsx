'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { type User } from '@supabase/supabase-js';
import styles from './memories.module.css';
import AddMemoryModal from './components/AddMemoryModal';

interface Memory {
  memoryId: number;
  name: string;
  imageUrl: string;
  createdAt: string;
  creatorName:string;
  creator_id: string; // creator_id 추가
}

interface Class {
  class_id: number;
  class_num: number;
}

// --- 상세 보기 모달 컴포넌트 ---
const MemoryDetailModal = ({ memory, currentUser, isClosing, onClose, onClosed, onDelete }: {
  memory: Memory;
  currentUser: User | null;
  isClosing: boolean;
  onClose: () => void;
  onClosed: () => void; // 애니메이션 종료 후 호출될 함수
  onDelete: (memoryId: number) => void;
}) => {
  const handleAnimationEnd = () => {
    if (isClosing) {
      onClosed(); // 애니메이션이 끝나면 onClosed 함수를 호출
    }
  };

  const isOwner = currentUser?.id === memory.creator_id;

  return (
    <div 
      className={`${styles.modalBackdrop} ${isClosing ? styles.closing : ''}`}
      onClick={onClose}
      onAnimationEnd={handleAnimationEnd} // 애니메이션 종료 이벤트 리스너
    >
      <div 
        className={`${styles.modalContent} ${isClosing ? styles.closing : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className={styles.closeButton}>&times;</button>
        <img src={memory.imageUrl} alt={memory.name} className={styles.modalImage} />
        <div className={styles.modalDetails}>
          <h2>{memory.name}</h2>
          <p>
            <strong>업로드:</strong> {memory.creatorName}
          </p>
          <p>
            <strong>날짜:</strong> {new Date(memory.createdAt).toLocaleString('ko-KR')}
          </p>
          {isOwner && (
            <button onClick={() => onDelete(memory.memoryId)} className={styles.deleteButton}>
              삭제하기
            </button>
          )}
        </div>
      </div>
    </div>
  );
};


// 빨랫줄 곡선에 맞춰 사진의 위치 스타일을 반환하는 함수
const getRopeStyle = (index: number, total: number) => {
  if (total <= 1) {
    return { left: '50%', top: '20%' } as React.CSSProperties;
  }
  const horizontalPadding = 0.2;
  const availableWidth = 1 - (horizontalPadding * 2);
  const x = (total <= 1) ? 0.5 : (index / (total - 1)) * availableWidth + horizontalPadding;
  const sagAmount = 0.1;
  const verticalOffset = 0.35;
  const y = sagAmount * (1 - 6 * Math.pow(x - 0.5, 2)) + verticalOffset;
  return { left: `${x * 100}%`, top: `${y * 100}%` } as React.CSSProperties;
};


const MemoriesPage = () => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userClass, setUserClass] = useState<Class | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [isDetailModalClosing, setIsDetailModalClosing] = useState(false);
  const [currentPage, setCurrentPage] = useState(0); // 페이지네이션 상태
  const [isFading, setIsFading] = useState(false); // 페이지 전환 애니메이션 상태

  const PHOTOS_PER_PAGE = 8;
  const totalPages = Math.ceil(memories.length / PHOTOS_PER_PAGE);
  
  const fetchUserInfo = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('로그인이 필요합니다.'); return; }
      setCurrentUser(session.user);
      const { data: profile, error: profileError } = await supabase.from('PROFILES').select('class_id').eq('id', session.user.id).single();
      if (profileError) throw new Error('사용자 프로필을 찾을 수 없습니다.');
      const { data: classData, error: classError } = await supabase.from('CAMP_CLASSES').select('class_id, class_num').eq('class_id', profile.class_id).single();
      if (classError) throw new Error('분반 정보를 찾을 수 없습니다.');
      setUserClass(classData);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      setError(errorMessage);
    }
  }, []);

  const fetchMemories = useCallback(async () => {
    if (!userClass) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const response = await fetch(`/api/classes/${userClass.class_id}/memories`, { headers: { 'Authorization': `Bearer ${session.access_token}` } });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '추억을 불러오는데 실패했습니다.');
      }
      const data = await response.json();
      const sortedMemories = data.memories.sort((a: Memory, b: Memory) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setMemories(sortedMemories);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '추억을 불러오는데 실패했습니다.';
      setError(errorMessage);
    }
  }, [userClass]);

  const handleMemoryAdded = useCallback(() => {
    fetchMemories();
    setIsAddModalOpen(false);
  }, [fetchMemories]);

  const handleCloseDetailModal = () => setIsDetailModalClosing(true);
  const handleRealCloseDetailModal = () => {
    setSelectedMemory(null);
    setIsDetailModalClosing(false);
  }

  const handleDeleteMemory = async (memoryId: number) => {
    if (!window.confirm('정말로 이 추억을 삭제하시겠습니까?')) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('인증되지 않았습니다.');
      const response = await fetch(`/api/memories/${memoryId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '삭제에 실패했습니다.');
      }
      alert('추억이 삭제되었습니다.');
      handleCloseDetailModal();
      fetchMemories();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '삭제 중 오류가 발생했습니다.';
      alert(errorMessage);
    }
  };

  const changePage = (newPage: number) => {
    if (newPage < 0 || newPage >= totalPages || isFading) return;
    setIsFading(true);
    setTimeout(() => {
      setCurrentPage(newPage);
      setIsFading(false);
    }, 300); // CSS transition duration과 일치
  };

  useEffect(() => {
    fetchUserInfo();
  }, [fetchUserInfo]);

  useEffect(() => {
    if (userClass) {
      fetchMemories().finally(() => setLoading(false));
    } else {
       setLoading(false);
    }
  }, [userClass, fetchMemories]);

  // 현재 페이지에 보여줄 사진들 계산
  const startIndex = currentPage * PHOTOS_PER_PAGE;
  const endIndex = startIndex + PHOTOS_PER_PAGE;
  const currentVisibleMemories = memories.slice(startIndex, endIndex);
  const memoriesLine1 = currentVisibleMemories.slice(0, 4);
  const memoriesLine2 = currentVisibleMemories.slice(4, 8);

  if (loading) return <div className={styles.pageContainer}><div className={styles.loader}></div></div>;
  if (error) return <div className={styles.pageContainer}><p className={styles.errorText}>{error}</p></div>;
  if (!userClass) return <div className={styles.pageContainer}><p>분반 정보를 찾을 수 없습니다.</p></div>;
  
  return (
    <div className={styles.pageContainer}>
      {totalPages > 1 && (
        <>
          <button 
            className={`${styles.navButton} ${styles.navButtonLeft}`}
            onClick={() => changePage(currentPage - 1)}
            disabled={currentPage === 0 || isFading}
          >
            &#8249;
          </button>
          <button 
            className={`${styles.navButton} ${styles.navButtonRight}`}
            onClick={() => changePage(currentPage + 1)}
            disabled={currentPage === totalPages - 1 || isFading}
          >
            &#8250;
          </button>
        </>
      )}

      <div className={styles.header}>
        <h1>{userClass.class_num}분반 추억 갤러리</h1>
        <button onClick={() => setIsAddModalOpen(true)} className={styles.addButton}>
          + 새 추억 추가
        </button>
      </div>

      <div className={`${styles.galleryArea} ${isFading ? styles.fading : ''}`}>
        {currentVisibleMemories.length === 0 && !loading ? (
          <div className={styles.emptyState}>
            <p>아직 업로드된 추억이 없습니다.</p>
            <p>첫 번째 추억을 업로드해보세요!</p>
          </div>
        ) : (
          <>
            {[memoriesLine1, memoriesLine2].map((line, lineIndex) => (
              <div key={`${currentPage}-${lineIndex}`} className={styles.clothesline}>
                <svg viewBox="0 0 100 20" className={styles.ropeSvg}>
                  <path d="M 0,5 C 30,15 70,15 100,5" className={styles.ropeStrand1}/>
                  <path d="M 0,5 C 30,15 70,15 100,5" className={styles.ropeStrand2}/>
                </svg>
                {line.map((memory, index) => (
                  <div 
                    key={memory.memoryId} 
                    className={styles.photoFrame} 
                    style={getRopeStyle(index, line.length)}
                    onClick={() => setSelectedMemory(memory)}
                  >
                    <div className={styles.photoImageContainer}>
                      <img src={memory.imageUrl} alt={memory.name}/>
                      <div className={styles.photoPin}></div>
                    </div>
                    <div className={styles.photoCaption}>
                      <p>{memory.name}</p>
                      <span>{new Date(memory.createdAt).toLocaleDateString('ko-KR')}</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </>
        )}
      </div>

      {isAddModalOpen && (
        <AddMemoryModal
          classId={userClass.class_id}
          onClose={() => setIsAddModalOpen(false)}
          onMemoryAdded={handleMemoryAdded}
        />
      )}

      {selectedMemory && (
        <MemoryDetailModal
          memory={selectedMemory}
          currentUser={currentUser}
          isClosing={isDetailModalClosing}
          onClose={handleCloseDetailModal}
          onClosed={handleRealCloseDetailModal}
          onDelete={handleDeleteMemory}
        />
      )}
    </div>
  );
};

export default MemoriesPage;
