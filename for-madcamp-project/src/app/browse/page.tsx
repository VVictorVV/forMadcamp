"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

const BrowseRedirectPage = () => {
  const { user, isLoading } = useAuth(); // Changed 'loading' to 'isLoading'
  const router = useRouter();

  useEffect(() => {
    // Wait until the authentication state is determined
    if (!isLoading) { // Changed 'loading' to 'isLoading'
      if (user) {
        // If user is logged in, redirect to their specific profile page
        router.replace(`/browse/${user.id}`);
      } else {
        // If no user is logged in, redirect to the authentication page
        router.replace('/auth');
      }
    }
  }, [user, isLoading, router]); // Changed 'loading' to 'isLoading'

  // Display a loading indicator while checking auth state
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <p>Loading your profile...</p>
    </div>
  );
};

export default BrowseRedirectPage; 