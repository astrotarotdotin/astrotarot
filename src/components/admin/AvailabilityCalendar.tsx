"use client";
import { useEffect, useState } from "react";
import type React from "react";
import { supabase } from "@/lib/supabase";

const DAYS = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
];

type TimeWindow = { id: string; start_time: string; end_time: string };
type DayState = { day_of_week: number; windows: TimeWindow[] };
type Override = {
  blocked_date: string;
  block_type: "full_block" | "time_override";
  override_start?: string;
  override_end?: string;
  reason?: string;
};

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// Native <input type="time/date"> and <select> render with a white background
// by default in most browsers — this keeps them readable against the dark UI.
const darkInputStyle: React.CSSProperties = {
  padding: "6px 8px",
  borderRadius: 4,
  background: "#1e1636",
  color: "#f0e9fa",
  border: "1px solid rgba(255,255,255,0.15)",
  colorScheme: "dark",
};

const darkInputStyleSmall: React.CSSProperties = {
  ...darkInputStyle,
  fontSize: 14,
  padding: "4px 8px",
};

// Small helper so every fetch call attaches the logged-in admin's token,
// same pattern as AdminBookingsPage.
async function authedFetch(url: string, options: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

export default function AvailabilityCalendar() {
  const [weekState, setWeekState] = useState<DayState[]>(
    DAYS.map((d) => ({ day_of_week: d.value, windows: [] }))
  );
  const [savedSnapshot, setSavedSnapshot] = useState<string>("");
  const [checkedDays, setCheckedDays] = useState<Set<number>>(new Set());
  const [bulkStart, setBulkStart] = useState("09:00");
  const [bulkEnd, setBulkEnd] = useState("17:00");
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [overrideDate, setOverrideDate] = useState("");
  const [overrideMode, setOverrideMode] = useState<"full_block" | "time_override">("full_block");
  const [overrideStart, setOverrideStart] = useState("09:00");
  const [overrideEnd, setOverrideEnd] = useState("17:00");
  const [overrideReason, setOverrideReason] = useState("");

  const [previewMonth, setPreviewMonth] = useState(new Date());

  // Comparable snapshot of the current on-screen pattern, ignoring the random
  // `id` fields (those only exist for React keys, not saved to the DB).
  const currentSnapshot = JSON.stringify(
    weekState.map((d) => ({
      day_of_week: d.day_of_week,
      windows: d.windows.map((w) => ({ start_time: w.start_time, end_time: w.end_time })),
    }))
  );
  const hasUnsavedChanges = !loading && currentSnapshot !== savedSnapshot;

  function toDateKey(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  // Combines the weekly recurring pattern + any single-day override into one
  // "what actually happens on this real date" answer — this is what was
  // missing before: the two sections existed separately, with no single view
  // showing the resolved result across an actual month.
  function getEffectiveAvailability(dateObj: Date): {
    label: string;
    kind: "open" | "closed" | "override";
  } {
    const dateKey = toDateKey(dateObj);
    const override = overrides.find((o) => o.blocked_date === dateKey);

    if (override) {
      if (override.block_type === "full_block") {
        return { label: "Blocked", kind: "override" };
      }
      return {
        label: `${override.override_start}–${override.override_end}`,
        kind: "override",
      };
    }

    const dayOfWeek = dateObj.getDay();
    const day = weekState.find((d) => d.day_of_week === dayOfWeek);
    if (!day || day.windows.length === 0) {
      return { label: "Closed", kind: "closed" };
    }
    const label = day.windows.map((w) => `${w.start_time}–${w.end_time}`).join(", ");
    return { label, kind: "open" };
  }

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const res = await authedFetch("/api/admin/calendar");
    const data = await res.json();

    const grouped: DayState[] = DAYS.map((d) => ({ day_of_week: d.value, windows: [] }));
    (data.weekly || []).forEach((row: any) => {
      const day = grouped.find((g) => g.day_of_week === row.day_of_week);
      day?.windows.push({
        id: uid(),
        start_time: row.start_time.slice(0, 5),
        end_time: row.end_time.slice(0, 5),
      });
    });
    setWeekState(grouped);
    setSavedSnapshot(
      JSON.stringify(
        grouped.map((d) => ({
          day_of_week: d.day_of_week,
          windows: d.windows.map((w) => ({ start_time: w.start_time, end_time: w.end_time })),
        }))
      )
    );
    setOverrides(data.overrides || []);
    setLoading(false);
  };

  const toggleDayChecked = (day: number) => {
    setCheckedDays((prev) => {
      const next = new Set(prev);
      next.has(day) ? next.delete(day) : next.add(day);
      return next;
    });
  };

  const applyBulkRange = () => {
    if (bulkStart >= bulkEnd) {
      setMessage("End time must be after start time.");
      return;
    }
    setWeekState((prev) =>
      prev.map((day) =>
        checkedDays.has(day.day_of_week)
          ? { ...day, windows: [{ id: uid(), start_time: bulkStart, end_time: bulkEnd }] }
          : day
      )
    );
    setMessage(null);
  };

  const updateWindow = (day: number, windowId: string, field: "start_time" | "end_time", value: string) => {
    setWeekState((prev) =>
      prev.map((d) =>
        d.day_of_week === day
          ? { ...d, windows: d.windows.map((w) => (w.id === windowId ? { ...w, [field]: value } : w)) }
          : d
      )
    );
  };

  const addWindow = (day: number) => {
    setWeekState((prev) =>
      prev.map((d) =>
        d.day_of_week === day
          ? { ...d, windows: [...d.windows, { id: uid(), start_time: "09:00", end_time: "17:00" }] }
          : d
      )
    );
  };

  const removeWindow = (day: number, windowId: string) => {
    setWeekState((prev) =>
      prev.map((d) =>
        d.day_of_week === day ? { ...d, windows: d.windows.filter((w) => w.id !== windowId) } : d
      )
    );
  };

  const saveWeeklyPattern = async () => {
    setSaving(true);
    setMessage(null);

    const pattern = weekState.flatMap((day) =>
      day.windows.map((w) => ({
        day_of_week: day.day_of_week,
        start_time: w.start_time,
        end_time: w.end_time,
      }))
    );

    const res = await authedFetch("/api/admin/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pattern }),
    });

    setSaving(false);
    if (res.ok) {
      setMessage("Weekly schedule saved.");
      setCheckedDays(new Set());
      setSavedSnapshot(currentSnapshot);
    } else {
      const err = await res.json();
      setMessage(err.error || "Failed to save schedule.");
    }
  };

  const saveOverride = async () => {
    if (!overrideDate) {
      setMessage("Pick a date first.");
      return;
    }
    setSaving(true);
    setMessage(null);

    const res = await authedFetch("/api/admin/calendar", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: overrideDate,
        block_type: overrideMode,
        override_start: overrideMode === "time_override" ? overrideStart : undefined,
        override_end: overrideMode === "time_override" ? overrideEnd : undefined,
        reason: overrideReason || undefined,
      }),
    });

    const data = await res.json();
    setSaving(false);

    if (res.ok) {
      setMessage(data.warning ? `Override saved. ⚠️ ${data.warning}` : "Override saved.");
      setOverrideDate("");
      setOverrideReason("");
      load();
    } else {
      setMessage(data.error || "Failed to save override.");
    }
  };

  const removeOverride = async (date: string) => {
    setSaving(true);
    const res = await authedFetch(`/api/admin/calendar?date=${date}`, { method: "DELETE" });
    setSaving(false);
    if (res.ok) {
      setMessage("Override removed.");
      load();
    }
  };

  // Clicking a date in the month preview jumps straight to the override form,
  // pre-filled — if that date already has an override, it loads the existing
  // values for editing; otherwise it defaults to blocking the day.
  const editDateFromPreview = (dateObj: Date) => {
    const dateKey = toDateKey(dateObj);
    const existing = overrides.find((o) => o.blocked_date === dateKey);

    setOverrideDate(dateKey);
    if (existing) {
      setOverrideMode(existing.block_type);
      if (existing.override_start) setOverrideStart(existing.override_start);
      if (existing.override_end) setOverrideEnd(existing.override_end);
      setOverrideReason(existing.reason || "");
    } else {
      setOverrideMode("full_block");
      setOverrideReason("");
    }

    document.getElementById("override-form-anchor")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  if (loading) {
    return <p style={{ opacity: 0.6 }}>Loading…</p>;
  }

  const previewDaysInMonth = new Date(
    previewMonth.getFullYear(),
    previewMonth.getMonth() + 1,
    0
  ).getDate();
  const previewFirstWeekday = new Date(
    previewMonth.getFullYear(),
    previewMonth.getMonth(),
    1
  ).getDay();
  const todayKey = toDateKey(new Date());

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {message && (
        <div className="card-fairy" style={{ padding: 14, borderRadius: 6, fontSize: 14 }}>
          {message}
        </div>
      )}

      {/* ============ Month preview — resolved availability per real date ============ */}
      <div className="card-fairy" style={{ padding: 24, borderRadius: 6 }}>
        <p style={{ fontFamily: "var(--font-display)", fontSize: 18, marginBottom: 6 }}>
          Month view
        </p>
        <p style={{ fontSize: 15, opacity: 0.8, marginBottom: 20, lineHeight: 1.6 }}>
          This shows what's actually open on each real date — the weekly pattern combined with any
          overrides. Click any date to block it, give it custom hours, or edit an existing
          override.
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
          <button
            className="btn-ghost-fairy"
            onClick={() =>
              setPreviewMonth(new Date(previewMonth.getFullYear(), previewMonth.getMonth() - 1, 1))
            }
          >
            ← Prev
          </button>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 16 }}>
            {previewMonth.toLocaleString("en-IN", { month: "long", year: "numeric" })}
          </span>
          <button
            className="btn-ghost-fairy"
            onClick={() =>
              setPreviewMonth(new Date(previewMonth.getFullYear(), previewMonth.getMonth() + 1, 1))
            }
          >
            Next →
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} style={{ fontSize: 13, fontFamily: "var(--font-ui)", fontWeight: 600, opacity: 0.75, textAlign: "center", padding: "6px 4px" }}>
              {d}
            </div>
          ))}
          {Array.from({ length: previewFirstWeekday }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: previewDaysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateObj = new Date(previewMonth.getFullYear(), previewMonth.getMonth(), day);
            const dateKey = toDateKey(dateObj);
            const availability = getEffectiveAvailability(dateObj);
            const isToday = dateKey === todayKey;

            const colorByKind = {
              open: "#7fd99a",
              closed: "rgba(255,255,255,0.35)",
              override: "#e6b43c",
            };

            return (
              <div
                key={day}
                onClick={() => editDateFromPreview(dateObj)}
                style={{
                  padding: 8,
                  borderRadius: 6,
                  minHeight: 76,
                  cursor: "pointer",
                  background: "rgba(255,255,255,0.03)",
                  border: isToday ? "1px solid rgba(255,255,255,0.4)" : "1px solid transparent",
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600, opacity: 0.85, fontFamily: "var(--font-ui)" }}>{day}</div>
                <div
                  style={{
                    fontSize: 13,
                    marginTop: 4,
                    color: colorByKind[availability.kind],
                    lineHeight: 1.4,
                    wordBreak: "break-word",
                    fontFamily: "var(--font-ui)",
                  }}
                >
                  {availability.label}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 16, marginTop: 16, fontSize: 13, opacity: 0.8, fontFamily: "var(--font-ui)" }}>
          <span>
            <span style={{ color: "#7fd99a" }}>●</span> Open (weekly pattern)
          </span>
          <span>
            <span style={{ color: "rgba(255,255,255,0.35)" }}>●</span> Closed
          </span>
          <span>
            <span style={{ color: "#e6b43c" }}>●</span> Override
          </span>
        </div>
      </div>

      {/* ============ Weekly recurring pattern ============ */}
      <div className="card-fairy" style={{ padding: 24, borderRadius: 6 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <p style={{ fontFamily: "var(--font-display)", fontSize: 18, marginBottom: 6 }}>
            Weekly schedule
          </p>
          {hasUnsavedChanges ? (
            <span
              className="badge-fairy"
              style={{ background: "rgba(230,180,60,0.15)", color: "#e6b43c" }}
            >
              ● Unsaved changes
            </span>
          ) : (
            <span
              className="badge-fairy"
              style={{ background: "rgba(80,200,120,0.12)", color: "#7fd99a" }}
            >
              ✓ All saved
            </span>
          )}
        </div>
        <p style={{ fontSize: 15, opacity: 0.8, marginBottom: 20, lineHeight: 1.6 }}>
          This is a repeating weekly pattern — not tied to any specific calendar date, it applies
          every week (e.g. "every Monday, 9–11 PM"). To block or change one specific date instead,
          use "Single-day overrides" further down. Check the days you want to update, set one time
          range, and apply it to all of them at once — or edit any day's hours individually below.
          Each day can also have more than one time window (e.g. a morning slot and an evening
          slot). Don't forget to click "Save weekly schedule" at the bottom — nothing is saved
          until you do.
        </p>


        {/* Bulk-apply bar */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-end",
            gap: 12,
            padding: 16,
            borderRadius: 6,
            marginBottom: 20,
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {DAYS.map((d) => (
              <label
                key={d.value}
                className="badge-fairy"
                style={{
                  cursor: "pointer",
                  opacity: checkedDays.has(d.value) ? 1 : 0.5,
                }}
              >
                <input
                  type="checkbox"
                  checked={checkedDays.has(d.value)}
                  onChange={() => toggleDayChecked(d.value)}
                  style={{ marginRight: 6 }}
                />
                {d.short}
              </label>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="time"
              value={bulkStart}
              onChange={(e) => setBulkStart(e.target.value)}
              style={darkInputStyle}
            />
            <span style={{ opacity: 0.5, fontSize: 13 }}>to</span>
            <input
              type="time"
              value={bulkEnd}
              onChange={(e) => setBulkEnd(e.target.value)}
              style={darkInputStyle}
            />
          </div>
          <button className="btn-ghost-fairy" onClick={applyBulkRange} disabled={checkedDays.size === 0}>
            Apply to checked days
          </button>
        </div>

        {/* Per-day editable rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {DAYS.map((d) => {
            const day = weekState.find((w) => w.day_of_week === d.value)!;
            return (
              <div
                key={d.value}
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 12,
                  padding: 12,
                  borderRadius: 6,
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <span style={{ width: 100, fontSize: 14, fontWeight: 500 }}>{d.label}</span>

                {day.windows.length === 0 && (
                  <span style={{ fontSize: 13, fontStyle: "italic", opacity: 0.4 }}>Closed</span>
                )}

                <div style={{ display: "flex", flex: 1, flexWrap: "wrap", gap: 8 }}>
                  {day.windows.map((w) => (
                    <div
                      key={w.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "4px 8px",
                        borderRadius: 4,
                        background: "rgba(255,255,255,0.04)",
                      }}
                    >
                      <input
                        type="time"
                        value={w.start_time}
                        onChange={(e) => updateWindow(d.value, w.id, "start_time", e.target.value)}
                        style={darkInputStyleSmall}
                      />
                      <span style={{ opacity: 0.4, fontSize: 12 }}>–</span>
                      <input
                        type="time"
                        value={w.end_time}
                        onChange={(e) => updateWindow(d.value, w.id, "end_time", e.target.value)}
                        style={darkInputStyleSmall}
                      />
                      <button
                        onClick={() => removeWindow(d.value, w.id)}
                        title="Remove this window"
                        style={{ marginLeft: 4, opacity: 0.4, background: "none", border: "none", cursor: "pointer" }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => addWindow(d.value)}
                  style={{ fontSize: 12, background: "none", border: "none", cursor: "pointer", opacity: 0.7 }}
                >
                  + add window
                </button>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 20 }}>
          <button
            className="btn-ghost-fairy"
            onClick={saveWeeklyPattern}
            disabled={saving || !hasUnsavedChanges}
          >
            {saving ? "Saving…" : hasUnsavedChanges ? "Save weekly schedule" : "Saved ✓"}
          </button>
        </div>
      </div>

      {/* ============ Single-day overrides ============ */}
      <div id="override-form-anchor" className="card-fairy" style={{ padding: 24, borderRadius: 6 }}>
        <p style={{ fontFamily: "var(--font-display)", fontSize: 18, marginBottom: 6 }}>
          Single-day overrides
        </p>
        <p style={{ fontSize: 15, opacity: 0.8, marginBottom: 20, lineHeight: 1.6 }}>
          Block a specific date entirely, or give one date custom hours — without touching the
          recurring weekly pattern above. Tip: click any date in the Month view above to jump
          straight here with that date pre-filled.
        </p>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-end",
            gap: 12,
            padding: 16,
            borderRadius: 6,
            marginBottom: 20,
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <div>
            <label style={{ display: "block", fontSize: 13, opacity: 0.75, marginBottom: 4, fontFamily: "var(--font-ui)" }}>Date</label>
            <input
              type="date"
              value={overrideDate}
              onChange={(e) => setOverrideDate(e.target.value)}
              style={darkInputStyle}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, opacity: 0.75, marginBottom: 4, fontFamily: "var(--font-ui)" }}>Type</label>
            <select
              value={overrideMode}
              onChange={(e) => setOverrideMode(e.target.value as any)}
              style={darkInputStyle}
            >
              <option value="full_block">Block entire day</option>
              <option value="time_override">Custom hours for this day</option>
            </select>
          </div>

          {overrideMode === "time_override" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="time"
                value={overrideStart}
                onChange={(e) => setOverrideStart(e.target.value)}
                style={darkInputStyle}
              />
              <span style={{ opacity: 0.5, fontSize: 13 }}>to</span>
              <input
                type="time"
                value={overrideEnd}
                onChange={(e) => setOverrideEnd(e.target.value)}
                style={darkInputStyle}
              />
            </div>
          )}

          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={{ display: "block", fontSize: 13, opacity: 0.75, marginBottom: 4, fontFamily: "var(--font-ui)" }}>
              Reason (optional)
            </label>
            <input
              type="text"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="e.g. travelling"
              style={{ ...darkInputStyle, width: "100%" }}
            />
          </div>

          <button className="btn-ghost-fairy" onClick={saveOverride} disabled={saving}>
            Save override
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {overrides.length === 0 && (
            <p style={{ fontSize: 14, fontStyle: "italic", opacity: 0.6 }}>No upcoming overrides.</p>
          )}
          {overrides.map((o) => (
            <div
              key={o.blocked_date}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 16px",
                borderRadius: 6,
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <div style={{ fontSize: 14 }}>
                <span style={{ fontWeight: 500 }}>{o.blocked_date}</span>{" "}
                <span style={{ opacity: 0.6 }}>
                  —{" "}
                  {o.block_type === "full_block"
                    ? "Fully blocked"
                    : `Custom hours: ${o.override_start} – ${o.override_end}`}
                </span>
                {o.reason && (
                  <span style={{ marginLeft: 8, fontSize: 13, fontStyle: "italic", opacity: 0.6 }}>
                    ({o.reason})
                  </span>
                )}
              </div>
              <button
                onClick={() => removeOverride(o.blocked_date)}
                style={{ fontSize: 13, opacity: 0.7, background: "none", border: "none", cursor: "pointer" }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}