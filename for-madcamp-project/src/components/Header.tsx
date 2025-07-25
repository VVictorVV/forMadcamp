"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import styles from "./Header.module.css";

const Header = () => {
  const pathname = usePathname();

  const navLinks = [
    { href: "/project", label: "프로젝트" },
    { href: "/scrum", label: "스크럼" },
    { href: "/schedule", label: "일정" },
    { href: "/vote", label: "투표" },
    { href: "/members", label: "구성원" },
    { href: "/memories", label: "추억" },
  ];

  return (
    <header className={styles.header}>
      <div className={styles.logoContainer}>
        {/* 
          로고 이미지가 'public' 폴더에 'logo.svg'로 저장되었다고 가정합니다.
          <Image
            src="/logo.svg"
            alt="logo"
            width={80}
            height={25}
          /> 
        */}
        <Link href="/" className={styles.logo}>
          Madcamp
        </Link>
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
      </nav>
    </header>
  );
};

export default Header; 