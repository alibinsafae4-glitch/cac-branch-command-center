export const BUSINESS_TIME_ZONE = "Asia/Aden";

function partsAtBusinessTime(date: Date) {
  const values = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date).map(part => [part.type, part.value]));
  return values as Record<string, string>;
}

/** Returns a YYYY-MM-DD calendar day in the application's business timezone (Aden). */
export function businessDateKey(date: Date = new Date()): string {
  const parts = partsAtBusinessTime(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** Returns a YYYY-MM key in the application's business timezone (Aden). */
export function businessMonthKey(date: Date = new Date()): string {
  return businessDateKey(date).slice(0, 7);
}

/** Returns the UTC instant corresponding to midnight at the start of a business calendar day. */
export function businessDayStartUtc(dayKey: string): Date | null {
  const iso = businessLocalDateTimeToIso(`${dayKey}T00:00`);
  return iso ? new Date(iso) : null;
}

/** Returns the last millisecond of a business calendar day as a UTC instant. */
export function businessDayEndUtc(dayKey: string): Date | null {
  const start = businessDayStartUtc(dayKey);
  return start ? new Date(start.getTime() + 86_400_000 - 1) : null;
}

/** Returns a value suitable for an HTML datetime-local input in Aden time. */
export function businessDateTimeLocal(date: Date = new Date()): string {
  const parts = partsAtBusinessTime(date);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/**
 * Converts a datetime-local wall-clock value in Asia/Aden (UTC+03:00) into ISO UTC.
 * Aden does not observe daylight-saving time; strict component validation rejects invalid input.
 */
export function businessLocalDateTimeToIso(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) return null;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText = "0"] = match;
  const wall = new Date(0);
  wall.setUTCFullYear(Number(yearText), Number(monthText) - 1, Number(dayText));
  wall.setUTCHours(Number(hourText), Number(minuteText), Number(secondText), 0);
  if (wall.getUTCFullYear() !== Number(yearText) || wall.getUTCMonth() !== Number(monthText) - 1 || wall.getUTCDate() !== Number(dayText) || wall.getUTCHours() !== Number(hourText) || wall.getUTCMinutes() !== Number(minuteText) || wall.getUTCSeconds() !== Number(secondText)) return null;
  return new Date(wall.getTime() - 3 * 60 * 60 * 1000).toISOString();
}
