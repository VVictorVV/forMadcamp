"use client";

import { usePathname, useRouter } from "next/navigation";
import Header from "@/components/Header";
import { useAuth } from "../context/AuthContext";
import { useEffect } from "react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useAuth();

  // 로그인이 필요 없는 허용된 경로 목록
  const allowedPaths = ['/', '/auth'];

  useEffect(() => {
    // 인증 상태 로딩이 완료될 때까지 기다립니다.
    if (isLoading) {
      return;
    }

    // 로그인하지 않은 사용자가 허용되지 않은 경로에 접근하면 로그인 페이지로 리디렉션합니다.
    if (!user && !allowedPaths.includes(pathname)) {
      router.push('/auth');
    }
  }, [user, isLoading, pathname, router]);

  // Define paths where the header should be hidden
  const noHeaderPaths = ['/auth'];
  const musicPageRegex = /^\/class\/\d+\/[a-zA-Z0-9-]+$/;

  const showHeader = !noHeaderPaths.includes(pathname) && !musicPageRegex.test(pathname);
  
  // 리디렉션 전에 보호된 콘텐츠가 잠시 보이는 것을 방지합니다.
  if (isLoading || (!user && !allowedPaths.includes(pathname))) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <p>Loading...</p>
        </div>
      );
  }

  return (
    <>
      {showHeader && <Header />}
      <main className={showHeader ? "main-content" : ""} style={{ marginTop: 0 }}>{children}</main>
    </>
  );
} 