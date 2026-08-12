"use client";
import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./Footer";

export default function ConditionalChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  if (isAdmin) {
    // Admin has its own nav (in admin/layout.tsx) — no public chrome here
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <div className="page-content">{children}</div>
      <Footer />
    </>
  );
}
