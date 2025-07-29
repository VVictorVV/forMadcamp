"use client";

import { useEffect } from 'react';
import styles from './DeleteConfirmModal.module.css';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  pollName: string;
  loading?: boolean;
}

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, pollName, loading = false }: DeleteConfirmModalProps) => {
  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // 모달 외부 클릭으로 닫기
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleBackdropClick}>
      <div className={styles.modalContainer}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>투표 삭제</h3>
          <button onClick={onClose} className={styles.closeButton}>
            ×
          </button>
        </div>
        
        <div className={styles.modalContent}>
          <div className={styles.warningIcon}>⚠️</div>
          <p className={styles.modalMessage}>
            <strong>"{pollName}"</strong> 투표를 삭제하시겠습니까?
          </p>
          <p className={styles.modalDescription}>
            이 작업은 되돌릴 수 없으며, 모든 투표 데이터가 영구적으로 삭제됩니다.
          </p>
        </div>
        
        <div className={styles.modalActions}>
          <button
            onClick={onClose}
            disabled={loading}
            className={styles.cancelButton}
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={styles.deleteButton}
          >
            {loading ? '삭제 중...' : '삭제하기'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal; 