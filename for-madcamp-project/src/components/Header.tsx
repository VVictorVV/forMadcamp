import Link from "next/link";
import Image from "next/image";
import styles from "./Header.module.css";

const Header = () => {
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
        <Link href="#">회사 소개</Link>
        <Link href="#">공지사항</Link>
        <Link href="#">고객센터</Link>
        <Link href="#">자주 묻는 질문</Link>
        <Link href="#">토스인증서</Link>
        <Link href="#">채용</Link>
      </nav>
    </header>
  );
};

export default Header; 