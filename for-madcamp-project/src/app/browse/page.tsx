"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import styles from './profile.module.css';
import Image from 'next/image';

const experienceData = [
  {
    icon: '/file.svg',
    title: '1st Project',
    company: 'Week 1',
    date: '2024.07.01 - 2024.07.05',
  },
  {
    icon: '/window.svg',
    title: '2nd Project',
    company: 'Week 2',
    date: '2024.07.08 - 2024.07.12',
  },
  {
    icon: '/globe.svg',
    title: '3rd Project',
    company: 'Week 3',
    date: '2024.07.15 - 2024.07.19',
  },
];

interface Topic {
  topic_id?: number; // 새로 추가된 항목은 id가 없음
  title: string;
  description: string;
}

interface ProfileData {
  name: string;
  classNum: number | null;
  class_id: number | null;
  school: string | null;
  instagram_uri: string | null;
  topics: Topic[];
}

interface CampClass {
  class_id: number;
  class_num: number;
}

const ProfilePage = () => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Partial<ProfileData> | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<ProfileData> | null>(null);
  const [availableClasses, setAvailableClasses] = useState<CampClass[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/auth');
      return;
    }

    // Fetch available classes once on component mount
    const fetchClasses = async () => {
      const { data, error } = await supabase
        .from('CAMP_CLASSES')
        .select('class_id, class_num')
        .eq('season_id', 1)
        .order('class_num');
      if (error) {
        console.error("Failed to fetch classes:", error);
      } else {
        setAvailableClasses(data);
      }
    };
    fetchClasses();

    const fetchProfileData = async () => {
      setError(null);
      // 1. Fetch core profile data
      const { data: profileCore, error: profileError } = await supabase
        .from('PROFILES')
        .select('name, class_id, school, instagram_uri')
        .eq('id', user.id)
        .single();
      
      if (profileError || !profileCore) { 
        setError('프로필 정보를 불러오는 데 실패했습니다.');
        return; 
      }

      // 2. Fetch user's topics
      const { data: topicsData, error: topicsError } = await supabase
        .from('TOPICS')
        .select('topic_id, title, description')
        .eq('creator_id', user.id);

      if (topicsError) {
        setError('관심사 정보를 불러오는 데 실패했습니다.');
        // Don't return, show profile anyway
      }
      
      // 3. Fetch class number
      let classNum = null;
      if (profileCore.class_id) {
        const { data: classData, error: classError } = await supabase
          .from('CAMP_CLASSES')
          .select('class_num')
          .eq('class_id', profileCore.class_id)
          .single();
        if (!classError) {
          classNum = classData.class_num;
        }
      }
      
      const fullProfile: Partial<ProfileData> = {
        name: profileCore.name,
        school: profileCore.school,
        instagram_uri: profileCore.instagram_uri,
        classNum: classNum,
        class_id: profileCore.class_id,
        topics: topicsData || []
      };

      setProfile(fullProfile);
      setEditedProfile(fullProfile);
    };

    fetchProfileData();
  }, [user, router]);

  const handleEditToggle = () => {
    if (isEditing) {
      setEditedProfile(profile);
    }
    setIsEditing(!isEditing);
    setError(null);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
    const newTopic: Topic = { title: '', description: '' };
    const updatedTopics = [...(editedProfile.topics || []), newTopic];
    setEditedProfile({ ...editedProfile, topics: updatedTopics });
  };

  const handleDeleteTopic = (indexToDelete: number) => {
    if (!editedProfile || !editedProfile.topics) return;
    const updatedTopics = editedProfile.topics.filter((_, index) => index !== indexToDelete);
    setEditedProfile({ ...editedProfile, topics: updatedTopics });
  };

  const handleSave = async () => {
    if (!user || !editedProfile) return;
    setError(null);
    
    // 1. Update PROFILES table (same as before)
    const { name, school, instagram_uri, class_id } = editedProfile;
    const { error: profileUpdateError } = await supabase
      .from('PROFILES')
      .update({ name, school, instagram_uri, class_id: class_id ? parseInt(String(class_id), 10) : null })
      .eq('id', user.id);

    if (profileUpdateError) {
      setError('프로필 업데이트에 실패했습니다.');
      return;
    }

    // 2. Sync TOPICS table
    const originalTopicIds = profile?.topics?.map(t => t.topic_id).filter(Boolean) || [];
    const editedTopics = editedProfile.topics || [];
    const editedTopicIds = editedTopics.map(t => t.topic_id).filter(Boolean);

    const topicsToDelete = originalTopicIds.filter(id => !editedTopicIds.includes(id));
    const topicsToUpsert = editedTopics.map(t => ({
      ...t,
      creator_id: user.id
    }));
    
    const { error: deleteError } = await supabase.from('TOPICS').delete().in('topic_id', topicsToDelete);
    if (deleteError) {
      setError('기존 관심사 삭제에 실패했습니다.');
      return;
    }

    const { error: upsertError } = await supabase.from('TOPICS').upsert(topicsToUpsert);
    if (upsertError) {
      setError('관심사 저장에 실패했습니다.');
      return;
    }
    
    // Refresh data from DB after save
    const { data: newTopicsData } = await supabase.from('TOPICS').select('topic_id, title, description').eq('creator_id', user.id);
    const updatedProfile = { ...editedProfile, topics: newTopicsData || [] };
    
    setProfile(updatedProfile);
    setEditedProfile(updatedProfile);
    setIsEditing(false);
  };

  const handleLogout = async () => {
    await logout();
    router.push('/auth');
  };

  if (!profile || !editedProfile) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><p>Loading profile...</p></div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.profileHeader}>
        <div className={styles.headerContent}>
          <Image src="/logo.svg" alt="Profile Avatar" width={128} height={128} className={styles.avatar}/>
          <div className={styles.userInfo}>
            {isEditing ? (
              <input 
                type="text" 
                name="name"
                value={editedProfile.name || ''}
                onChange={handleInputChange}
                className={`${styles.name} ${styles.inputField}`}
              />
            ) : (
              <h1 className={styles.name}>{profile.name}</h1>
            )}
          </div>
          <div className={styles.headerActions}>
            {isEditing ? (
              <>
                <button onClick={handleSave} className={styles.actionButton}>
                  <Image src="/save.svg" alt="Save" width={16} height={16} />
                  <span>Save</span>
                </button>
                <button onClick={handleEditToggle} className={`${styles.actionButton} ${styles.cancelButton}`}>
                  <span>Cancel</span>
                </button>
              </>
            ) : (
              <>
                <button onClick={handleEditToggle} className={styles.actionButton} aria-label="Edit Profile">
                  <Image src="/pencil.svg" alt="Edit" width={16} height={16} />
                  <span>Edit</span>
                </button>
                <button onClick={handleLogout} className={styles.actionButton} aria-label="Log Out">
                  <Image src="/logout.svg" alt="Logout" width={16} height={16} />
                  <span>Logout</span>
                </button>
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
                  {editedProfile.topics && editedProfile.topics.map((topic, index) => (
                    <div key={topic.topic_id || `new-${index}`} className={styles.interestEditItem}>
                      <input
                        type="text"
                        placeholder="주제 (예: 웹 개발)"
                        value={topic.title}
                        onChange={(e) => handleTopicChange(index, 'title', e.target.value)}
                        className={styles.inputField}
                      />
                      <textarea
                        placeholder="설명 (예: React, Next.js에 관심 많음)"
                        value={topic.description}
                        onChange={(e) => handleTopicChange(index, 'description', e.target.value)}
                        className={styles.textareaField}
                        rows={3}
                      />
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
                ) : (
                  <p className={styles.aboutText}>등록된 관심사가 없습니다.</p>
                )
              )}
            </section>
          </div>
          <aside className={styles.sidebar}>
            <div className={styles.sidebarItem}>
              <div className={styles.sidebarIcon}>🏫</div>
              {isEditing ? (
                <select 
                  name="class_id"
                  value={editedProfile.class_id || ''}
                  onChange={handleInputChange}
                  className={styles.inputFieldSidebar}
                >
                  <option value="">분반 선택</option>
                  {availableClasses.map(c => (
                    <option key={c.class_id} value={c.class_id}>
                      {c.class_num}분반
                    </option>
                  ))}
                </select>
              ) : (
                <span className={styles.sidebarLabel}>
                  {profile.classNum ? `${profile.classNum}분반` : '분반 정보 없음'}
                </span>
              )}
            </div>
            <div className={styles.sidebarItem}>
              <div className={`${styles.sidebarIcon} ${!profile.instagram_uri && !isEditing ? styles.iconInactive : ''}`}>
                <Image
                  src="/instagram.svg"
                  alt="Instagram"
                  width={18}
                  height={18}
                />
              </div>
              {isEditing ? (
                <input 
                  type="url"
                  name="instagram_uri" // instagram_url -> instagram_uri
                  value={editedProfile.instagram_uri || ''}
                  onChange={handleInputChange}
                  placeholder="https://instagram.com/..."
                  className={styles.inputFieldSidebar}
                />
              ) : (
                profile.instagram_uri ? (
                  <a href={profile.instagram_uri} target="_blank" rel="noopener noreferrer" className={styles.sidebarLabel} style={{textDecoration:'none', color: '#006D94'}}>
                    Instagram
                  </a>
                ) : (
                  <span className={styles.sidebarLabel} style={{color: '#9ca3af'}}>없음</span>
                )
              )}
            </div>
             <div className={styles.sidebarItem}>
              <div className={styles.sidebarIcon}>🎓</div>
              {isEditing ? (
                 <input 
                  type="text" 
                  name="school"
                  value={editedProfile.school || ''}
                  onChange={handleInputChange}
                  className={styles.inputFieldSidebar}
                />
              ) : (
                <span className={styles.sidebarLabel}>{profile.school}</span>
              )}
            </div>
          </aside>
        </div>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Projects</h2>
          <div className={styles.experienceGrid}>
            {experienceData.map((exp, index) => (
              <div key={index} className={styles.experienceCard}>
                <div className={styles.expCardHeader}>
                  <div className={styles.expCardIcon}>
                    <Image src={exp.icon} alt="" width={24} height={24} />
                  </div>
                  <div>
                    <h3 className={styles.expCardTitle}>{exp.title}</h3>
                    <p className={styles.expCardCompany}>{exp.company}</p>
                  </div>
                </div>
                <span className={styles.expCardDate}>{exp.date}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default ProfilePage; 