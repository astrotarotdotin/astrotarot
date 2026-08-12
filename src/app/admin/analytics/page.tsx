"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Analytics {
  revenueThisMonth: number;
  totalBookings: number;
  sessionsUpcoming: number;
  sessionsCompleted: number;
  totalWorkshopEnrollments: number;
  estimatedAiSpendThisMonth: number;
  aiRequestsThisMonth: number;
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card-fairy" style={{ padding: 24, borderRadius: 6 }}>
      <p style={{ fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.75, marginBottom: 8 }}>
        {label}
      </p>
      <p style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--gold)" }}>{value}</p>
      {sub && <p style={{ fontSize: 14, opacity: 0.75, marginTop: 6, fontFamily: "var(--font-body)", lineHeight: 1.5 }}>{sub}</p>}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const res = await fetch("/api/admin/analytics", { headers: { Authorization: `Bearer ${token}` } });
      setData(await res.json());
    })();
  }, []);

  if (!data) return <p style={{ opacity: 0.6 }}>Loading…</p>;

  return (
    <div>
      <h1 style={{ fontSize: 26, marginBottom: 24 }}>Analytics</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
        <StatCard label="Revenue this month" value={`₹${data.revenueThisMonth.toLocaleString("en-IN")}`} sub="Bookings + Workshop" />
        <StatCard label="Sessions upcoming" value={String(data.sessionsUpcoming)} />
        <StatCard label="Sessions completed" value={String(data.sessionsCompleted)} />
        <StatCard label="Workshop enrollments" value={String(data.totalWorkshopEnrollments)} />
      </div>

      <h2 style={{ fontSize: 18, marginBottom: 16, opacity: 0.85 }}>AI Usage (estimated)</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        <StatCard
          label="Estimated AI spend this month"
          value={`$${data.estimatedAiSpendThisMonth.toFixed(2)}`}
          sub="Approximate — check Anthropic Console for exact billing"
        />
        <StatCard label="AI requests this month" value={String(data.aiRequestsThisMonth)} sub="Free Tarot Readings generated" />
      </div>
    </div>
  );
}