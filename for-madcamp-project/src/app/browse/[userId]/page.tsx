"use client";

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabaseClient';
import styles from '../profile.module.css';
import projectStyles from '../../project/project.module.css';
import Image from 'next/image';
import Link from 'next/link';

// --- Interfaces (Add profile_image_uri and make topic_id optional) ---
interface Project {
  project_id: string;
  project_name: string;
  week_num: number;
  representative_image_uri: string | null;
}
interface Topic {
  topic_id?: number; // Make topic_id optional
  title: string;
  description: string;
}
interface ProfileData {
  id: string;
  name: string;
  class_id: number | null;
  class_num: number | null;
  school: string | null;
  instagram_uri: string | null;
  profile_image_uri: string | null; // Added
  topics: Topic[];
}
interface CampClass {
  class_id: number;
  class_num: number;
}

const UserProfilePage = () => {
  const { user, logout } = useAuth(); // Added logout
  const params = useParams();
  const router = useRouter(); // Added router
  const viewedUserId = params.userId as string;

  // --- State Management (from both files) ---
  const [profile, setProfile] = useState<Partial<ProfileData> | null>(null);
  const [editedProfile, setEditedProfile] = useState<Partial<ProfileData> | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [availableClasses, setAvailableClasses] = useState<CampClass[]>([]);
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [otherProfiles, setOtherProfiles] = useState<ProfileData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const isMyProfile = user?.id === viewedUserId;

  // --- Data Fetching (Consolidated) ---
  useEffect(() => {
    if (!viewedUserId) {
        setIsLoading(false);
        return;
    };
    
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data: profileData, error: profileError } = await supabase.from('PROFILES').select('*').eq('id', viewedUserId).single();
        if (profileError || !profileData) throw new Error('Failed to load profile.');

        const { data: classData } = await supabase.from('CAMP_CLASSES').select('class_num').eq('class_id', profileData.class_id || 0).single();
        const { data: topicsData } = await supabase.from('TOPICS').select('*').eq('creator_id', viewedUserId);
        
        const fullProfile = {
            ...profileData,
            class_num: classData?.class_num,
            topics: topicsData || []
        };
        setProfile(fullProfile);
        setEditedProfile(fullProfile);

        const { data: projectsData, error: projectsError } = await supabase.from('PARTICIPATOR').select(`PROJECTS!inner(*)`).eq('profile_id', viewedUserId);
        if (projectsError) throw projectsError;
        if (projectsData) {
            const userProjects = (projectsData as any[]).map(p => p.PROJECTS).flat().filter(Boolean);
            setMyProjects(userProjects);
        }

        const { data: othersData, error: othersError } = await supabase.from('PROFILES').select(`id, name, class_id, CAMP_CLASSES(class_num)`).neq('id', viewedUserId);
        if (othersError) throw othersError;
        if (othersData) {
            const flattenedProfiles = othersData.map((p: any) => ({...p, class_num: p.CAMP_CLASSES?.class_num}));
            setOtherProfiles(flattenedProfiles as ProfileData[]);
        }
        
        const { data: classesData, error: classesError } = await supabase.from('CAMP_CLASSES').select('*').order('class_num');
        if (classesError) throw classesError;
        if (classesData) setAvailableClasses(classesData);

      } catch (e: any) {
        setError(e.message || 'An unexpected error occurred.');
        console.error("Failed to fetch user data:", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [viewedUserId]);

  // --- Event Handlers (from browse/page.tsx) ---
  const handleEditToggle = () => {
    if (isEditing) setEditedProfile(profile);
    setIsEditing(!isEditing);
    setError(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) return;
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `public/${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage.from('profile-images').upload(filePath, file);
    if (uploadError) {
      setError(`이미지 업로드 실패: ${uploadError.message}`);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('profile-images').getPublicUrl(filePath);
    if (!publicUrl) {
      setError('이미지 URL을 가져오는 데 실패했습니다.');
      return;
    }

    const { error: dbError } = await supabase.from('PROFILES').update({ profile_image_uri: publicUrl }).eq('id', user.id);
    if (dbError) {
      setError('프로필 이미지 업데이트에 실패했습니다.');
    } else {
      setEditedProfile(prev => prev ? { ...prev, profile_image_uri: publicUrl } : { profile_image_uri: publicUrl });
      setProfile(prev => prev ? { ...prev, profile_image_uri: publicUrl } : { profile_image_uri: publicUrl });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      if (!editedProfile) return;
      const { name, value } = e.target;
      setEditedProfile({ ...editedProfile, [name]: value });
  };
  
  const handleTopicChange = (index: number, field: 'title' | 'description', value: string) => {
    if (!editedProfile || !editedProfile.topics) return;
    const updatedTopics = [...editedProfile.topics];
    updatedTopics[index] = { ...updatedTopics[index], [field]: value };
    setEditedProfile({ ...editedProfile, topics: updatedTopics });
  };

  const handleAddTopic = () => {
    if (!editedProfile) return;
    // Add topic_id: undefined to match the interface
    setEditedProfile({...editedProfile, topics: [...(editedProfile.topics || []), { topic_id: undefined, title: '', description: '' }]});
  };

  const handleDeleteTopic = async (indexToDelete: number) => {
    if (!editedProfile?.topics) return;
    const topicToDelete = editedProfile.topics[indexToDelete];
    const updatedTopics = editedProfile.topics.filter((_, i) => i !== indexToDelete);
    setEditedProfile({...editedProfile, topics: updatedTopics});
    if (topicToDelete.topic_id) {
        await supabase.from('TOPICS').delete().eq('topic_id', topicToDelete.topic_id);
    }
  };

  const handleSave = async () => {
    if (!user || !editedProfile) return;
    const { name, school, instagram_uri, class_id, topics } = editedProfile;
    const { error: profileUpdateError } = await supabase.from('PROFILES').update({ name, school, instagram_uri, class_id: class_id ? parseInt(String(class_id), 10) : null }).eq('id', user.id);

    if (profileUpdateError) {
      setError('Profile update failed.');
      return;
    }

    if (topics) {
        const topicsToUpsert = topics.map(t => ({...t, creator_id: user.id}));
        const { error: upsertError } = await supabase.from('TOPICS').upsert(topicsToUpsert);
        if (upsertError) {
            setError('Failed to save interests.');
            return;
        }
    }
    
    const { data: classData } = await supabase.from('CAMP_CLASSES').select('class_num').eq('class_id', class_id || 0).single();
    const updatedProfile = { ...editedProfile, class_num: classData?.class_num };

    setProfile(updatedProfile);
    setEditedProfile(updatedProfile);
    setIsEditing(false);
  };

  const handleLogout = async () => {
    await logout();
    router.push('/auth');
  };

  // --- Memos and Render Functions (from both files) ---
  const { sameClassMates, otherClassMates } = useMemo(() => {
    if (!profile || !otherProfiles.length) return { sameClassMates: [], otherClassMates: [] };
    return {
        sameClassMates: otherProfiles.filter(p => p.class_id && p.class_id === profile.class_id),
        otherClassMates: otherProfiles.filter(p => !p.class_id || p.class_id !== profile.class_id),
    };
  }, [profile, otherProfiles]);

  const getProjectByWeek = (weekNum: number): Project | undefined => myProjects.find(p => p.week_num === weekNum);
  
  const renderProjectCard = (weekNum: number) => {
    // This function can be simplified as it's the same as the one from the other file
    const project = getProjectByWeek(weekNum);
    if (project) {
        return ( <Link key={project.project_id} href={`/project/${project.project_id}`} className={styles.projectCard} style={{ backgroundImage: project.representative_image_uri ? `url(${project.representative_image_uri})` : 'none' }}> <div className={`${styles.projectCardContent} ${project.representative_image_uri && styles.projectCardOverlay}`}> <h3 className={project.representative_image_uri ? styles.projectCardTitle : styles.projectCardNoImageTitle}> {project.project_name} </h3> </div> </Link> );
    }
    return ( <div key={`empty-${weekNum}`} className={styles.projectCard}> <div className={styles.projectCardContent}> <h3 className={styles.projectCardEmptyTitle}>{weekNum}주차</h3> </div> </div> );
  };

  if (isLoading || !profile || !editedProfile) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;
  }

  // --- Main Render (Dynamic UI based on isMyProfile and isEditing) ---
  return (
    <div className={styles.container}>
      <header className={styles.profileHeader}>
        <div className={styles.headerContent}>
            <input type="file" id="avatarUpload" style={{ display: 'none' }} onChange={handleImageUpload} accept="image/*" disabled={!isEditing} />
            <label htmlFor="avatarUpload" className={`${styles.avatarWrapper} ${isEditing ? styles.editable : ''}`}>
              <Image src={editedProfile.profile_image_uri || profile.profile_image_uri || "/default_person.svg"} alt="Profile Avatar" width={128} height={128} className={styles.avatar}/>
            </label>
            <div className={styles.userInfo}>
              {isEditing ? (
                <input type="text" name="name" value={editedProfile.name || ''} onChange={handleInputChange} className={`${styles.name} ${styles.inputField}`}/>
              ) : (
                <h1 className={styles.name}>{profile.name}</h1>
              )}
            </div>
            <div className={styles.headerActions}>
              {isMyProfile && (isEditing ? (
                <>
                  <button onClick={handleSave} className={styles.actionButton}><Image src="/save.svg" alt="Save" width={16} height={16} /><span>Save</span></button>
                  <button onClick={handleEditToggle} className={`${styles.actionButton} ${styles.cancelButton}`}><span>Cancel</span></button>
                </>
              ) : (
                <>
                  <button onClick={handleEditToggle} className={styles.actionButton}><Image src="/pencil.svg" alt="Edit" width={16} height={16} /><span>Edit</span></button>
                  <button onClick={handleLogout} className={styles.actionButton}><Image src="/logout.svg" alt="Logout" width={16} height={16} /><span>Logout</span></button>
                </>
              ))}
            </div>
        </div>
        {error && <p className={styles.errorMessage}>{error}</p>}
      </header>
      
      <main className={styles.mainWrapper}>
        <div className={styles.contentGrid}>
            <div className={styles.leftColumn}>
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Interest</h2>
                    {isEditing ? (
                        <div className={styles.interestEditContainer}>
                          {editedProfile.topics?.map((topic, index) => ( <div key={topic.topic_id || `new-${index}`} className={styles.interestEditItem}> <input type="text" placeholder="주제" value={topic.title} onChange={(e) => handleTopicChange(index, 'title', e.target.value)} className={styles.inputField} /> <textarea placeholder="설명" value={topic.description} onChange={(e) => handleTopicChange(index, 'description', e.target.value)} className={styles.textareaField} rows={3}/> <button onClick={() => handleDeleteTopic(index)} className={styles.deleteButton}>삭제</button> </div> ))}
                          <button onClick={handleAddTopic} className={styles.addButton}>+ 관심사 추가</button>
                        </div>
                    ) : (
                        profile.topics && profile.topics.length > 0 ? (
                        <div className={styles.interestViewContainer}>
                            {profile.topics.map(topic => ( <div key={topic.topic_id} className={styles.interestViewItem}> <h3 className={styles.interestTitle}>{topic.title}</h3> <p className={styles.interestDescription}>{topic.description}</p> </div> ))}
                        </div>
                        ) : ( <p>등록된 관심사가 없습니다.</p> )
                    )}
                </section>
            </div>
            <aside className={styles.sidebar}>
                <div className={styles.sidebarItem}>
                    <div className={styles.sidebarIcon}>🏫</div>
                    {isEditing ? (
                        <select name="class_id" value={editedProfile.class_id || ''} onChange={handleInputChange} className={styles.inputFieldSidebar}>
                            <option value="">분반 선택</option>
                            {availableClasses.map(c => <option key={c.class_id} value={c.class_id}>{c.class_num}분반</option>)}
                        </select>
                    ) : (
                        <span className={styles.sidebarLabel}>{profile.class_num ? `${profile.class_num}분반` : '분반 정보 없음'}</span>
                    )}
                </div>
                <div className={styles.sidebarItem}>
                    <div className={`${styles.sidebarIcon} ${!profile.instagram_uri && !isEditing ? styles.iconInactive : ''}`}><Image src="/instagram.svg" alt="Instagram" width={18} height={18}/></div>
                    {isEditing ? (
                        <input type="url" name="instagram_uri" value={editedProfile.instagram_uri || ''} onChange={handleInputChange} placeholder="Instagram URL" className={styles.inputFieldSidebar}/>
                    ) : (
                        profile.instagram_uri ? <a href={profile.instagram_uri} target="_blank" rel="noopener noreferrer" className={styles.sidebarLabel} style={{textDecoration:'none', color: '#006D94'}}>Instagram</a> : <span className={styles.sidebarLabel} style={{color: '#9ca3af'}}>없음</span>
                    )}
                </div>
                <div className={styles.sidebarItem}>
                    <div className={styles.sidebarIcon}>🎓</div>
                    {isEditing ? (
                        <input type="text" name="school" value={editedProfile.school || ''} onChange={handleInputChange} className={styles.inputFieldSidebar}/>
                    ) : (
                        <span className={styles.sidebarLabel}>{profile.school || '학교 정보 없음'}</span>
                    )}
                </div>
            </aside>
        </div>

        <section className={styles.section}>
            <h2 className={styles.sectionTitle}>My Projects</h2>
            <div className={styles.projectsGrid}>
                {[1, 2, 3, 4].map(weekNum => renderProjectCard(weekNum))}
            </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Others</h2>
          <div className={styles.profilesGrid}>
            {sameClassMates.map(p => <Link href={`/browse/${p.id}`} key={p.id} className={styles.profileLink}><div className={styles.profileItem}><Image src={p.profile_image_uri || "/default_person.svg"} alt={`${p.name} profile`} width={80} height={80} className={styles.profileImage}/><span className={styles.profileName}>{p.name}</span></div></Link>)}
            {otherClassMates.map(p => <Link href={`/browse/${p.id}`} key={p.id} className={styles.profileLink}><div className={styles.profileItem}><Image src={p.profile_image_uri || "/default_person.svg"} alt={`${p.name} profile`} width={80} height={80} className={styles.profileImage}/><span className={styles.profileName}>{p.name}</span></div></Link>)}
          </div>
        </section>
      </main>
    </div>
  );
};

export default UserProfilePage; 