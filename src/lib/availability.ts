// Availability rules — see SYSTEM.md Section 3
// Mon-Fri: 9 PM - 11 PM | Sat-Sun: 11 AM - 7 PM
// Hardcoded for now; admin-editable calendar is a future phase, not v1.
// 30-minute buffer is enforced here (backend), never shown on frontend.

const SLOT_MINUTES = 30;

interface DayWindow {
  startHour: number;
  endHour: number;
}

function getWindowForDay(dayOfWeek: number): DayWindow | null {
  // 0 = Sunday, 6 = Saturday
  if (dayOfWeek === 0 || dayOfWeek === 6) return { startHour: 11, endHour: 19 }; // 11 AM - 7 PM
  if (dayOfWeek >= 1 && dayOfWeek <= 5) return { startHour: 21, endHour: 23 }; // 9 PM - 11 PM
  return null;
}

export function generateSlotsForDate(date: Date): { start: Date; end: Date }[] {
  const window = getWindowForDay(date.getDay());
  if (!window) return [];

  const slots: { start: Date; end: Date }[] = [];
  const start = new Date(date);
  start.setHours(window.startHour, 0, 0, 0);
  const end = new Date(date);
  end.setHours(window.endHour, 0, 0, 0);

  let cursor = new Date(start);
  while (cursor < end) {
    const slotEnd = new Date(cursor.getTime() + SLOT_MINUTES * 60000);
    if (slotEnd > end) break;
    slots.push({ start: new Date(cursor), end: slotEnd });
    cursor = slotEnd;
  }
  return slots;
}

// Filters out slots that overlap any existing booking (with buffer already
// baked in, since every booking occupies a full 30-min block).
export function filterAvailableSlots(
  allSlots: { start: Date; end: Date }[],
  existingBookings: { slot_start: string; slot_end: string }[]
) {
  return allSlots.filter((slot) => {
    return !existingBookings.some((b) => {
      const bStart = new Date(b.slot_start).getTime();
      const bEnd = new Date(b.slot_end).getTime();
      return slot.start.getTime() < bEnd && slot.end.getTime() > bStart;
    });
  });
}
