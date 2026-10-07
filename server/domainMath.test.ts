import { describe, expect, it } from "vitest";
import { endOfUtcDay, isCompleteBranchScoreWeights, isValidISODate, normalizeBranchScoreWeights, previousComparablePeriod, sevenDayPeriodEnd } from "./domainMath";

describe("business date and score math", () => {
  it("accepts real ISO calendar days and rejects malformed or impossible days", () => {
    expect(isValidISODate("2026-10-07")).toBe(true);
    expect(isValidISODate("2024-02-29")).toBe(true);
    expect(isValidISODate("2026-02-29")).toBe(false);
    expect(isValidISODate("2026-02-30")).toBe(false);
    expect(isValidISODate("2026-2-07")).toBe(false);
    expect(isValidISODate("2026-10-07T12:00:00Z")).toBe(false);
  });

  it("preserves date-only boundaries and the same comparison-window length", () => {
    expect(endOfUtcDay("2026-10-07").toISOString()).toBe("2026-10-07T23:59:59.999Z");
    const previous = previousComparablePeriod(new Date("2026-10-05T00:00:00.000Z"), new Date("2026-10-07T00:00:00.000Z"));
    expect(previous.start.toISOString()).toBe("2026-10-02T00:00:00.000Z");
    expect(previous.end.toISOString()).toBe("2026-10-04T00:00:00.000Z");
  });

  it("limits old weekly starts to seven days and caps an in-progress week at today", () => {
    expect(sevenDayPeriodEnd(new Date("2026-09-14T00:00:00.000Z"), new Date("2026-10-07T00:00:00.000Z")).toISOString()).toBe("2026-09-20T00:00:00.000Z");
    expect(sevenDayPeriodEnd(new Date("2026-10-05T00:00:00.000Z"), new Date("2026-10-07T00:00:00.000Z")).toISOString()).toBe("2026-10-07T00:00:00.000Z");
  });

  it("maps legacy digital weights to the canonical key and prefers a saved canonical value", () => {
    expect(normalizeBranchScoreWeights([{ metricCode: "digital", weightPercent: 14 }]).get("digital_services")).toBe(14);
    expect(normalizeBranchScoreWeights([
      { metricCode: "digital", weightPercent: 10 },
      { metricCode: "digital_services", weightPercent: 17 },
    ]).get("digital_services")).toBe(17);
  });

  it("requires each of the seven unique Branch Score categories and a total of 100", () => {
    const valid = [
      { metricCode: "commercial", weightPercent: 30 }, { metricCode: "acquisition", weightPercent: 20 },
      { metricCode: "deposits", weightPercent: 15 }, { metricCode: "field_activity", weightPercent: 10 },
      { metricCode: "digital_services", weightPercent: 10 }, { metricCode: "quality", weightPercent: 10 },
      { metricCode: "compliance", weightPercent: 5 },
    ];
    expect(isCompleteBranchScoreWeights(valid)).toBe(true);
    expect(isCompleteBranchScoreWeights([...valid.slice(0, 6), { ...valid[5], weightPercent: 15 }])).toBe(false);
    expect(isCompleteBranchScoreWeights(valid.map((row, index) => index === 0 ? { ...row, weightPercent: 29 } : row))).toBe(false);
  });
});
