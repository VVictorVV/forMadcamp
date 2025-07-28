"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import styles from "./Header.module.css";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import ProgressBar from "./ProgressBar";

const Header = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth(); // isLoggedIn 대신 user 객체 사용
  const [userClass, setUserClass] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserClass = async () => {
      // 로그인된 사용자가 없으면 아무 작업도 하지 않음
      if (!user) {
        setUserClass(null);
        return;
      }

      // PROFILES 테이블에서 현재 로그인된 사용자의 class_id를 가져옴
      const { data: profileData, error: profileError } = await supabase
        .from("PROFILES")
        .select("class_id")
        .eq("id", user.id) // 실제 사용자 ID로 조회
        .single();

      if (profileError || !profileData) {
        // console.error("Error fetching profile:", profileError?.message);
        return;
      }

      // class_id로 CAMP_CLASSES 테이블에서 분반 정보를 조회
      if (profileData.class_id) {
        const { data: classData, error: classError } = await supabase
          .from("CAMP_CLASSES")
          .select("class_num")
          .eq("class_id", profileData.class_id)
          .single();

        if (classData) {
          setUserClass(`${classData.class_num}분반`);
        }
      }
    };

    if (user) {
      fetchUserClass();
    } else {
      setUserClass(null);
    }
  }, [user]); // user 객체가 변경될 때마다 이 효과를 재실행

  const navLinks = [
    { href: "/project", label: "프로젝트" },
    { href: "/scrum", label: "스크럼" },
    { href: "/schedule", label: "일정" },
    { href: "/vote", label: "투표" },
    { href: "/memories", label: "추억" },
  ];

  return (
    <header className={styles.header}>
      <div className={styles.logoContainer}>
        <Link href="/" className={styles.logoLink}>
          <Image src="/logo.svg" alt="Madcamp Logo" width={30} height={30} />
        </Link>
        {user && userClass && <span className={styles.userClass}>{userClass}</span>}
      </div>
      
      {/* 진행도 바 - 중앙에 위치 */}
      <ProgressBar />
      
      <nav className={styles.navLinks}>
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={pathname === link.href ? styles.active : ""}
          >
            {link.label}
          </Link>
        ))}
        {user ? (
          <Link
            href="/browse"
            className={pathname === "/browse" ? styles.active : ""}
          >
            둘러보기
          </Link>
        ) : (
          <Link href="/auth" className={styles.loginButton}>
            로그인
          </Link>
        )}
      </nav>
    </header>
  );
};

export default Header; 