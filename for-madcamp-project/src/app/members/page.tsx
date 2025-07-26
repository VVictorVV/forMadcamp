"use client"

import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

const MembersPage = () => {
  const { isLoggedIn } = useAuth();

  if (!isLoggedIn) {
    return (
      <main style={{ paddingTop: "6rem", textAlign: "center" }}>
        <h1>접근 권한 없음</h1>
        <p>이 페이지를 보려면 로그인이 필요합니다.</p>
        <Link href="/auth">로그인 페이지로 이동</Link>
      </main>
    );
  }
  
  return (
    <main style={{ paddingTop: "6rem", textAlign: "center" }}>
      <h1>팀원 소개</h1>
      {/* 로그인 시에만 보이는 페이지 내용 */}
    </main>
  );
};

export default MembersPage; 