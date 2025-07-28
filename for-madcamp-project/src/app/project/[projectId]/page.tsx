'use client';

import React, { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabaseClient';
import styles from './projectDetail.module.css';
import { type User } from '@supabase/supabase-js';

import ReactMarkdown from 'react-markdown';
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

// 프로젝트 데이터 타입을 정의합니다.
interface Project {
  project_id: number;
  project_name: string;
  planning: string | null;
  description: string | null;
  representative_image_uri: string | null;
}

const ProjectDetailPage = () => {
  const params = useParams();
  const projectId = params.projectId as string;
  
  const [project, setProject] = useState<Project | null>(null);
  const [editedProject, setEditedProject] = useState<Partial<Project>>({});
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [user, setUser] = useState<User | null>(null);
  const [isParticipant, setIsParticipant] = useState(false);
  const [openLightbox, setOpenLightbox] = useState(false);

  const fetchProject = useCallback(async (currentUserId?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('PROJECTS').select('*').eq('project_id', projectId).single();
      if (error) throw error;
      
      setProject(data);
      setEditedProject(data); // 수정용 데이터 초기화

      if (currentUserId) {
        const { data: participation } = await supabase.from('PARTICIPATOR').select('profile_id').eq('project_id', projectId).eq('profile_id', currentUserId).maybeSingle();
        setIsParticipant(!!participation);
      }
    } catch (error) {
      console.error('Error fetching project:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);
  
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      await fetchProject(session?.user?.id);
    };
    getSession();
  }, [fetchProject]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedProject(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!isParticipant) return;
    setIsSaving(true);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert('로그인이 필요합니다.');
      setIsSaving(false);
      return;
    }

    // 변경된 필드만 추출
    const changedFields: Partial<Project> = {};
    if (project?.project_name !== editedProject.project_name) {
        changedFields.project_name = editedProject.project_name;
    }
    if (project?.planning !== editedProject.planning) {
        changedFields.planning = editedProject.planning;
    }
    if (project?.description !== editedProject.description) {
        changedFields.description = editedProject.description;
    }

    if (Object.keys(changedFields).length === 0) {
        setIsEditMode(false);
        setIsSaving(false);
        return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify(changedFields),
      });

      if (!response.ok) throw new Error((await response.json()).error || 'Failed to save');
      
      const updatedProjectData = await response.json();
      setProject(updatedProjectData);
      setEditedProject(updatedProjectData);
      setIsEditMode(false);

    } catch (error) {
      console.error('Save error:', error);
      alert(error instanceof Error ? `저장 실패: ${error.message}`: '알 수 없는 오류 발생');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedProject(project!);
    setIsEditMode(false);
  };
  
  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !isParticipant) return;
    const file = event.target.files[0];

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return alert('로그인이 필요합니다.');

    const formData = new FormData();
    formData.append('file', file);
    const uploadResponse = await fetch('/api/projects/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: formData,
    });
    if(!uploadResponse.ok) return alert('이미지 업로드 실패');
    const { url } = await uploadResponse.json();

    const updateResponse = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ representative_image_uri: url }),
    });
     if(!updateResponse.ok) return alert('배너 이미지 업데이트 실패');
    
     const updatedProjectData = await updateResponse.json();
     setProject(updatedProjectData);
     setEditedProject(updatedProjectData);
  };

  if (loading) return <div className={styles.pageContainer}><p>Loading...</p></div>;
  if (!project) return <div className={styles.pageContainer}><p>프로젝트를 찾을 수 없습니다.</p></div>;
  
  return (
    <div className={styles.pageContainer}>
        <input type="file" id="bannerUpload" style={{ display: 'none' }} onChange={handleImageUpload} accept="image/*" disabled={!isParticipant}/>
      <div className={styles.bannerArea}>
        <div className={styles.titleHeader}>
            <input
                type="text"
                name="project_name"
                value={editedProject.project_name || ''}
                onChange={handleInputChange}
                className={styles.titleInput}
                readOnly={!isEditMode}
                placeholder="프로젝트 제목"
            />
        </div>

        <div className={styles.banner} onClick={() => editedProject.representative_image_uri && setOpenLightbox(true)}>
            {editedProject.representative_image_uri ? (
                <img src={editedProject.representative_image_uri} alt="Project Banner" className={styles.bannerImage}/>
            ) : (
                <div className={styles.defaultBanner}></div>
            )}
            {isParticipant && (
                <label htmlFor="bannerUpload" className={styles.uploadButton}>+</label>
            )}
        </div>
      </div>
        
      <Lightbox
          open={openLightbox}
          close={() => setOpenLightbox(false)}
          slides={editedProject.representative_image_uri ? [{ src: editedProject.representative_image_uri }] : []}
      />

      <div className={styles.content}>
        <div className={styles.mainControls}>
          {isParticipant && !isEditMode && (
              <button onClick={() => setIsEditMode(true)} className={styles.editButton}>Edit</button>
          )}
        </div>

        <h3 className={styles.sectionTitle}>기획</h3>
        <textarea
            name="planning"
            value={editedProject.planning || ''}
            onChange={handleInputChange}
            className={styles.textarea}
            readOnly={!isEditMode}
            placeholder="프로젝트 기획 내용을 입력하세요."
        />

        <h3 className={styles.sectionTitle}>설명</h3>
        {isEditMode ? (
            <div className={styles.markdownEditorContainer}>
                <textarea
                    name="description"
                    value={editedProject.description || ''}
                    onChange={handleInputChange}
                    className={`${styles.textarea} ${styles.markdownEditor}`}
                    placeholder="프로젝트 설명 내용을 마크다운으로 입력하세요."
                />
                <div className={`${styles.markdownDisplay} ${styles.markdownPreview}`}>
                    <ReactMarkdown>{editedProject.description || '미리보기'}</ReactMarkdown>
                </div>
            </div>
        ) : (
            <div className={styles.markdownDisplay}>
                <ReactMarkdown>{project.description || '작성된 설명이 없습니다.'}</ReactMarkdown>
            </div>
        )}

        {isEditMode && (
            <div className={styles.buttonGroup}>
                <button onClick={handleCancel} className={`${styles.actionButton} ${styles.cancelButton}`}>Cancel</button>
                <button onClick={handleSave} disabled={isSaving} className={`${styles.actionButton} ${styles.saveButton}`}>
                    {isSaving ? 'Saving...' : 'Save'}
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default ProjectDetailPage; 