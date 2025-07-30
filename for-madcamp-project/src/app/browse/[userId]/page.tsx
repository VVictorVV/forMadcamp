"use client";

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabaseClient';
import styles from '../profile.module.css';
import projectStyles from '../../project/project.module.css';
import Image from 'next/image';
import Link from 'next/link';
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import InterestRating from './components/InterestRating';
import ratingStyles from './components/InterestRating.module.css';
import InterestDetailModal from './components/InterestDetailModal';


// --- Interfaces ---
interface Project {
  project_id: string;
  project_name: string;
  week_num: number;
  representative_image_uri: string | null;
}

export interface Interest {
  level: number;
  PROFILES: {
    id: string;
    name: string | null;
    profile_image_uri: string | null;
  } | null;
}

interface Topic {
  topic_id?: number; // Make topic_id optional
  title: string;
  description: string;
  interests: Interest[];
  TOPIC_INTERESTS?: Interest[]; // accommodate the raw data from DB
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
interface OtherParticipant {
    profile_id: string;
    name: string | null;
    profile_image_uri: string | null;
    class_id: number | null;
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
  const [otherParticipants, setOtherParticipants] = useState<OtherParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openLightbox, setOpenLightbox] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  
  const isMyProfile = user?.id === viewedUserId;

  const handleAvatarClick = () => {
    if (isEditing) {
      document.getElementById('avatarUpload')?.click();
    } else if (profile?.profile_image_uri) {
      setOpenLightbox(true);
    }
  };

  // Force scroll to top on page load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // --- Data Fetching (Consolidated) ---
  const fetchProfileData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: profileData, error: profileError } = await supabase.from('PROFILES').select('*').eq('id', viewedUserId).single();
      if (profileError || !profileData) throw new Error('Failed to load profile.');

      const { data: classData } = await supabase.from('CAMP_CLASSES').select('class_num').eq('class_id', profileData.class_id || 0).single();
      
      // Fetch topics and their related interests, now including the user profile data
      const { data: topicsData, error: topicsError } = await supabase
        .from('TOPICS')
        .select(`
          *,
          TOPIC_INTERESTS (
            level,
            PROFILES (
              id,
              name,
              profile_image_uri
            )
          )
        `)
        .eq('creator_id', viewedUserId);

      if (topicsError) throw new Error('Failed to load topics.');

      // Map the `TOPIC_INTERESTS` array from the database to `interests` to match the component's expectation.
      const processedTopics = (topicsData || []).map(topic => ({
        ...topic,
        interests: topic.TOPIC_INTERESTS || [],
      }));
      
      const fullProfile = {
          ...profileData,
          class_num: classData?.class_num,
          topics: processedTopics
      };
      setProfile(fullProfile);
      setEditedProfile(fullProfile);

      const { data: projectsData, error: projectsError } = await supabase.from('PARTICIPATOR').select(`PROJECTS!inner(*)`).eq('profile_id', viewedUserId);
      if (projectsError) throw projectsError;
      if (projectsData) {
          const userProjects = (projectsData as any[]).map(p => p.PROJECTS).flat().filter(Boolean);
          setMyProjects(userProjects);
      }

      const { data: profiles, error: profilesError } = await supabase.from('PROFILES').select(`id, name, profile_image_uri, class_id, CAMP_CLASSES(class_num)`).neq('id', viewedUserId);
      if (profilesError) throw profilesError;
      
      const participants = profiles.map(p => ({
          profile_id: p.id,
          name: p.name,
          profile_image_uri: p.profile_image_uri,
          class_id: p.class_id,
      }));

      // Sort participants by name (Korean alphabetical order)
      participants.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'));

      setOtherParticipants(participants);

      const { data: classesData, error: classesError } = await supabase.from('CAMP_CLASSES').select('*').order('class_num');
      if (classesError) throw classesError;
      if (classesData) setAvailableClasses(classesData);

    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred.');
      console.error("Failed to fetch user data:", e);
    } finally {
      setIsLoading(false);
    }
  }, [viewedUserId]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  // --- Event Handlers (from browse/page.tsx) ---
  const handleEditToggle = () => {
    if (isEditing) setEditedProfile(profile);
    setIsEditing(!isEditing);
    setError(null);
  };

  const handleRatingChange = async (topicId: number, newLevel: number) => {
    if (!user) {
        setError("로그인이 필요합니다.");
        return;
    }

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("세션 정보를 가져올 수 없습니다.");

        const response = await fetch(`/api/topics/${topicId}/interests`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ level: newLevel }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to update interest.");
        }

        // Optimistically update the UI
        const updateInterests = (topics: Topic[]) => {
            return topics.map(t => {
                if (t.topic_id === topicId) {
                    const existingInterestIndex = t.interests.findIndex(i => i.PROFILES?.id === user.id);
                    const newInterests = [...t.interests];

                    if (newLevel === 0) { // Remove interest
                        if (existingInterestIndex > -1) {
                            newInterests.splice(existingInterestIndex, 1);
                        }
                    } else { // Add or update interest
                        if (existingInterestIndex > -1) {
                            newInterests[existingInterestIndex] = { ...newInterests[existingInterestIndex], level: newLevel };
                        } else {
                            newInterests.push({ PROFILES: { id: user.id, name: user.name, profile_image_uri: user.profile_image_uri }, level: newLevel });
                        }
                    }
                    return { ...t, interests: newInterests };
                }
                return t;
            });
        };
        
        setProfile(prev => prev ? { ...prev, topics: updateInterests(prev.topics || []) } : null);
        setEditedProfile(prev => prev ? { ...prev, topics: updateInterests(prev.topics || []) } : null);

    } catch (err: any) {
        setError(err.message);
        console.error("Failed to change rating:", err);
    }
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
    setEditedProfile({...editedProfile, topics: [...(editedProfile.topics || []), { topic_id: undefined, title: '', description: '', interests: [] }]});
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
      console.error('Profile Update Error:', profileUpdateError);
      return;
    }

    let finalTopics = topics || [];

    if (topics && topics.length > 0) {
        // When mapping topics for upsert, conditionally include the topic_id.
        // If topic_id is falsy (e.g., undefined, null), it's a new topic, and we should omit the key
        // so that the database can auto-generate the ID.
        const topicsToUpsert = topics.map(({ interests, TOPIC_INTERESTS, topic_id, ...rest }) => {
            const topicData = {
                ...rest,
                creator_id: user.id,
            };
            if (topic_id) {
                return { ...topicData, topic_id }; // For existing topics
            }
            return topicData; // For new topics
        });
        
        // 2. Upsert the cleaned data and use .select() to get the generated/updated IDs back.
        const { data: upsertedTopics, error: upsertError } = await supabase
            .from('TOPICS')
            .upsert(topicsToUpsert)
            .select();

        if (upsertError) {
            // Provide more detailed error logging
            const errorDetails = `Code: ${upsertError.code}, Message: ${upsertError.message}`;
            setError(`Failed to save interests. Details: ${errorDetails}`);
            console.error('Upsert Error:', JSON.stringify(upsertError, null, 2));
            return;
        }

        // 3. Match upserted topics with original topics to re-attach the `interests` array for UI state.
        finalTopics = upsertedTopics.map(upsertedTopic => {
            const originalTopic = topics.find(t => t.topic_id === upsertedTopic.topic_id) || 
                                  topics.find(t => !t.topic_id && t.title === upsertedTopic.title && t.description === upsertedTopic.description);
            return {
                ...upsertedTopic,
                interests: originalTopic ? originalTopic.interests : []
            };
        });
    }
    
    const { data: classData } = await supabase.from('CAMP_CLASSES').select('class_num').eq('class_id', class_id || 0).single();
    
    const updatedProfile = { 
      ...editedProfile, 
      topics: finalTopics, 
      class_num: classData?.class_num 
    };

    setProfile(updatedProfile);
    setEditedProfile(updatedProfile);
    setIsEditing(false);
    setError(null); // Clear previous errors on successful save
  };

  const handleLogout = async () => {
    await logout();
    router.push('/auth');
  };

  // --- Memos and Render Functions (from both files) ---
  const { sameClassMates, otherClassMates } = useMemo(() => {
    if (!profile || !otherParticipants.length) return { sameClassMates: [], otherClassMates: [] };
    return {
        sameClassMates: otherParticipants.filter(p => p.class_id && p.class_id === profile.class_id),
        otherClassMates: otherParticipants.filter(p => !p.class_id || p.class_id !== profile.class_id),
    };
  }, [profile, otherParticipants]);

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
            <div
                className={`${styles.avatarWrapper} ${isEditing ? styles.editable : (profile.profile_image_uri ? styles.clickable : '')}`}
                onClick={handleAvatarClick}
            >
              <Image src={editedProfile.profile_image_uri || profile.profile_image_uri || "/default_person.svg"} alt="Profile Avatar" width={128} height={128} className={styles.avatar}/>
            </div>
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
                            {profile.topics.map(topic => {
                                const myInterest = topic.interests.find(i => i.PROFILES?.id === user?.id);
                                const myInterestLevel = myInterest ? myInterest.level : 0;
                                const isOwnerOfTopic = user?.id === viewedUserId;

                                return (
                                    <div key={topic.topic_id} className={styles.interestViewItem}>
                                        <div className={styles.interestContent}>
                                            <h3 className={styles.interestTitle}>{topic.title}</h3>
                                            <p className={styles.interestDescription}>{topic.description}</p>
                                        </div>
                                        <div className={styles.interestActions}>
                                            {topic.topic_id && (
                                                <InterestRating
                                                    topicId={topic.topic_id}
                                                    currentRating={myInterestLevel}
                                                    isOwner={isOwnerOfTopic}
                                                    onRatingChange={handleRatingChange}
                                                />
                                            )}
                                            {topic.interests.length > 0 && (
                                                <button onClick={() => setSelectedTopic(topic)} className={styles.viewAllButton}>
                                                    ...
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
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
            {sameClassMates.map(p => <Link href={`/browse/${p.profile_id}`} key={p.profile_id} className={styles.profileLink}><div className={styles.profileItem}><Image src={p.profile_image_uri || "/default_person.svg"} alt={`${p.name} profile`} width={80} height={80} className={styles.profileImage}/><span className={styles.profileName}>{p.name}</span></div></Link>)}
            {otherClassMates.map(p => <Link href={`/browse/${p.profile_id}`} key={p.profile_id} className={styles.profileLink}><div className={styles.profileItem}><Image src={p.profile_image_uri || "/default_person.svg"} alt={`${p.name} profile`} width={80} height={80} className={styles.profileImage}/><span className={styles.profileName}>{p.name}</span></div></Link>)}
          </div>
        </section>
      </main>

      {profile?.profile_image_uri && (
        <Lightbox
            open={openLightbox}
            close={() => setOpenLightbox(false)}
            slides={[{ src: profile.profile_image_uri }]}
        />
      )}

      {selectedTopic && (
        <InterestDetailModal
          topicTitle={selectedTopic.title}
          interests={selectedTopic.interests}
          onClose={() => setSelectedTopic(null)}
        />
      )}
    </div>
  );
};

export default UserProfilePage; 