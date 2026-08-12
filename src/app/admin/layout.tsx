"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

const NAV = [
  { href: "/admin/bookings",  label: "Bookings"  },
  { href: "/admin/calendar",  label: "Calendar"  },
  { href: "/admin/workshop",  label: "Workshop"  },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/banners",   label: "Banners"   },
  { href: "/admin/content",   label: "Content"   },
  { href: "/admin/products",  label: "Products"  },
  { href: "/admin/orders",    label: "Orders"    },
  { href: "/admin/coupons",   label: "Coupons"   },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<Session | null | "loading">("loading");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === null && pathname !== "/admin/login") {
      router.push("/admin/login");
    }
  }, [session, pathname, router]);

  // ── Global 401 interceptor ──────────────────────────────────────────────
  // Wraps every fetch call made from admin pages. If any admin API returns 401
  // (Supabase token expired mid-session), redirect to login with a message
  // rather than silently failing to save data.
  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const response = await originalFetch(...args);

      // Only intercept 401s on our own admin API routes
      const url = typeof args[0] === "string" ? args[0] : (args[0] as Request).url;
      const isAdminApi = url.includes("/api/admin/");

      if (response.status === 401 && isAdminApi) {
        // Clone so the original response can still be read by the caller
        // Then redirect — session has expired
        await supabase.auth.signOut();
        router.push("/admin/login?reason=expired");
        // Return the original 401 so any in-flight handler still gets it
        return response;
      }

      return response;
    };

    return () => {
      // Restore original fetch when layout unmounts
      window.fetch = originalFetch;
    };
  }, [router]);
  // ── End global 401 interceptor ──────────────────────────────────────────

  // Login page renders on its own, no gating/nav chrome
  if (pathname === "/admin/login") return <>{children}</>;

  if (session === "loading") {
    return (
      <div style={{ padding: 60, textAlign: "center", opacity: 0.6 }}>Loading…</div>
    );
  }

  if (!session) return null; // redirect is in flight

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 32px",
          borderBottom: "1px solid rgba(200,168,240,0.15)",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: pathname === item.href ? "var(--rose-soft)" : "var(--lavender)",
                textDecoration: "none",
                opacity: pathname === item.href ? 1 : 0.7,
              }}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <button
          className="btn-ghost-fairy"
          onClick={async () => {
            await supabase.auth.signOut();
            router.push("/admin/login");
          }}
        >
          Sign out
        </button>
      </div>
      <div style={{ padding: "32px" }}>{children}</div>
    </div>
  );
}