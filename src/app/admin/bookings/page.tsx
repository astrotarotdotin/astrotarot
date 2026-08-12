"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Booking {
  id: string;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  package: string;
  amount_paid: number;
  slot_start: string;
  payment_status: string;
  session_status: string;
}

interface Slot {
  start: string;
  label: string;
}

async function authedFetch(url: string, options: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
  });
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// Small reusable in-dashboard confirmation panel — replaces the browser's
// native confirm() popup, which can't be styled and looks jarring against
// the rest of the UI.
function ConfirmPanel({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="card-fairy"
      style={{
        padding: 20,
        borderRadius: 6,
        marginTop: 8,
        borderColor: "rgba(196,96,138,0.4)",
      }}
    >
      <p style={{ fontFamily: "var(--font-display)", fontSize: 16, marginBottom: 6 }}>{title}</p>
      <p style={{ fontSize: 14, opacity: 0.75, marginBottom: 16 }}>{message}</p>
      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn-fairy" onClick={onConfirm}>
          {confirmLabel}
        </button>
        <button className="btn-ghost-fairy" onClick={onCancel}>
          Never mind
        </button>
      </div>
    </div>
  );
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [view, setView] = useState<"list" | "calendar">("list");
  const [sessionFilter, setSessionFilter] = useState<string>("");
  const [paymentFilter, setPaymentFilter] = useState<string>("");
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Which booking is currently showing its cancel-confirmation panel
  const [confirmingCancelId, setConfirmingCancelId] = useState<string | null>(null);

  // Reschedule flow state
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleSlots, setRescheduleSlots] = useState<Slot[]>([]);
  const [rescheduleSelectedSlot, setRescheduleSelectedSlot] = useState<Slot | null>(null);
  const [loadingRescheduleSlots, setLoadingRescheduleSlots] = useState(false);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (sessionFilter) params.set("session_status", sessionFilter);
    if (paymentFilter) params.set("payment_status", paymentFilter);
    if (view === "calendar") params.set("month", monthKey(calendarMonth));

    const res = await authedFetch(`/api/admin/bookings?${params.toString()}`);
    const json = await res.json();
    setBookings(json.bookings || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    setSelectedDate(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, sessionFilter, paymentFilter, calendarMonth]);

  const updateStatus = async (id: string, session_status: string) => {
    await authedFetch("/api/admin/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, session_status }),
    });
    setConfirmingCancelId(null);
    load();
  };

  const copyFeedbackLink = (id: string) => {
    const link = `${window.location.origin}/feedback/${id}`;
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyCancellationMessage = (b: Booking) => {
    const message = `Hi ${b.client_name}, unfortunately your ${b.package.replace(
      "_",
      " "
    )} session on ${new Date(b.slot_start).toLocaleString("en-IN")} has been cancelled. Please let us know if you'd like to rebook — sorry for the inconvenience!`;
    navigator.clipboard.writeText(message);
    setCopiedId(`cancel-msg-${b.id}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ---- Reschedule flow ----

  const startReschedule = (id: string) => {
    setReschedulingId(id);
    setRescheduleDate("");
    setRescheduleSlots([]);
    setRescheduleSelectedSlot(null);
  };

  const cancelReschedule = () => {
    setReschedulingId(null);
    setRescheduleDate("");
    setRescheduleSlots([]);
    setRescheduleSelectedSlot(null);
  };

  useEffect(() => {
    if (!rescheduleDate) return;
    setLoadingRescheduleSlots(true);
    setRescheduleSelectedSlot(null);
    fetch(`/api/bookings/available-slots?date=${rescheduleDate}`)
      .then((r) => r.json())
      .then((data) => setRescheduleSlots(data.slots ?? []))
      .finally(() => setLoadingRescheduleSlots(false));
  }, [rescheduleDate]);

  const confirmReschedule = async (b: Booking) => {
    if (!rescheduleSelectedSlot) return;
    await authedFetch("/api/admin/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: b.id,
        action: "reschedule",
        new_slot_start: rescheduleSelectedSlot.start,
      }),
    });

    // Copy a ready-to-send WhatsApp message with the new time, since there's
    // no automated notification wired up yet — this saves retyping it.
    const message = `Hi ${b.client_name}, your ${b.package.replace(
      "_",
      " "
    )} session has been rescheduled to ${new Date(
      rescheduleSelectedSlot.start
    ).toLocaleString("en-IN")}. Let us know if this doesn't work for you!`;
    navigator.clipboard.writeText(message);
    setCopiedId(`reschedule-msg-${b.id}`);
    setTimeout(() => setCopiedId(null), 3000);

    cancelReschedule();
    load();
  };

  // ---- Calendar grouping ----
  // IMPORTANT: only ACTIVE (upcoming/completed) bookings occupy a calendar
  // slot. A cancelled booking frees up that date — it should not show as
  // "1 booking" on the day, and should not make the day look occupied.
  const bookingsByDay = useMemo(() => {
    const map: Record<number, Booking[]> = {};
    bookings
      .filter((b) => b.session_status !== "cancelled")
      .forEach((b) => {
        const d = new Date(b.slot_start).getDate();
        if (!map[d]) map[d] = [];
        map[d].push(b);
      });
    return map;
  }, [bookings]);

  const daysInMonth = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth() + 1,
    0
  ).getDate();
  const firstWeekday = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth(),
    1
  ).getDay();

  const selectedDayBookings = selectedDate
    ? bookings.filter(
        (b) =>
          new Date(b.slot_start).toDateString() === selectedDate &&
          b.session_status !== "cancelled"
      )
    : [];

  const renderBookingCard = (b: Booking) => (
    <div key={b.id}>
      <div
        className="card-fairy"
        style={{
          padding: 20,
          borderRadius: 6,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          opacity: b.session_status === "cancelled" ? 0.5 : 1,
        }}
      >
        <div>
          <p style={{ fontFamily: "var(--font-display)", fontSize: 16 }}>{b.client_name}</p>
          <p style={{ fontSize: 15, opacity: 0.8 }}>
            {b.client_phone} · {b.client_email || "no email"}
          </p>
          <p style={{ fontSize: 15, opacity: 0.8, marginTop: 4 }}>
            {b.package.replace("_", " ")} · ₹{b.amount_paid} ·{" "}
            {new Date(b.slot_start).toLocaleString("en-IN")}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span className="badge-fairy" style={{ opacity: b.payment_status === "paid" ? 1 : 0.5 }}>
            {b.payment_status}
          </span>
          <span className="badge-fairy">{b.session_status}</span>

          {b.session_status === "upcoming" && (
            <>
              <button className="btn-ghost-fairy" onClick={() => updateStatus(b.id, "completed")}>
                Mark completed
              </button>
              <button className="btn-ghost-fairy" onClick={() => startReschedule(b.id)}>
                Reschedule
              </button>
              <button
                className="btn-ghost-fairy"
                style={{ opacity: 0.7 }}
                onClick={() => setConfirmingCancelId(b.id)}
              >
                Cancel
              </button>
            </>
          )}
          {b.session_status === "completed" && (
            <button className="btn-ghost-fairy" onClick={() => copyFeedbackLink(b.id)}>
              {copiedId === b.id ? "Link copied!" : "Copy feedback link"}
            </button>
          )}
          {b.session_status === "cancelled" && (
            <button className="btn-ghost-fairy" onClick={() => copyCancellationMessage(b)}>
              {copiedId === `cancel-msg-${b.id}` ? "Message copied!" : "Copy cancellation message"}
            </button>
          )}
        </div>
      </div>

      {/* In-dashboard cancel confirmation — replaces browser confirm() */}
      {confirmingCancelId === b.id && (
        <ConfirmPanel
          title="Cancel this booking?"
          message={`This will cancel ${b.client_name}'s session and free up that time slot. This won't notify them automatically — you'll get a ready-to-copy message afterward.`}
          confirmLabel="Yes, cancel booking"
          onConfirm={() => updateStatus(b.id, "cancelled")}
          onCancel={() => setConfirmingCancelId(null)}
        />
      )}

      {/* Reschedule panel */}
      {reschedulingId === b.id && (
        <div
          className="card-fairy"
          style={{ padding: 20, borderRadius: 6, marginTop: 8, borderColor: "rgba(123,94,167,0.4)" }}
        >
          <p style={{ fontFamily: "var(--font-display)", fontSize: 16, marginBottom: 12 }}>
            Reschedule {b.client_name}'s session
          </p>
          <input
            type="date"
            value={rescheduleDate}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => setRescheduleDate(e.target.value)}
            style={{
              padding: 10,
              borderRadius: 4,
              background: "#1e1636",
              color: "#f0e9fa",
              border: "1px solid rgba(255,255,255,0.15)",
              colorScheme: "dark",
              marginBottom: 12,
            }}
          />

          {loadingRescheduleSlots && (
            <p style={{ opacity: 0.6, fontSize: 14 }}>Loading available times…</p>
          )}
          {!loadingRescheduleSlots && rescheduleDate && rescheduleSlots.length === 0 && (
            <p style={{ opacity: 0.6, fontSize: 14 }}>No availability that day — try another date.</p>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {rescheduleSlots.map((s) => (
              <button
                key={s.start}
                onClick={() => setRescheduleSelectedSlot(s)}
                className="btn-ghost-fairy"
                style={{
                  borderColor:
                    rescheduleSelectedSlot?.start === s.start ? "var(--rose-soft)" : undefined,
                  color: rescheduleSelectedSlot?.start === s.start ? "var(--moonwhite)" : undefined,
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn-fairy"
              disabled={!rescheduleSelectedSlot}
              onClick={() => confirmReschedule(b)}
            >
              Confirm new time
            </button>
            <button className="btn-ghost-fairy" onClick={cancelReschedule}>
              Never mind
            </button>
          </div>
        </div>
      )}

      {copiedId === `reschedule-msg-${b.id}` && (
        <p style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
          Rescheduled — a WhatsApp message with the new time was copied to your clipboard.
        </p>
      )}
    </div>
  );

  return (
    <div>
      <h1 style={{ fontSize: 26, marginBottom: 24 }}>Bookings</h1>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            className="btn-ghost-fairy"
            style={{ opacity: view === "list" ? 1 : 0.5 }}
            onClick={() => setView("list")}
          >
            List
          </button>
          <button
            className="btn-ghost-fairy"
            style={{ opacity: view === "calendar" ? 1 : 0.5 }}
            onClick={() => setView("calendar")}
          >
            Calendar
          </button>
        </div>

        <select
          value={sessionFilter}
          onChange={(e) => setSessionFilter(e.target.value)}
          style={{
            padding: "6px 8px",
            borderRadius: 4,
            background: "#1e1636",
            color: "#f0e9fa",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          <option value="">All session statuses</option>
          <option value="upcoming">Upcoming</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          style={{
            padding: "6px 8px",
            borderRadius: 4,
            background: "#1e1636",
            color: "#f0e9fa",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          <option value="">All payment statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {loading ? (
        <p style={{ opacity: 0.6 }}>Loading…</p>
      ) : view === "list" ? (
        bookings.length === 0 ? (
          <p style={{ opacity: 0.6 }}>No bookings match these filters.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {bookings.map(renderBookingCard)}
          </div>
        )
      ) : (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
            <button
              className="btn-ghost-fairy"
              onClick={() =>
                setCalendarMonth(
                  new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1)
                )
              }
            >
              ← Prev
            </button>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 16 }}>
              {calendarMonth.toLocaleString("en-IN", { month: "long", year: "numeric" })}
            </span>
            <button
              className="btn-ghost-fairy"
              onClick={() =>
                setCalendarMonth(
                  new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1)
                )
              }
            >
              Next →
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 6,
              marginBottom: 24,
            }}
          >
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} style={{ fontSize: 13, opacity: 0.7, textAlign: "center", padding: 4, fontFamily: "var(--font-ui)", fontWeight: 500 }}>
                {d}
              </div>
            ))}
            {Array.from({ length: firstWeekday }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayBookings = bookingsByDay[day] || [];
              const dateStr = new Date(
                calendarMonth.getFullYear(),
                calendarMonth.getMonth(),
                day
              ).toDateString();
              return (
                <div
                  key={day}
                  onClick={() => dayBookings.length > 0 && setSelectedDate(dateStr)}
                  className="card-fairy"
                  style={{
                    padding: 8,
                    borderRadius: 6,
                    minHeight: 72,
                    cursor: dayBookings.length > 0 ? "pointer" : "default",
                    outline: selectedDate === dateStr ? "1px solid rgba(255,255,255,0.4)" : "none",
                  }}
                >
                  <div style={{ fontSize: 14, opacity: 0.85, fontWeight: 600 }}>{day}</div>
                  {dayBookings.length > 0 && (
                    <div style={{ fontSize: 12, marginTop: 4 }}>
                      <span className="badge-fairy" style={{ fontSize: 12, padding: "3px 8px" }}>
                        {dayBookings.length} booking{dayBookings.length > 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {selectedDate && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <p style={{ fontSize: 15, opacity: 0.8, fontFamily: "var(--font-ui)" }}>Bookings on {selectedDate}:</p>
              {selectedDayBookings.map(renderBookingCard)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}