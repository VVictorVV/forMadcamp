"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/Header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const noHeaderPaths = ['/auth'];
  const showHeader = !noHeaderPaths.includes(pathname);

  return (
    <>
      {showHeader && <Header />}
      <main className={showHeader ? "main-content" : ""}>{children}</main>
    </>
  );
} 