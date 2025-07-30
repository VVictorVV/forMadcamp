"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient'; // 상대 경로 사용
import { Session, User } from '@supabase/supabase-js';

// Extend the User type to include our custom profile data
export type AppUser = User & {
  name: string | null;
  profile_image_uri: string | null;
};

interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  isLoading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetches profile data and merges it with the auth user
    const fetchUserWithProfile = async (session: Session | null) => {
      if (!session?.user) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Fetch the profile from the PROFILES table
      const { data: profile, error } = await supabase
        .from('PROFILES')
        .select('name, profile_image_uri')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error("Error fetching user profile:", error);
        setUser(session.user as AppUser); // Fallback to basic user object
      } else {
        // Merge auth user with profile data
        setUser({
          ...session.user,
          name: profile?.name || null,
          profile_image_uri: profile?.profile_image_uri || null,
        });
      }
      setIsLoading(false);
    };

    // Get initial session and profile
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      await fetchUserWithProfile(session);
    }
    
    getInitialSession();

    // Set up a listener for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      await fetchUserWithProfile(session);
    });

    // Cleanup the listener on component unmount
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    isLoading,
    logout
  };

  // 로딩 중일 때는 아무것도 렌더링하지 않아, 깜빡임(flicker)을 방지합니다.
  if (isLoading) {
    return null;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 