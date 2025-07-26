"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./auth.module.css";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";

const AuthPage = () => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [classNum, setClassNum] = useState(''); // 분반 선택 상태
  const [availableClasses, setAvailableClasses] = useState<{ class_num: number }[]>([]); // 분반 목록 상태
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  // 컴포넌트 마운트 시 분반 목록을 가져옵니다.
  useEffect(() => {
    const fetchClasses = async () => {
      const { data, error } = await supabase
        .from('CAMP_CLASSES')
        .select('class_num')
        .eq('season_id', 1)
        .order('class_num', { ascending: true });
      
      if (error) {
        console.error('Failed to fetch classes:', error);
      } else if (data) {
        setAvailableClasses(data);
        if (data.length > 0) {
          setClassNum(data[0].class_num.toString()); // 기본값 설정
        }
      }
    };
    if (!isLoginView) { // 회원가입 뷰일 때만 호출
      fetchClasses();
    }
  }, [isLoginView]);

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (isLoginView) {
      // 로그인 로직 (기존과 동일)
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else router.push('/');
    } else {
      // 회원가입 로직 (API 호출 방식으로 변경)
      try {
        const response = await fetch('/api/users/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name, class_num: parseInt(classNum) }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'An unknown error occurred.');
        }
        setSuccessMessage('회원가입이 완료되었습니다! 입력하신 이메일을 확인하여 계정 인증을 완료해주세요.');
        setIsLoginView(true);
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

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
          {successMessage && <p className={styles.success}>{successMessage}</p>}
          <form onSubmit={handleAuthAction} className={styles.form}>
            <input type="email" placeholder="이메일" className={styles.input} required value={email} onChange={(e) => setEmail(e.target.value)} />
            {!isLoginView && (
              <>
                <input type="text" placeholder="이름" className={styles.input} required value={name} onChange={(e) => setName(e.target.value)} />
                <select className={styles.input} value={classNum} onChange={(e) => setClassNum(e.target.value)} required>
                  {availableClasses.length === 0 ? (
                    <option disabled>분반을 불러오는 중...</option>
                  ) : (
                    availableClasses.map(c => (
                      <option key={c.class_num} value={c.class_num}>{c.class_num}분반</option>
                    ))
                  )}
                </select>
              </>
            )}
            <input type="password" placeholder="비밀번호" className={styles.input} required value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="submit" className={styles.button}>
              {isLoginView ? "로그인" : "회원가입"}
            </button>
            {error && <p className={styles.error}>{error}</p>}
          </form>
          <div className={styles.toggle}>
            {isLoginView ? "계정이 없으신가요?" : "이미 계정이 있으신가요?"}
            <button onClick={() => { setIsLoginView(!isLoginView); setError(null); setSuccessMessage(null); }} className={styles.toggleButton}>
              {isLoginView ? "회원가입" : "로그인"}
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