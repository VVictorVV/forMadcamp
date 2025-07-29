"use client";

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import styles from './profile.module.css';
import projectStyles from '../project/project.module.css';
import Image from 'next/image';
import Link from 'next/link';

// --- Interfaces ---
interface Project {
  project_id: string;
  project_name: string;
  week_num: number;
  representative_image_uri: string | null;
}
interface Topic {
  topic_id?: number;
  title: string;
  description: string;
}
interface ProfileData {
  id: string;
  name: string;
  class_id: number | null;
  school: string | null;
  instagram_uri: string | null;
  topics: Topic[];
  class_num?: number | null;
}
interface CampClass {
  class_id: number;
  class_num: number;
}

const BrowsePage = () => {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<Partial<ProfileData> | null>(null);
  const [editedProfile, setEditedProfile] = useState<Partial<ProfileData> | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [availableClasses, setAvailableClasses] = useState<CampClass[]>([]);
  
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [otherProfiles, setOtherProfiles] = useState<ProfileData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/auth');
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Step 1: Fetch core profile data first.
        const { data: profileData, error: profileError } = await supabase
          .from('PROFILES')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profileError || !profileData) {
          throw new Error(`Profile fetch failed: ${profileError?.message}`);
        }

        // Step 2: Fetch related data separately.
        const { data: classData } = await supabase.from('CAMP_CLASSES').select('class_num').eq('class_id', profileData.class_id || 0).single();
        const { data: topicsData } = await supabase.from('TOPICS').select('*').eq('creator_id', user.id);

        const fullProfile: ProfileData = {
          ...profileData,
          class_num: classData?.class_num,
          topics: topicsData || []
        };
        setProfile(fullProfile);
        setEditedProfile(fullProfile);

        // --- The rest of the data fetching remains the same ---
        const { data: projectsData, error: projectsError } = await supabase
          .from('PARTICIPATOR').select(`PROJECTS!inner(*)`).eq('profile_id', user.id);
        if (projectsError) throw projectsError;
        if (projectsData) {
          const userProjects = projectsData.map((item: any) => item.PROJECTS).filter(Boolean);
          setMyProjects(userProjects);
        }

        const { data: othersData, error: othersError } = await supabase
          .from('PROFILES').select(`*, CAMP_CLASSES(class_num)`).neq('id', user.id);
        if (othersError) throw othersError;
        if (othersData) {
          setOtherProfiles(othersData.map(p => ({...p, class_num: (p as any).CAMP_CLASSES?.class_num})));
        }
        
        const { data: classesData, error: classesError } = await supabase.from('CAMP_CLASSES').select('*').order('class_num');
        if (classesError) throw classesError;
        if (classesData) setAvailableClasses(classesData);

      } catch (e: any) {
        setError(e.message || 'An unexpected error occurred.');
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, router]);
  
  const handleEditToggle = () => {
    if (isEditing) setEditedProfile(profile);
    setIsEditing(!isEditing);
    setError(null);
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
    setEditedProfile({...editedProfile, topics: [...(editedProfile.topics || []), { title: '', description: '' }]});
  };
  const handleDeleteTopic = async (indexToDelete: number) => {
    if (!editedProfile?.topics) return;
    const topicToDelete = editedProfile.topics[indexToDelete];
    const updatedTopics = editedProfile.topics.filter((_, i) => i !== indexToDelete);
    setEditedProfile({...editedProfile, topics: updatedTopics});

    // If topic has an id, it exists in the DB, so we can delete it immediately
    if (topicToDelete.topic_id) {
        await supabase.from('TOPICS').delete().eq('topic_id', topicToDelete.topic_id);
    }
  };
  const handleSave = async () => {
    if (!user || !editedProfile) return;
    
    const { name, school, instagram_uri, class_id, topics } = editedProfile;
    const { error: profileUpdateError } = await supabase
      .from('PROFILES')
      .update({ name, school, instagram_uri, class_id: class_id ? parseInt(String(class_id), 10) : null })
      .eq('id', user.id);

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
  
  const { sameClassMates, otherClassMates } = useMemo(() => {
      if (!profile || !otherProfiles.length) return { sameClassMates: [], otherClassMates: [] };
      return {
          sameClassMates: otherProfiles.filter(p => p.class_id && p.class_id === profile.class_id),
          otherClassMates: otherProfiles.filter(p => !p.class_id || p.class_id !== profile.class_id),
      };
  }, [profile, otherProfiles]);

  const getProjectByWeek = (weekNum: number): Project | undefined => myProjects.find(p => p.week_num === weekNum);

  const renderProjectCard = (weekNum: number) => {
    const project = getProjectByWeek(weekNum);
    if (project) {
        return (
            <Link 
                key={project.project_id} 
                href={`/project/${project.project_id}`} 
                className={styles.projectCard}
                style={{ backgroundImage: project.representative_image_uri ? `url(${project.representative_image_uri})` : 'none' }}
            >
                <div className={`${styles.projectCardContent} ${project.representative_image_uri && styles.projectCardOverlay}`}>
                    <h3 className={project.representative_image_uri ? styles.projectCardTitle : styles.projectCardNoImageTitle}>
                        {project.project_name}
                    </h3>
                </div>
            </Link>
        );
    }
    return (
        <div key={`empty-${weekNum}`} className={styles.projectCard}>
            <div className={styles.projectCardContent}>
                <h3 className={styles.projectCardEmptyTitle}>{weekNum}주차</h3>
            </div>
        </div>
    );
  };

  const handleLogout = async () => {
    await logout();
    router.push('/auth');
  };
  
  if (isLoading || !profile || !editedProfile) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>
  }

  return (
    <div className={styles.container}>
      <header className={styles.profileHeader}>
        <div className={styles.headerContent}>
            <Image src="/logo.svg" alt="Profile Avatar" width={128} height={128} className={styles.avatar}/>
            <div className={styles.userInfo}>
            {isEditing ? (
              <input type="text" name="name" value={editedProfile.name || ''} onChange={handleInputChange} className={`${styles.name} ${styles.inputField}`}/>
            ) : (
              <h1 className={styles.name}>{profile.name}</h1>
            )}
            </div>
            <div className={styles.headerActions}>
            {isEditing ? (
              <>
                <button onClick={handleSave} className={styles.actionButton}><Image src="/save.svg" alt="Save" width={16} height={16} /><span>Save</span></button>
                <button onClick={handleEditToggle} className={`${styles.actionButton} ${styles.cancelButton}`}><span>Cancel</span></button>
              </>
            ) : (
              <>
                <button onClick={handleEditToggle} className={styles.actionButton}><Image src="/pencil.svg" alt="Edit" width={16} height={16} /><span>Edit</span></button>
                <button onClick={handleLogout} className={styles.actionButton}><Image src="/logout.svg" alt="Logout" width={16} height={16} /><span>Logout</span></button>
              </>
            )}
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
                        {editedProfile.topics?.map((topic, index) => (
                            <div key={topic.topic_id || `new-${index}`} className={styles.interestEditItem}>
                            <input type="text" placeholder="주제" value={topic.title} onChange={(e) => handleTopicChange(index, 'title', e.target.value)} className={styles.inputField} />
                            <textarea placeholder="설명" value={topic.description} onChange={(e) => handleTopicChange(index, 'description', e.target.value)} className={styles.textareaField} rows={3}/>
                            <button onClick={() => handleDeleteTopic(index)} className={styles.deleteButton}>삭제</button>
                            </div>
                        ))}
                        <button onClick={handleAddTopic} className={styles.addButton}>+ 관심사 추가</button>
                        </div>
                    ) : (
                        profile.topics && profile.topics.length > 0 ? (
                        <div className={styles.interestViewContainer}>
                            {profile.topics.map(topic => (
                            <div key={topic.topic_id} className={styles.interestViewItem}>
                                <h3 className={styles.interestTitle}>{topic.title}</h3>
                                <p className={styles.interestDescription}>{topic.description}</p>
                            </div>
                            ))}
                        </div>
                        ) : ( <p>등록된 관심사가 없습니다.</p> )
                    )}
                </section>
                {/* "My Projects" section is moved out from here */}
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
            {sameClassMates.map(p => <Link href={`/browse/${p.id}`} key={p.id} className={styles.profileLink}><div className={styles.profileItem}><Image src="/logo.svg" alt={`${p.name} profile`} width={80} height={80} className={styles.profileImage}/><span className={styles.profileName}>{p.name}</span></div></Link>)}
            {otherClassMates.map(p => <Link href={`/browse/${p.id}`} key={p.id} className={styles.profileLink}><div className={styles.profileItem}><Image src="/logo.svg" alt={`${p.name} profile`} width={80} height={80} className={styles.profileImage}/><span className={styles.profileName}>{p.name}</span></div></Link>)}
          </div>
        </section>
      </main>
    </div>
  );
};

export default BrowsePage; 