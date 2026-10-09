import { describe, expect, it } from "vitest";
import type { User } from "../drizzle/schema";
import { assertActive, assertBranchRead, assertBranchWrite, branchScope, canReadProspects, canReadQualityDetails, canReadVisits } from "./access";

const appUser = (appRole: string, assignedBranchId: number | null = 12, systemRole: "مستخدم" | "مدير" = "مستخدم") => ({
  id: 5,
  role: systemRole,
  appRole,
  assignedBranchId,
} as unknown as User);

describe("branch access controls", () => {
  it("limits branch managers to reads and supported writes in their assigned branch", () => {
    const manager = appUser("مدير_الفرع");
    expect(branchScope(manager)).toBe(12);
    expect(() => assertBranchRead(manager, 12)).not.toThrow();
    expect(() => assertBranchRead(manager, 13)).toThrow();
    expect(() => assertBranchWrite(manager, 12, "branch")).not.toThrow();
    expect(() => assertBranchWrite(manager, 13, "branch")).toThrow();
    expect(() => assertBranchWrite(manager, 12, "target")).toThrow();
  });

  it("limits branch employees to their own branch and prospect, visit, and report writes", () => {
    const employee = appUser("موظف_الفرع");
    expect(() => assertBranchRead(employee, 12)).not.toThrow();
    expect(() => assertBranchRead(employee, 13)).toThrow();
    expect(() => assertBranchWrite(employee, 12, "prospect")).not.toThrow();
    expect(() => assertBranchWrite(employee, 12, "visit")).not.toThrow();
    expect(() => assertBranchWrite(employee, 12, "report")).not.toThrow();
    expect(() => assertBranchWrite(employee, 12, "quality")).toThrow();
  });

  it("keeps organization-wide reads separate from business-development write privileges", () => {
    const businessDevelopment = appUser("تطوير_الأعمال");
    expect(branchScope(businessDevelopment)).toBeUndefined();
    expect(() => assertBranchRead(businessDevelopment, 99)).not.toThrow();
    expect(() => assertBranchWrite(businessDevelopment, 99, "prospect")).not.toThrow();
    expect(() => assertBranchWrite(businessDevelopment, 99, "target")).toThrow();
  });

  it("recognizes the platform owner/admin as the super administrator", () => {
    const owner = appUser("موظف_الفرع", 12, "مدير");
    expect(() => assertBranchRead(owner, 999)).not.toThrow();
    expect(() => assertBranchWrite(owner, 999, "target")).not.toThrow();
  });

  it("blocks inactive sessions and limits record-detail readers to the required roles", () => {
    const inactive = { ...appUser("موظف_الفرع"), isActive: 0 } as unknown as User;
    expect(() => assertActive(inactive)).toThrow();
    expect(() => assertActive(appUser("موظف_الفرع"))).not.toThrow();
    expect(canReadProspects(appUser("الإدارة_العليا"))).toBe(false);
    expect(canReadVisits(appUser("توكيد_الجودة"))).toBe(true);
    expect(canReadVisits(appUser("الإدارة_العليا"))).toBe(false);
    expect(canReadQualityDetails(appUser("الإدارة_العليا"))).toBe(false);
  });
});
