import { describe, expect, it } from "vitest";
import { businessDateKey, businessDateTimeLocal, businessDayEndUtc, businessDayStartUtc, businessLocalDateTimeToIso, businessMonthKey } from "./date";

describe("business timezone date helpers", () => {
  it("moves late UTC dates to the next Aden calendar day", () => {
    const now = new Date("2026-10-07T21:30:00.000Z");
    expect(businessDateKey(now)).toBe("2026-10-08");
    expect(businessMonthKey(now)).toBe("2026-10");
  });

  it("uses Aden wall-clock time for datetime-local controls", () => {
    expect(businessDateTimeLocal(new Date("2026-10-07T19:30:00.000Z"))).toBe("2026-10-07T22:30");
  });

  it("maps the complete Aden business day to the corresponding UTC instants", () => {
    expect(businessDayStartUtc("2026-10-07")?.toISOString()).toBe("2026-10-06T21:00:00.000Z");
    expect(businessDayEndUtc("2026-10-07")?.toISOString()).toBe("2026-10-07T20:59:59.999Z");
    expect(businessDayStartUtc("invalid")).toBeNull();
  });

  it("converts valid Aden wall time to UTC and rejects invalid calendar values", () => {
    expect(businessLocalDateTimeToIso("2026-10-07T02:00")).toBe("2026-10-06T23:00:00.000Z");
    expect(businessLocalDateTimeToIso("2026-10-07T04:15")).toBe("2026-10-07T01:15:00.000Z");
    expect(businessLocalDateTimeToIso("2026-02-30T10:00")).toBeNull();
    expect(businessLocalDateTimeToIso("invalid")).toBeNull();
  });
});
