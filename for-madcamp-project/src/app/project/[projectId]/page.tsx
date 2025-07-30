'use client';

import React, { useState, useEffect, useCallback, ChangeEvent, useRef, useLayoutEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabaseClient';
import styles from './projectDetail.module.css';
import { type User } from '@supabase/supabase-js';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import ScoopedCorner from '../../../components/ScoopedCorner';

// 데이터 구조 정의
interface Project {
  project_id: number;
  project_name: string;
  planning: string | null;
  description: string | null;
  representative_image_uri: string | null;
}

interface ParticipantProfile {
  id: string;
  name: string | null;
  profile_image_uri: string | null;
  role: string | null;
}

const ProjectDetailPage = () => {
  const params = useParams();
  const projectId = params.projectId as string;

  // 상태 변수
  const [project, setProject] = useState<Project | null>(null);
  const [participants, setParticipants] = useState<ParticipantProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedProject, setEditedProject] = useState<Partial<Project>>({});
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [openLightbox, setOpenLightbox] = useState(false);

  const titleRef = useRef<HTMLDivElement>(null);
  const [topRightCornerStyle, setTopRightCornerStyle] = useState({});

  useLayoutEffect(() => {
    const calculatePosition = () => {
      if (titleRef.current) {
        const titleWidth = titleRef.current.offsetWidth;
        setTopRightCornerStyle({ left: `${titleWidth}px` });
      }
    };

    calculatePosition();
    
    const observer = new ResizeObserver(calculatePosition);
    if (titleRef.current) {
      observer.observe(titleRef.current);
    }
    
    return () => observer.disconnect();
  }, [project, isEditMode]); // Recalculate when title text or edit mode changes

  const handleEditToggle = () => {
    if (isEditMode) {
      // Cancel edits
      setEditedProject(project!);
      setNewImageFile(null);
    }
    setIsEditMode(!isEditMode);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedProject(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    const file = event.target.files[0];
    setNewImageFile(file);

    // Show a preview of the new image
    const previewUrl = URL.createObjectURL(file);
    setEditedProject(prev => ({
      ...prev,
      representative_image_uri: previewUrl
    }));
  };
  
  const handleSave = async () => {
    if (!project) return;

    // A simple check to see if anything has changed
    const hasTextChanged = 
        editedProject.project_name !== project.project_name ||
        editedProject.planning !== project.planning ||
        editedProject.description !== project.description;

    if (!newImageFile && !hasTextChanged) {
        setIsEditMode(false);
        return; // Nothing to save
    }

    let imageUrl = project.representative_image_uri;

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Authentication required to save.');

        // 1. Upload new image if it exists
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

        // 2. Update project details
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
            throw new Error(errorData.error || 'Failed to update project.');
        }

        // 3. Refresh data and exit edit mode
        await fetchProjectData();
        setIsEditMode(false);
        setNewImageFile(null);

    } catch (err: any) {
        setError(err.message);
        console.error("Save failed:", err);
    }
  };

  // 데이터 가져오기 로직
  const fetchProjectData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);

    try {
      // Step 1: Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUser(session?.user ?? null);

      // Step 2: Fetch project details
      const { data: projectData, error: projectError } = await supabase
        .from('PROJECTS')
        .select('*')
        .eq('project_id', projectId)
        .single();

      if (projectError) {
        throw new Error(`프로젝트 정보를 불러오는 데 실패했습니다: ${projectError.message}`);
      }
      setProject(projectData);
      setEditedProject(projectData);

      // Step 3: Fetch participants and their profiles
      const { data: participatorData, error: participatorError } = await supabase
        .from('PARTICIPATOR')
        .select('profile_id, role')
        .eq('project_id', projectId);

      if (participatorError) throw new Error('프로젝트 참여자 정보를 불러오는 데 실패했습니다.');

      let fetchedParticipants: ParticipantProfile[] = [];
      if (participatorData && participatorData.length > 0) {
        const profileIds = participatorData.map(p => p.profile_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from('PROFILES')
          .select('id, name, profile_image_uri')
          .in('id', profileIds);

        if (profilesError) throw new Error('참여자 프로필 정보를 불러오는 데 실패했습니다.');

        fetchedParticipants = participatorData.map(p => {
          const profile = profilesData?.find(pd => pd.id === p.profile_id);
          return {
            id: p.profile_id,
            name: profile?.name || 'Unknown User',
            profile_image_uri: profile?.profile_image_uri,
            role: p.role,
          };
        });
        setParticipants(fetchedParticipants);
      }
      
      // Step 4: Determine if the current user is a participant (owner)
      console.log('--- Debugging Project Ownership ---');
      console.log('Current User ID:', session?.user?.id);
      console.log('Fetched Participants:', fetchedParticipants);

      if (session?.user && fetchedParticipants.length > 0) {
        const isUserOwner = fetchedParticipants.some(p => p.id === session.user.id);
        console.log('Is Current User The Owner?', isUserOwner);
        setIsOwner(isUserOwner);
      } else {
        console.log('No session or no participants, setting owner to false.');
        setIsOwner(false);
      }
      console.log('------------------------------------');


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

  // This useEffect is no longer needed as the logic is consolidated in fetchProjectData
  /*
  useEffect(() => {
    if (currentUser && participants.length > 0) {
      const isUserParticipant = participants.some(p => p.id === currentUser.id);
      setIsOwner(isUserParticipant);
    } else {
      setIsOwner(false);
    }
  }, [currentUser, participants]);
  */

  if (loading) {
    return <div className={styles.pageContainer}><p>프로젝트를 불러오는 중...</p></div>;
  }

  if (error) {
    return <div className={styles.pageContainer}><p className={styles.errorText}>{error}</p></div>;
  }

  if (!project) {
    return <div className={styles.pageContainer}><p>프로젝트를 찾을 수 없습니다.</p></div>;
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
            <div 
                className={styles.bannerContent}
                style={{
                  backgroundImage: (editedProject.representative_image_uri || project?.representative_image_uri)
                    ? `url(${editedProject.representative_image_uri || project.representative_image_uri})`
                    : 'none',
                }}
                onClick={() => {
                    if (isEditMode) {
                        document.getElementById('imageUpload')?.click();
                    } else if (project?.representative_image_uri) {
                        setOpenLightbox(true);
                    }
                }}
            >
                {isEditMode && (
                    <label htmlFor="imageUpload" className={styles.uploadButton}>+</label>
                )}
                {!(editedProject.representative_image_uri || project?.representative_image_uri) && (
                     <div className={styles.defaultBanner}>
                        <span>{isEditMode ? "Select an image to upload" : "No representative image."}</span>
                     </div>
                )}
            </div>
            {/* The titleHeader is now placed after the banner content and corner element */}
            <div className={styles.cornerElement}>
                <ScoopedCorner 
                    size={20} 
                    color="#FFFFFF" // Explicitly set to opaque white
                    // corner prop is removed to use default 'bottom-right'
                />
            </div>
            {/* Add another corner element */}
            <div className={styles.cornerElementTopRight} style={topRightCornerStyle}>
                <ScoopedCorner 
                    size={20} 
                    color="#FFFFFF"
                    // corner prop is removed to use default 'bottom-right'
                />
            </div>
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
                    <div className={styles.titleText}>
                        {project.project_name}
                    </div>
                )}
            </div>
        </div>

        <div className={styles.contentBody}>
            <div className={styles.mainContent}>
                <div className={styles.contentSection}>
                    <h2>Planning</h2>
                    <div className={styles.markdownContent}>
                        {isEditMode ? (
                            <textarea
                                name="planning"
                                value={editedProject.planning || ''}
                                onChange={handleInputChange}
                                className={styles.textarea}
                                placeholder="Project Planning (Markdown supported)"
                            />
                        ) : (
                            <ReactMarkdown>{project.planning || '작성된 계획이 없습니다.'}</ReactMarkdown>
                        )}
                    </div>
                </div>
                
                <div className={styles.contentSection}>
                    <h2>Description</h2>
                    <div className={styles.markdownContent}>
                        {isEditMode ? (
                            <textarea
                                name="description"
                                value={editedProject.description || ''}
                                onChange={handleInputChange}
                                className={styles.textarea}
                                placeholder="Project Description (Markdown supported)"
                            />
                        ) : (
                            <ReactMarkdown>{project.description || '작성된 설명이 없습니다.'}</ReactMarkdown>
                        )}
                    </div>
                </div>
            </div>
            <aside className={styles.sidebar}>
                {isOwner && (
                    <button 
                        onClick={isEditMode ? handleSave : handleEditToggle}
                        className={isEditMode ? styles.saveButton : styles.editButton}
                    >
                        {isEditMode ? 'Save' : 'Edit'}
                    </button>
                )}
                <h3>프로젝트 멤버</h3>
                {participants.length > 0 ? (
                    <div className={styles.participantsList}>
                        {participants.map(p => (
                            <Link key={p.id} href={`/browse/${p.id}`} className={styles.participantCard}>
                                <img 
                                    src={p.profile_image_uri || '/default_person.svg'} 
                                    alt={p.name || 'participant'}
                                    className={styles.participantAvatar}
                                />
                                <span className={styles.participantName}>{p.name}</span>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <p>참여 멤버 정보 없음</p>
                )}
            </aside>
        </div>
        
        <Lightbox
            open={openLightbox}
            close={() => setOpenLightbox(false)}
            slides={(editedProject.representative_image_uri || project.representative_image_uri) ? [{ src: (editedProject.representative_image_uri || project.representative_image_uri) as string }] : []}
        />
    </div>
  );
};

export default ProjectDetailPage; 