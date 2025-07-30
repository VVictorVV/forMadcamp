"use client";

import { useAuth } from "@/context/AuthContext";
import LoggedOutHome from "./components/LoggedOutHome";
import LoggedInHome from "./components/LoggedInHome"; 

export default function Home() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <main style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#1a202c'
      }}>
        <p style={{color: 'white'}}>Loading...</p>
      </main>
    )
  }

  return (
    <>
      {user ? (
        <LoggedInHome /> 
      ) : (
        <LoggedOutHome />
      )}
    </>
  );
}
