"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '../../../../lib/supabaseClient';
import styles from './class.module.css';
import Link from 'next/link';

interface Profile {
  id: string;
  name: string | null;
  profile_image_uri: string | null;
}

interface ProfileWithDetails extends Profile {
    award: string | null;
    award_comment: string | null; // Add new field
    music: string | null;
    comment: string | null;
}

const ClassPage = () => {
  const params = useParams();
  const classId = params.classId as string;
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<ProfileWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!classId) return;

    const fetchClassProfiles = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // 1. Find the class_id for the given class_num (assuming classId from URL is class_num)
        const { data: classData, error: classError } = await supabase
          .from('CAMP_CLASSES')
          .select('class_id')
          .eq('class_num', parseInt(classId, 10))
          .single();

        if (classError || !classData) {
          throw new Error(`분반 ${classId}을(를) 찾을 수 없습니다.`);
        }

        const { class_id } = classData;

        // 2. Fetch profiles for that class_id and sort them by name
        const { data: profilesData, error: profilesError } = await supabase
          .from('PROFILES')
          .select('id, name, profile_image_uri')
          .eq('class_id', class_id)
          .order('name', { ascending: true }); // Sort by name alphabetically

        if (profilesError) {
          throw new Error('프로필을 불러오는 데 실패했습니다.');
        }

        // 3. Filter out specific users (only Hong Gildong now)
        const excludedNames = ['홍길동'];
        const filteredProfiles = (profilesData || []).filter(
          profile => !excludedNames.includes(profile.name || '')
        );

        setProfiles(filteredProfiles);

      } catch (e: any) {
        setError(e.message);
        console.error("Error fetching class profiles:", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClassProfiles();
  }, [classId]);

  const handleProfileClick = async (profile: Profile) => {
    if (selectedProfile?.id === profile.id) {
        setSelectedProfile(null); // Toggle off if the same profile is clicked
        return;
    }
    
    setIsDetailLoading(true);
    // Add new field to initial state
    setSelectedProfile({ ...profile, award: null, award_comment: null, music: null, comment: null }); 

    try {
        const { data: extraData, error: extraError } = await supabase
            .from('extra')
            .select('award, award_comment, music, comment') // Select new field
            .eq('profile_id', profile.id)
            .single();
        
        if (extraError) {
            console.warn(`No extra details for ${profile.name}:`, extraError.message);
        }

        setSelectedProfile({
            ...profile,
            award: extraData?.award || '기록이 없습니다.',
            award_comment: extraData?.award_comment || null, // Set award_comment
            music: extraData?.music || null,
            comment: extraData?.comment || '코멘트가 없습니다.',
        });

    } catch (e: any) {
        console.error("Failed to fetch extra details:", e);
    } finally {
        setIsDetailLoading(false);
    }
  };

  const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return null;
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname === 'youtu.be') {
            return `https://www.youtube.com/embed/${urlObj.pathname.slice(1)}`;
        }
        if (urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtube.com') {
            const videoId = urlObj.searchParams.get('v');
            if (videoId) {
                return `https://www.youtube.com/embed/${videoId}`;
            }
        }
    } catch (error) {
        console.error("Invalid music URL:", error);
        return null;
    }
    return null;
  };

  if (isLoading) {
    return <div className={styles.container}><p>로딩 중...</p></div>;
  }

  if (error) {
    return <div className={styles.container}><p>오류: {error}</p></div>;
  }

  return (
    <div className={styles.pageWrapper}>
        <h1 className={styles.title}>{classId}분반 학생들</h1>
        <div className={styles.profilesGrid}>
            {profiles.length > 0 ? (
                profiles.map(p => (
                    <div onClick={() => handleProfileClick(p)} key={p.id} className={styles.profileLink}>
                        <div className={`${styles.profileItem} ${selectedProfile?.id === p.id ? styles.selected : ''}`}>
                            <Image 
                                src={p.profile_image_uri || "/default_person.svg"} 
                                alt={`${p.name || 'user'} profile`} 
                                width={100} 
                                height={100} 
                                className={styles.profileImage}
                            />
                            <span className={styles.profileName}>{p.name}</span>
                        </div>
                    </div>
                ))
            ) : (
                <p>표시할 학생이 없습니다.</p>
            )}
        </div>
        
        {selectedProfile && (
            <div className={styles.detailsContainer}>
                {isDetailLoading ? (
                    <p>상세 정보 로딩 중...</p>
                ) : (
                    <>
                        <h2 className={styles.detailsTitle}>✨ {selectedProfile.name} ✨</h2>
                        
                        <Image src="/trophy.webp" alt="Trophy" width={150} height={150} className={styles.trophyImage} />
                        <div className={styles.awardSection}>
                            <p className={styles.awardText}>{selectedProfile.award}</p>
                            {selectedProfile.award_comment && (
                                <p className={styles.awardCommentText}>{selectedProfile.award_comment}</p>
                            )}
                        </div>
                        
                        <div className={styles.musicSection}>
                            {selectedProfile.music && getYouTubeEmbedUrl(selectedProfile.music) ? (
                                <iframe
                                    className={styles.musicEmbed}
                                    src={getYouTubeEmbedUrl(selectedProfile.music)!}
                                    title="YouTube video player"
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                ></iframe>
                            ) : (
                                <Link href={`/class/${classId}/${selectedProfile.id}`} passHref>
                                    <div className={styles.addMusicButton}>
                                        추천 음악
                                    </div>
                                </Link>
                            )}
                        </div>
                    </>
                )}
            </div>
        )}
    </div>
  );
};

export default ClassPage; 