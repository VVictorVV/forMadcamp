'use client';

import React, { useState, ChangeEvent } from 'react';
import { supabase } from '../../../../lib/supabaseClient';
import styles from './AddMemoryModal.module.css';

interface AddMemoryModalProps {
  classId: number;
  onClose: () => void;
  onMemoryAdded: () => void;
}

const AddMemoryModal: React.FC<AddMemoryModalProps> = ({ classId, onClose, onMemoryAdded }) => {
  const [name, setName] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      
      // 미리보기 생성
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!name.trim() || !imageFile) {
      setError('이름과 이미지를 모두 입력해주세요.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('로그인이 필요합니다.');

      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('imageFile', imageFile);

      const response = await fetch(`/api/classes/${classId}/memories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '추억 업로드에 실패했습니다.');
      }

      // 성공 시 모달 닫기 및 목록 새로고침
      onMemoryAdded();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '추억 업로드에 실패했습니다.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // 미리보기 URL 정리
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    onClose();
  };

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>새 추억 추가</h2>
          <button onClick={handleClose} className={styles.closeButton}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="memoryName">추억 이름</label>
            <input
              type="text"
              id="memoryName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="추억의 이름을 입력하세요"
              maxLength={100}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="memoryImage">이미지 선택</label>
            <input
              type="file"
              id="memoryImage"
              accept="image/*"
              onChange={handleImageChange}
              required
            />
            {previewUrl && (
              <div className={styles.preview}>
                <img src={previewUrl} alt="미리보기" />
              </div>
            )}
          </div>

          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          <div className={styles.formActions}>
            <button 
              type="button" 
              onClick={handleClose}
              className={styles.cancelButton}
              disabled={loading}
            >
              취소
            </button>
            <button 
              type="submit" 
              className={styles.submitButton}
              disabled={loading || !name.trim() || !imageFile}
            >
              {loading ? '업로드 중...' : '추억 추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMemoryModal;
