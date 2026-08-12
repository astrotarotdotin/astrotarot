"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Enrollment {
  id: string;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  batch_start_date: string;
  amount_paid: number;
  payment_status: string;
}

export default function AdminWorkshopPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch("/api/admin/workshop", { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      setEnrollments(json.enrollments || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <h1 style={{ fontSize: 26, marginBottom: 24 }}>Workshop Enrollments</h1>
      {loading ? (
        <p style={{ opacity: 0.6 }}>Loading…</p>
      ) : enrollments.length === 0 ? (
        <p style={{ opacity: 0.6 }}>No enrollments yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {enrollments.map((e) => (
            <div key={e.id} className="card-fairy" style={{ padding: 20, borderRadius: 6, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <p style={{ fontFamily: "var(--font-display)", fontSize: 16 }}>{e.client_name}</p>
                <p style={{ fontSize: 13, opacity: 0.7 }}>{e.client_phone} · {e.client_email || "no email"}</p>
                <p style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>
                  Batch: {new Date(e.batch_start_date).toLocaleDateString("en-IN")} · ₹{e.amount_paid}
                </p>
              </div>
              <span className="badge-fairy" style={{ opacity: e.payment_status === "paid" ? 1 : 0.5 }}>
                {e.payment_status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
