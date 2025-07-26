"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./auth.module.css";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className={styles.container}>
      <div className={styles.formPanel}>
        <div className={styles.formContainer}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <h1 className={styles.logo}>Madcamp</h1>
          </Link>
          <p className={styles.subtitle}>
            A New Way to Experience Madcamp
          </p>
          <form className={styles.form}>
            <input type="email" placeholder="이메일" className={styles.input} required />
            {!isLogin && (
              <input type="text" placeholder="이름" className={styles.input} required />
            )}
            <input type="password" placeholder="비밀번호" className={styles.input} required />
            {!isLogin && (
               <input type="password" placeholder="비밀번호 확인" className={styles.input} required />
            )}
            <button type="submit" className={styles.button}>
              {isLogin ? "로그인" : "회원가입"}
            </button>
          </form>
          <div className={styles.toggle}>
            {isLogin ? "계정이 없으신가요?" : "이미 계정이 있으신가요?"}
            <button onClick={() => setIsLogin(!isLogin)} className={styles.toggleButton}>
              {isLogin ? "회원가입" : "로그인"}
            </button>
          </div>
        </div>
      </div>
      <div className={styles.graphicPanel}>
         <div className={styles.graphicContent}>
            <h1 className={styles.logo}>Madcamp</h1>
            <p>몰입캠프 경험을 혁신하는 새로운 방법</p>
         </div>
      </div>
    </div>
  );
};

export default AuthPage; 