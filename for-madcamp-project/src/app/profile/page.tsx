"use client";

import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import styles from './profile.module.css';
import Link from 'next/link';
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

interface ProfileData {
  name: string | null;
  classNum: number | null;
}

const ProfilePage = () => {
  const { user, logout, isLoading } = useAuth(); // user 객체와 로딩 상태 사용
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData>({ name: null, classNum: null });

  useEffect(() => {
    const fetchProfileData = async () => {
      // 로그인된 사용자가 없으면 아무 작업도 하지 않음
      if (!user) return;

      // PROFILES 테이블에서 현재 로그인된 사용자의 정보를 가져옴
      const { data: profileData, error: profileError } = await supabase
        .from("PROFILES")
        .select("name, class_id")
        .eq("id", user.id) // 실제 사용자 ID로 조회
        .single();

      if (profileError || !profileData) {
        // console.error("Error fetching profile data:", profileError?.message);
        return;
      }
      
      let fetchedClassNum = null;
      if (profileData.class_id) {
        const { data: classData, error: classError } = await supabase
          .from("CAMP_CLASSES")
          .select("class_num")
          .eq("class_id", profileData.class_id)
          .single();

        if (!classError && classData) {
          fetchedClassNum = classData.class_num;
        }
      }

      setProfile({ name: profileData.name, classNum: fetchedClassNum });
    };

    fetchProfileData();
  }, [user]); // user 객체가 변경될 때마다 재실행

  const handleLogout = async () => {
    await logout();
    router.push('/'); // 로그아웃 후 홈으로 이동
  };

  // 인증 상태 확인 중일 때 로딩 UI를 표시
  if (isLoading) {
    return <main className={styles.container}><p>Loading...</p></main>
  }

  // 로그인하지 않은 사용자는 auth 페이지로 리디렉션 (useEffect로 처리 가능)
  if (!user) {
    router.push('/auth');
    return null; 
  }

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>프로필</h1>
      <div className={styles.profileInfo}>
        <p><strong>이름:</strong> {profile.name || '정보 없음'}</p>
        <p><strong>분반:</strong> {profile.classNum ? `${profile.classNum}분반` : '정보 없음'}</p>
      </div>
      <button onClick={handleLogout} className={styles.logoutButton}>
        로그아웃
      </button>
    </main>
  );
};

export default ProfilePage; 