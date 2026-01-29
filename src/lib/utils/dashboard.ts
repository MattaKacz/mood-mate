import type { MoodEntryListItemDTO, TrendDirection } from "@/types";

const TREND_THRESHOLD = 0.4;

export function calculateTrend(entries: MoodEntryListItemDTO[]): { direction: TrendDirection; delta: number } {
  if (entries.length < 2) {
    return { direction: "steady", delta: 0 };
  }

  const latest = entries[0].score;
  const oldest = entries[entries.length - 1].score;
  const delta = parseFloat((latest - oldest).toFixed(2));

  if (delta > TREND_THRESHOLD) {
    return { direction: "up", delta };
  }

  if (delta < -TREND_THRESHOLD) {
    return { direction: "down", delta };
  }

  return { direction: "steady", delta };
}

export function calculateStreak(entries: MoodEntryListItemDTO[], timezone?: string): number {
  if (entries.length === 0) {
    return 0;
  }

  const dayKeys = new Set(entries.map((entry) => getDayKey(entry.createdAt, timezone)));

  let streak = 0;
  const now = new Date();

  for (let offset = 0; offset < 30; offset += 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - offset);
    const key = getDayKey(date, timezone);
    if (dayKeys.has(key)) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
}

export function evaluateRitualDue(ritualTime: string, timezone?: string): { label: string; isDue: boolean } {
  const [hoursStr, minutesStr] = ritualTime.split(":");
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return { label: ritualTime, isDue: false };
  }

  const now = getDateInTimezone(new Date(), timezone);
  const ritualDate = new Date(now);
  if (timezone) {
    ritualDate.setUTCHours(hours, minutes, 0, 0);
  } else {
    ritualDate.setHours(hours, minutes, 0, 0);
  }

  const isDue = now.getTime() >= ritualDate.getTime();

  const formatter = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone ?? undefined,
  });

  return {
    label: formatter.format(ritualDate),
    isDue,
  };
}

export function getDayKey(dateInput: string | Date, timezone?: string): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (!timezone) {
    return date.toISOString().slice(0, 10);
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}

export function getDateInTimezone(date: Date, timezone?: string): Date {
  if (!timezone) {
    return date;
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  const second = parts.find((part) => part.type === "second")?.value ?? "00";

  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
}
