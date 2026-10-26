import { describe, expect, it } from "vitest";
import { ADEN_SQUARES } from "./adenSquares";

describe("مربعات فروع عدن المعتمدة", () => {
  it("تضم خمسة عشر مربعاً مرقمة من 1 إلى 15", () => {
    expect(ADEN_SQUARES.map((s) => s.number)).toEqual(
      Array.from({ length: 15 }, (_, i) => i + 1),
    );
  });

  it("كل مضلع مغلق وله ثلاث نقاط مختلفة على الأقل", () => {
    for (const s of ADEN_SQUARES) {
      const first = s.polygon[0];
      const last = s.polygon[s.polygon.length - 1];
      expect(first).toEqual(last);
      expect(s.polygon.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("الإحداثيات داخل نطاق عدن التقريبي", () => {
    for (const s of ADEN_SQUARES) {
      for (const [lat, lng] of s.polygon) {
        expect(lat).toBeGreaterThan(12.7);
        expect(lat).toBeLessThan(13.0);
        expect(lng).toBeGreaterThan(44.8);
        expect(lng).toBeLessThan(45.1);
      }
    }
  });

  it("لكل مربع فرع مسؤول وقطاع وموقع", () => {
    for (const s of ADEN_SQUARES) {
      expect(s.responsibleBranch).toBeTruthy();
      expect(s.sector).toBeTruthy();
      expect(s.location).toBeTruthy();
    }
  });
});
