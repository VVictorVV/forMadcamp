"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import styles from './profile.module.css';
import Link from 'next/link';

const ProfilePage = () => {
  const { isLoggedIn, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/'); // 로그아웃 후 홈으로 이동
  };

  // 로그인하지 않은 사용자는 접근을 차단합니다.
  if (!isLoggedIn) {
    return (
      <main className={styles.container}>
        <h1>접근 권한 없음</h1>
        <p>이 페이지를 보려면 로그인이 필요합니다.</p>
        <Link href="/auth">로그인 페이지로 이동</Link>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>프로필</h1>
      <div className={styles.profileInfo}>
        <p>프로필 페이지입니다. 이곳에 사용자 정보가 표시됩니다.</p>
        {/* 추후 실제 데이터로 변경될 가상 사용자 정보 */}
        <p><strong>이름:</strong> 가상 사용자</p>
        <p><strong>이메일:</strong> user@example.com</p>
      </div>
      <button onClick={handleLogout} className={styles.logoutButton}>
        로그아웃
      </button>
    </main>
  );
};

export default ProfilePage; 