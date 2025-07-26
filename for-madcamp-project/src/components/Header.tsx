"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import styles from "./Header.module.css";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const Header = () => {
  const pathname = usePathname();
  const { isLoggedIn, logout } = useAuth();
  const [userClass, setUserClass] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserClass = async () => {
      console.log("Attempting to fetch user data from 'USERS' table...");
      const { data: userData, error: userError } = await supabase
        .from("USERS") // 테이블 이름을 "USERS"로 수정
        .select("class_id")
        .limit(1)
        .single();

      console.log("User data fetched:", { userData, userError });

      if (userError) {
        console.error("Error fetching user:", userError.message);
        return;
      }

      if (userData && userData.class_id) {
        console.log(`Found class_id: ${userData.class_id}. Fetching class data...`);
        const { data: classData, error: classError } = await supabase
          .from("CAMP_CLASSES") // 테이블 이름을 "CAMP_CLASSES"로 수정
          .select("class_num")
          .eq("class_id", userData.class_id) // "id"를 "class_id"로 수정
          .single();

        console.log("Class data fetched:", { classData, classError });

        if (classError) {
          console.error("Error fetching class number:", classError.message);
        } else if (classData) {
          console.log(`Found class_num: ${classData.class_num}. Setting user class.`);
          setUserClass(`${classData.class_num}분반`);
        } else {
          console.log("Class data not found for the given class_id.");
        }
      } else {
        console.log("User data found, but no class_id was present or user data was null.");
      }
    };

    if (isLoggedIn) {
      fetchUserClass();
    } else {
      setUserClass(null); // 로그아웃 시 분반 정보 초기화
    }
  }, [isLoggedIn]);

  const navLinks = [
    { href: "/project", label: "프로젝트" },
    { href: "/scrum", label: "스크럼" },
    { href: "/schedule", label: "일정" },
    { href: "/vote", label: "투표" },
    { href: "/memories", label: "추억" },
    { href: "/members", label: "구성원" },
  ];

  return (
    <header className={styles.header}>
      <div className={styles.logoContainer}>
        {
          <Image
            src="/logo.svg"
            alt="logo"
            width={30}
            height={25}
          />
        }
        {isLoggedIn && userClass && <span className={styles.userClass}>{userClass}</span>}
      </div>
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
        {isLoggedIn ? (
          <Link href="/profile" className={pathname === "/profile" ? styles.active : ""}>
            프로필
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