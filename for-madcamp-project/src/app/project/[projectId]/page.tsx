'use client';

import React, { useState, useEffect, useCallback, ChangeEvent, useRef, useLayoutEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabaseClient';
import styles from './projectDetail.module.css';
import { type User } from '@supabase/supabase-js';
import ReactMarkdown from 'react-markdown';
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

// --- Data Interfaces ---
interface Project {
  project_id: number;
  project_name: string;
  planning: string | null;
  description: string | null;
  representative_image_uri: string | null;
}

interface Participator {
    profile_id: string;
    role: string;
}

const ProjectDetailPage = () => {
  const params = useParams();
  const projectId = params.projectId as string;
  
  const [project, setProject] = useState<Project | null>(null);
  const [participators, setParticipators] = useState<Participator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [user, setUser] = useState<User | null>(null);
  const [isParticipant, setIsParticipant] = useState(false);

  const [isEditMode, setIsEditMode] = useState(false);
  const [openLightbox, setOpenLightbox] = useState(false);
  const [editedProject, setEditedProject] = useState<Partial<Project>>({});
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const titleRef = useRef<HTMLDivElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null); // Changed from bannerWrapperRef
  const [clipPathStyle, setClipPathStyle] = useState({});

  useLayoutEffect(() => {
    const generateClipPath = () => {
      if (!titleRef.current || !bannerRef.current) return;
  
      const W = bannerRef.current.offsetWidth;
      const H = bannerRef.current.offsetHeight;
  
      const titleW = titleRef.current.offsetWidth;
      const titleH = titleRef.current.offsetHeight;
  
      const r = 20; // 전체 모서리 둥글기
  
      if (W === 0 || H === 0) return;
  
      // ✅ 탭 바탕은 이미지 위로 흰색이 올라오도록 clip-path를 반대로 생성
      const path = [
        `M 0 ${r}`,                          // 왼쪽 아래쪽에서 시작
        `A ${r} ${r} 0 0 1 ${r} 0`,          // 왼쪽 위 둥글게
        `H ${titleW}`,                       // 제목 칸 가로 길이만큼 직선
        `Q ${titleW} 0 ${titleW} ${titleH}`, // 제목 칸만큼 아래로 파임
        `H ${W - r}`,                        // 오른쪽으로 이동
        `A ${r} ${r} 0 0 1 ${W} ${r}`,       // 오른쪽 위 둥글게
        `V ${H - r}`,                        // 아래쪽으로
        `A ${r} ${r} 0 0 1 ${W - r} ${H}`,   // 오른쪽 아래 둥글게
        `H ${r}`,                            // 왼쪽으로
        `A ${r} ${r} 0 0 1 0 ${H - r}`,      // 왼쪽 아래 둥글게
        `Z`
      ].join(' ');
  
      setClipPathStyle({
        clipPath: `path('${path}')`,
        WebkitClipPath: `path('${path}')`
      });
    };
  
    generateClipPath();
    window.addEventListener('resize', generateClipPath);
    return () => window.removeEventListener('resize', generateClipPath);
  }, [project, isEditMode]);
  
  
  

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    const file = event.target.files[0];
    setNewImageFile(file);
    
    const maxFileSize = 10 * 1024 * 1024;
    if (file.size > maxFileSize) {
        alert(`File size cannot exceed 10MB.`);
        return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return alert('You must be logged in to upload an image.');

    const previewUrl = URL.createObjectURL(file);
    setEditedProject(prev => ({ 
        ...prev, 
        representative_image_uri: previewUrl 
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    let imageUrl = editedProject.representative_image_uri || project?.representative_image_uri;
    
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Authentication required.');

        if (newImageFile) {
            const formData = new FormData();
            formData.append('file', newImageFile);
            
            const uploadResponse = await fetch('/api/projects/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}` },
                body: formData,
            });

            if (!uploadResponse.ok) {
                const errorData = await uploadResponse.json();
                throw new Error(errorData.error || 'Image upload failed.');
            }
            const { url } = await uploadResponse.json();
            imageUrl = url;
        }

        const updateData = {
            project_name: editedProject.project_name,
            planning: editedProject.planning,
            description: editedProject.description,
            representative_image_uri: imageUrl,
        };

        const updateResponse = await fetch(`/api/projects/${projectId}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}` 
            },
            body: JSON.stringify(updateData),
        });

        if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            throw new Error(errorData.error || 'Failed to update project details.');
        }
        
        await fetchProjectData();
        setIsEditMode(false);
        setNewImageFile(null);

    } catch (err: any) {
        setError(err.message);
        console.error(err);
    } finally {
        setIsSaving(false);
    }
  };
  
  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedProject(prev => ({ ...prev, [name]: value }));
  };

  const handleEditToggle = () => {
    if (isEditMode) {
      setEditedProject(project!);
    }
    setIsEditMode(!isEditMode);
  };

  const fetchProjectData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    
    try {
        const { data: projectData, error: projectError } = await supabase
            .from('PROJECTS')
            .select('*')
            .eq('project_id', projectId)
            .single();
    
        if (projectError) throw new Error('Failed to fetch project details.');
        setProject(projectData);
        setEditedProject(projectData);
    
        const { data: participatorData, error: participatorError } = await supabase
            .from('PARTICIPATOR')
            .select('profile_id, role')
            .eq('project_id', projectId);
    
        if (participatorError) throw new Error('Failed to fetch project members.');
        setParticipators(participatorData);
    
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        if (session?.user && participatorData) {
            const isMember = participatorData.some(p => p.profile_id === session.user.id);
            setIsParticipant(isMember);
        }
    
    } catch (err: any) {
        setError(err.message);
        console.error(err);
    } finally {
        setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  if (loading) {
      return <div className={styles.pageContainer}><p>Loading project...</p></div>;
  }

  if (error) {
      return <div className={styles.pageContainer}><p className={styles.errorText}>{error}</p></div>;
  }

  if (!project) {
      return <div className={styles.pageContainer}><p>Project not found.</p></div>;
  }

  return (
    <div className={styles.pageContainer}>
    <input 
      type="file" 
      id="imageUpload" 
      style={{ display: 'none' }} 
      onChange={handleImageUpload} 
      accept="image/*"
    />
    <div className={styles.bannerArea}>
      {/* The title is positioned absolutely relative to bannerArea */}
      <div className={styles.titleHeader} ref={titleRef}>
        {isEditMode ? (
          <input
            type="text"
            name="project_name"
            value={editedProject.project_name || ''}
            onChange={handleInputChange}
            className={styles.titleInput}
            placeholder="Project Title"
          />
        ) : (
          <div className={styles.titleInput} style={{ borderBottom: 'none' }}>
            {project?.project_name}
          </div>
        )}
      </div>

      {/* ✅ background-image → <img> 로 변경 */}
      <div 
        ref={bannerRef}
        className={styles.banner}
        style={clipPathStyle}   // ✅ clip-path 스타일만 유지
      >
        {/* ✅ 이미지 태그로 변경 */}
        { (editedProject.representative_image_uri || project?.representative_image_uri) && (
          <img
            src={editedProject.representative_image_uri 
                ? editedProject.representative_image_uri
                : (project?.representative_image_uri ?? '')}
            alt="banner"
            className={styles.bannerImage}
            onClick={() => {
              if (isEditMode) {
                document.getElementById('imageUpload')?.click();
              } else if (project?.representative_image_uri) {
                setOpenLightbox(true);
              }
            }}
          />
        )}

        {/* Default banner text and upload button now live inside the clipped banner */}
        {isEditMode && (
          <label htmlFor="imageUpload" className={styles.uploadButton}>+</label>
        )}
        {!project?.representative_image_uri && !editedProject.representative_image_uri && (
          <div className={styles.defaultBanner}>
            <span>{isEditMode ? "Select an image to upload" : "No representative image."}</span>
          </div>
        )}
      </div>
    </div>
    
    <Lightbox
        open={openLightbox}
        close={() => setOpenLightbox(false)}
        slides={project?.representative_image_uri ? [{ src: project.representative_image_uri }] : []}
    />

    <div className={styles.content}>
      <div className={styles.mainControls}>
        {isParticipant && !isEditMode && (
                      <button onClick={handleEditToggle} className={styles.editButton}>
                          Edit
                      </button>
        )}
      </div>

              <section>
                  <h3 className={styles.sectionTitle}>Planning</h3>
                  {isEditMode ? (
      <textarea
          name="planning"
          value={editedProject.planning || ''}
          onChange={handleInputChange}
          className={styles.textarea}
                          placeholder="Enter project planning details here..."
                      />
                  ) : (
                      <div className={styles.markdownDisplay}>
                          {project.planning ? (
                              <ReactMarkdown>{project.planning}</ReactMarkdown>
                          ) : (
                              <p>No planning content yet.</p>
                          )}
                      </div>
                  )}
              </section>

              <section>
                  <h3 className={styles.sectionTitle}>Description</h3>
      {isEditMode ? (
              <textarea
                  name="description"
                  value={editedProject.description || ''}
                  onChange={handleInputChange}
                          className={styles.textarea}
                          placeholder="Enter project description here (Markdown supported)..."
              />
      ) : (
          <div className={styles.markdownDisplay}>
                          {project.description ? (
                              <ReactMarkdown>{project.description}</ReactMarkdown>
                          ) : (
                              <p>No description provided.</p>
                          )}
          </div>
      )}
              </section>

      {isEditMode && (
          <div className={styles.buttonGroup}>
                      <button onClick={handleEditToggle} className={styles.cancelButton} disabled={isSaving}>
                          Cancel
                      </button>
                      <button onClick={handleSave} className={styles.saveButton} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save'}
              </button>
          </div>
      )}
    </div>
  </div>

  );
};

export default ProjectDetailPage; 