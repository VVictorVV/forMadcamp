"use client";

import styles from './LoggedOutHome.module.css';

export default function LoggedOutHome() {
  return (
    <div className={styles.pageWrapper}>
      <div className={styles.background} />
      <main className={styles.mainContent}>
        <div className={`${styles.card} ${styles.introCard}`}>
            <h1 className={styles.title}>Madcamp</h1>
            <p className={styles.subtitle}>
              몰입캠프를 위한 협업과 성장의 공간.
              <br />
              프로젝트, 일정, 그리고 아이디어를 한 곳에서 관리하세요.
            </p>
        </div>
      </main>
    </div>
  );
} 