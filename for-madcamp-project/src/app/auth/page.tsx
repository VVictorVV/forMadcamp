"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from './auth.module.css'; // auth.module.css를 그대로 사용
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";

interface CampClass {
  class_id: number;
  class_num: number;
}

const AuthPage = () => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [school, setSchool] = useState('');
  const [instagramUri, setInstagramUri] = useState('');
  const [classId, setClassId] = useState<number | ''>('');
  const [availableClasses, setAvailableClasses] = useState<CampClass[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  useEffect(() => {
    const fetchClasses = async () => {
      const { data, error } = await supabase.from('CAMP_CLASSES').select('*').order('class_num');
      if (error) {
        console.error('Error fetching classes:', error);
      } else {
        setAvailableClasses(data);
      }
    };
    fetchClasses();
  }, []);

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (isLoginView) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError("Invalid login credentials.");
      } else {
        router.push('/');
      }
    } else {
      try {
        const response = await fetch('/api/users/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name, school, class_id: classId || null, instagram_uri: instagramUri || null }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Signup failed.');
        
        setSuccessMessage('Signup successful! Please check your email to verify your account.');
        setIsLoginView(true);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      }
    }
  };
  
  const toggleView = (e: React.MouseEvent) => {
      e.preventDefault();
      setIsLoginView(!isLoginView);
      setError(null);
      setSuccessMessage(null);
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.background}></div>
      <main className={styles.mainContent}>
        <div className={styles.leftColumn}>
          {isLoginView ? (
            <div className={`${styles.card} ${styles.loginCard}`}>
              <div className={styles.cardHeader}>
                <span className={styles.brand}>몰입캠프</span>
                <a href="#" onClick={toggleView} className={styles.link}>회원가입</a>
              </div>
              <div className={styles.titleContainer}>
                <h1 className={styles.title}>로그인</h1>
                <button form="loginForm" type="submit" className={styles.submitButton}>
                  <span className={styles.arrow}>&gt;</span>
                </button>
              </div>
              {error && <p className={styles.error}>{error}</p>}
              <form id="loginForm" onSubmit={handleAuthAction} className={styles.form}>
                <div className={styles.inputGroup}>
                  <span className={styles.inputIcon}>@</span>
                  <input type="email" placeholder="e-mail address" className={styles.input} required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className={styles.inputGroup}>
                  <span className={styles.inputIcon}>🔑</span>
                  <input type="password" placeholder="password" className={styles.input} required value={password} onChange={(e) => setPassword(e.target.value)} />
                  {/* "I forgot" can be implemented later */}
                </div>
              </form>
              {successMessage && <p className={styles.success}>{successMessage}</p>}
            </div>
          ) : (
            <div className={`${styles.card} ${styles.signupCard}`}>
              <div className={styles.cardHeader}>
                <span className={styles.brand}>몰입캠프</span>
                <a href="#" onClick={toggleView} className={styles.link}>로그인</a>
              </div>
              <h1 className={styles.title}>회원가입</h1>
              {error && <p className={styles.error}>{error}</p>}
              <form onSubmit={handleAuthAction} className={styles.form}>
                <div className={styles.inputGroup}>
                    <span className={styles.inputIcon}>@</span>
                    <input type="email" placeholder="e-mail address" required className={styles.input} value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className={styles.inputGroup}>
                    <span className={styles.inputIcon}>🔑</span>
                    <input type="password" placeholder="password (min. 6 chars)" required className={styles.input} value={password} onChange={e => setPassword(e.target.value)} />
                </div>
                <div className={styles.inputGroup}>
                    <span className={styles.inputIcon}>👤</span>
                    <input type="text" placeholder="Full Name" required className={styles.input} value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className={styles.inputGroup}>
                    <span className={styles.inputIcon}>🏫</span>
                    <input type="text" placeholder="School" className={styles.input} value={school} onChange={e => setSchool(e.target.value)} />
                </div>
                <div className={styles.inputGroup}>
                    <span className={styles.inputIcon}>🎓</span>
                    <select
                        required
                        className={styles.input}
                        value={classId}
                        onChange={e => setClassId(Number(e.target.value))}
                        style={{ appearance: 'none' }} // 기본 화살표 제거
                    >
                        <option value="" disabled>분반을 선택하세요</option>
                        {availableClasses.map(c => (
                            <option key={c.class_id} value={c.class_id}>
                                {c.class_num}분반
                            </option>
                        ))}
                    </select>
                </div>
                <div className={styles.inputGroup}>
                    <span className={styles.inputIcon}>🔗</span>
                    <input type="url" placeholder="Instagram URL (optional)" className={styles.input} value={instagramUri} onChange={e => setInstagramUri(e.target.value)} />
                </div>
                <button type="submit" className={styles.signupButton}>Create Account</button>
              </form>
              {successMessage && <p className={styles.success}>{successMessage}</p>}
            </div>
          )}
        </div>

        <div className={styles.rightColumn}>
          {/* Feature Card */}
          <div className={`${styles.card} ${styles.featureCard}`}>
             {/* This part remains the same as auth-preview */}
             <div className={styles.featureHeader}>
              <span>All-in-One 몰입캠프</span>
            </div>
            <div className={styles.featureBody}>
                <h2 className={styles.featureTitle}>관리,</h2>
                <h2 className={styles.featureTitle}>협업,</h2>
                <h2 className={styles.featureTitle}>창작.</h2>
            </div>
            <div className={styles.featureDetails}>
              <p>스크럼 노트부터 일정 투표까지, <br></br>하나의 워크스페이스에서 모든 <br></br>프로젝트를 관리하세요.</p>
            </div>
            <div style={{ flexGrow: 1 }} />
            <div className={styles.featureFooter}>
                <span className={styles.featureBrand}>MADCAMP</span>
                <a href="#" className={styles.joinButton}>
                    더보기
                </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AuthPage; 