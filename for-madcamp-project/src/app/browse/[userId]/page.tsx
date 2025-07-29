"use client";

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabaseClient';
import styles from '../profile.module.css';
import projectStyles from '../../project/project.module.css';
import Image from 'next/image';
import Link from 'next/link';

interface Project {
  project_id: string;
  project_name: string;
  week_num: number;
  representative_image_uri: string | null;
}

interface Topic {
  topic_id: number;
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
  topics: Topic[];
}

const UserProfilePage = () => {
  const { user } = useAuth();
  const params = useParams();
  const viewedUserId = params.userId as string;

  const [viewedProfile, setViewedProfile] = useState<ProfileData | null>(null);
  const [viewedUserProjects, setViewedUserProjects] = useState<Project[]>([]);
  const [otherProfiles, setOtherProfiles] = useState<ProfileData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const isMyProfile = user?.id === viewedUserId;

  useEffect(() => {
    if (!viewedUserId) {
      setIsLoading(false);
      return;
    };

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('PROFILES')
          .select('*')
          .eq('id', viewedUserId)
          .single();
        
        if (profileError || !profileData) {
          throw new Error('Failed to load profile.');
        }

        const { data: classData } = await supabase.from('CAMP_CLASSES').select('class_num').eq('class_id', profileData.class_id || 0).single();
        const { data: topicsData } = await supabase.from('TOPICS').select('*').eq('creator_id', viewedUserId);

        const fullProfile: ProfileData = {
          ...profileData,
          class_num: classData?.class_num,
          topics: topicsData || []
        };
        setViewedProfile(fullProfile);

        const { data: projectsData, error: projectsError } = await supabase
          .from('PARTICIPATOR').select(`PROJECTS!inner(*)`).eq('profile_id', viewedUserId);
        if (projectsError) throw projectsError;
        if (projectsData) {
          const userProjects = (projectsData as any[]).map(p => p.PROJECTS).flat().filter(Boolean);
          setViewedUserProjects(userProjects);
        }

        const { data: othersData, error: othersError } = await supabase
          .from('PROFILES').select(`id, name, class_id, CAMP_CLASSES(class_num)`).neq('id', viewedUserId);
        if (othersError) throw othersError;
        if (othersData) {
          const flattenedProfiles = othersData.map((p: any) => ({...p, class_num: p.CAMP_CLASSES?.class_num}));
          setOtherProfiles(flattenedProfiles as ProfileData[]);
        }
      } catch (error) {
        console.error("Failed to fetch user data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [viewedUserId]);
  
  const { sameClassMates, otherClassMates } = useMemo(() => {
    if (!viewedProfile || !otherProfiles.length) {
      return { sameClassMates: [], otherClassMates: [] };
    }
    const sameClassMates = otherProfiles.filter(p => p.class_id && p.class_id === viewedProfile.class_id);
    const otherClassMates = otherProfiles.filter(p => !p.class_id || p.class_id !== viewedProfile.class_id);
    return { sameClassMates, otherClassMates };
  }, [viewedProfile, otherProfiles]);

  const getProjectByWeek = (weekNum: number): Project | undefined => {
    return viewedUserProjects.find(p => p.week_num === weekNum);
  };
  
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


  if (isLoading || !viewedProfile) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><p>Loading...</p></div>;
  }

  return (
    <div className={styles.container}>
       <header className={styles.profileHeader}>
        <div className={styles.headerContent}>
          <Image src="/logo.svg" alt="Profile Avatar" width={128} height={128} className={styles.avatar}/>
          <div className={styles.userInfo}>
            <h1 className={styles.name}>{viewedProfile.name}</h1>
          </div>
          {isMyProfile && (
            <div className={styles.headerActions}>
                {/* My profile page will handle the edit logic */}
                <Link href="/browse" className={styles.actionButton}>
                  <span>My Profile</span>
                </Link>
            </div>
          )}
        </div>
      </header>

      <main className={styles.mainWrapper}>
        <div className={styles.contentGrid}>
            <div className={styles.leftColumn}>
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Interest</h2>
                    {viewedProfile.topics && viewedProfile.topics.length > 0 ? (
                      <div className={styles.interestViewContainer}>
                        {viewedProfile.topics.map(topic => (
                          <div key={topic.topic_id} className={styles.interestViewItem}>
                            <h3 className={styles.interestTitle}>{topic.title}</h3>
                            <p className={styles.interestDescription}>{topic.description}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p>등록된 관심사가 없습니다.</p>
                    )}
                </section>
            </div>
            <aside className={styles.sidebar}>
                <div className={styles.sidebarItem}>
                    <div className={styles.sidebarIcon}>🏫</div>
                    <span className={styles.sidebarLabel}>
                        {viewedProfile.class_num ? `${viewedProfile.class_num}분반` : '분반 정보 없음'}
                    </span>
                </div>
                <div className={styles.sidebarItem}>
                    <div className={`${styles.sidebarIcon} ${!viewedProfile.instagram_uri ? styles.iconInactive : ''}`}>
                        <Image src="/instagram.svg" alt="Instagram" width={18} height={18} />
                    </div>
                    {viewedProfile.instagram_uri ? (
                        <a href={viewedProfile.instagram_uri} target="_blank" rel="noopener noreferrer" className={styles.sidebarLabel} style={{textDecoration:'none', color: '#006D94'}}>
                            Instagram
                        </a>
                    ) : (
                        <span className={styles.sidebarLabel} style={{color: '#9ca3af'}}>없음</span>
                    )}
                </div>
                <div className={styles.sidebarItem}>
                    <div className={styles.sidebarIcon}>🎓</div>
                    <span className={styles.sidebarLabel}>{viewedProfile.school || '학교 정보 없음'}</span>
                </div>
            </aside>
        </div>

        <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Projects</h2>
            <div className={styles.projectsGrid}>
                {[1, 2, 3, 4].map(weekNum => renderProjectCard(weekNum))}
            </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Others</h2>
          <div className={styles.othersSection}>
              <div className={styles.profilesGrid}>
                {sameClassMates.map(p => (
                  <Link href={`/browse/${p.id}`} key={p.id} className={styles.profileLink}>
                    <div className={styles.profileItem}>
                        <Image src="/logo.svg" alt={`${p.name} profile`} width={80} height={80} className={styles.profileImage}/>
                        <span className={styles.profileName}>{p.name}</span>
                    </div>
                  </Link>
                ))}
                {otherClassMates.map(p => (
                  <Link href={`/browse/${p.id}`} key={p.id} className={styles.profileLink}>
                    <div className={styles.profileItem}>
                        <Image src="/logo.svg" alt={`${p.name} profile`} width={80} height={80} className={styles.profileImage}/>
                        <span className={styles.profileName}>{p.name}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
        </section>
      </main>
    </div>
  );
};

export default UserProfilePage; 