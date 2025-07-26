"use client"

import { useAuth } from "../../context/AuthContext";
import Link from "next/link";
import { useRouter } from 'next/navigation';

const MembersPage = () => {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  if (isLoading) {
    return <main style={{ paddingTop: "6rem", textAlign: "center" }}><p>Loading...</p></main>;
  }

  if (!user) {
    router.push('/auth');
    return null;
  }
  
  return (
    <main style={{ paddingTop: "6rem", textAlign: "center" }}>
      <h1>팀원 소개</h1>
      {/* 로그인 시에만 보이는 페이지 내용 */}
    </main>
  );
};

export default MembersPage; 