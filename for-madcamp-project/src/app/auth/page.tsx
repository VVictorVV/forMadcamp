"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from './auth.module.css'; // auth.module.css를 그대로 사용
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";

const AuthPage = () => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [school, setSchool] = useState('');
  const [instagramUri, setInstagramUri] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

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
          body: JSON.stringify({ email, password, name, school, instagram_uri: instagramUri || null }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Signup failed.');
        
        setSuccessMessage('Signup successful! Please check your email to verify your account.');
        setIsLoginView(true);
      } catch (err: any) {
        setError(err.message);
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
                <span className={styles.brand}>Madcamp</span>
                <a href="#" onClick={toggleView} className={styles.link}>Sign up</a>
              </div>
              <div className={styles.titleContainer}>
                <h1 className={styles.title}>Log in</h1>
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
                <span className={styles.brand}>Madcamp</span>
                <a href="#" onClick={toggleView} className={styles.link}>Log in</a>
              </div>
              <h1 className={styles.title}>Sign up</h1>
              <form onSubmit={handleAuthAction} className={styles.form}>
                <input type="email" placeholder="e-mail address" required className={styles.input} value={email} onChange={e => setEmail(e.target.value)} />
                <input type="password" placeholder="password (min. 6 chars)" required className={styles.input} value={password} onChange={e => setPassword(e.target.value)} />
                <input type="text" placeholder="Full Name" required className={styles.input} value={name} onChange={e => setName(e.target.value)} />
                <input type="text" placeholder="School" className={styles.input} value={school} onChange={e => setSchool(e.target.value)} />
                <input type="url" placeholder="Instagram URL (optional)" className={styles.input} value={instagramUri} onChange={e => setInstagramUri(e.target.value)} />
                <button type="submit" className={styles.signupButton}>Create Account</button>
              </form>
              {error && <p className={styles.error}>{error}</p>}
            </div>
          )}
        </div>

        <div className={styles.rightColumn}>
          {/* Feature Card */}
          <div className={`${styles.card} ${styles.featureCard}`}>
             {/* This part remains the same as auth-preview */}
             <div className={styles.featureHeader}>
              <span>All-in-One Madcamp</span>
            </div>
            <div className={styles.featureBody}>
                <h2 className={styles.featureTitle}>Manage.</h2>
                <h2 className={styles.featureTitle}>Collaborate.</h2>
                <h2 className={styles.featureTitle}>Create.</h2>
            </div>
            <div className={styles.featureDetails}>
              <p>From scrum notes to final votes, all your project needs in one streamlined workspace.</p>
            </div>
            <div style={{ flexGrow: 1 }} />
            <div className={styles.featureFooter}>
                <span className={styles.featureBrand}>MADCAMP</span>
                <a href="#" className={styles.joinButton}>
                    Learn More
                </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AuthPage; 