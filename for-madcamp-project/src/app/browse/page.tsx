"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import styles from './profile.module.css';
import Image from 'next/image';

// Placeholder data for experience cards
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

const ProfilePage = () => {
  const { user, logout } = useAuth(); // We might need logout later
  const router = useRouter();
  const [profile, setProfile] = useState<{ name: string; classNum: number | null }>({ name: '', classNum: null });

  useEffect(() => {
    if (!user) {
      router.push('/auth');
      return;
    }

    const fetchProfileData = async () => {
      const { data: userData, error: userError } = await supabase
        .from('PROFILES')
        .select('name, class_id')
        .eq('id', user.id)
        .single();
      if (userError || !userData) { 
        console.error('Error fetching profile:', userError);
        return; 
      }
      if (!userData.class_id) {
        setProfile({ name: userData.name, classNum: null });
        return;
      }
      const { data: classData, error: classError } = await supabase
        .from('CAMP_CLASSES')
        .select('class_num')
        .eq('class_id', userData.class_id)
        .single();
      if (classError) {
        setProfile({ name: userData.name, classNum: null });
      } else {
        setProfile({ name: userData.name, classNum: classData.class_num });
      }
    };

    fetchProfileData();
  }, [user, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/auth');
  };

  if (!user || !profile.name) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Profile Header */}
      <header className={styles.profileHeader}>
        <div className={styles.headerContent}>
          <Image src="/logo.svg" alt="Profile Avatar" width={128} height={128} className={styles.avatar}/>
          <div className={styles.userInfo}>
            <h1 className={styles.name}>{profile.name}</h1>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.actionButton} aria-label="Edit Profile">
              <Image
                src="/pencil.svg"
                alt="Edit"
                width={16}
                height={16}
                className={styles.iconInvert}
              />
              <span>Edit</span>
            </button>
            <button onClick={handleLogout} className={styles.actionButton} aria-label="Log Out">
              <Image
                src="/logout.svg"
                alt="Logout"
                width={16}
                height={16}
                className={styles.iconInvert}
              />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className={styles.mainWrapper}>
        <div className={styles.contentGrid}>
          {/* Left Column */}
          <div className={styles.leftColumn}>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Interest</h2>
              <p className={styles.aboutText}>
                React, Next.js와 같은 모던 웹 기술에 관심이 많습니다. 
                새로운 UI/UX 트렌드를 탐색하고, 사용자 친화적인 서비스를 만드는 것을 좋아합니다.
              </p>
            </section>
          </div>
          {/* Right Column (Sidebar) */}
          <aside className={styles.sidebar}>
            <div className={styles.sidebarItem}>
              <div className={styles.sidebarIcon}>🏫</div>
              <span className={styles.sidebarLabel}>
                {profile.classNum ? `${profile.classNum}분반` : '분반 정보 없음'}
              </span>
            </div>
            <div className={styles.sidebarItem}>
              <div className={styles.sidebarIcon}>
                <Image src="/instagram.svg" alt="Instagram" width={18} height={18} />
              </div>
              <a href="#" className={styles.sidebarLabel} style={{textDecoration:'none', color: '#006D94'}}>Instagram</a>
            </div>
             <div className={styles.sidebarItem}>
              <div className={styles.sidebarIcon}>🎓</div>
              <span className={styles.sidebarLabel}>KAIST</span>
            </div>
          </aside>
        </div>

        {/* Experience Section */}
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