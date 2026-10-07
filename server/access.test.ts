import { describe, expect, it } from "vitest";
import type { User } from "../drizzle/schema";
import { assertActive, assertBranchRead, assertBranchWrite, branchScope, canReadProspects, canReadQualityDetails, canReadVisits } from "./access";

const appUser = (appRole: string, assignedBranchId: number | null = 12, systemRole: "user" | "admin" = "user") => ({
  id: 5,
  role: systemRole,
  appRole,
  assignedBranchId,
} as unknown as User);

describe("branch access controls", () => {
  it("limits branch managers to reads and supported writes in their assigned branch", () => {
    const manager = appUser("branch_manager");
    expect(branchScope(manager)).toBe(12);
    expect(() => assertBranchRead(manager, 12)).not.toThrow();
    expect(() => assertBranchRead(manager, 13)).toThrow();
    expect(() => assertBranchWrite(manager, 12, "branch")).not.toThrow();
    expect(() => assertBranchWrite(manager, 13, "branch")).toThrow();
    expect(() => assertBranchWrite(manager, 12, "target")).toThrow();
  });

  it("limits branch employees to their own branch and prospect, visit, and report writes", () => {
    const employee = appUser("branch_employee");
    expect(() => assertBranchRead(employee, 12)).not.toThrow();
    expect(() => assertBranchRead(employee, 13)).toThrow();
    expect(() => assertBranchWrite(employee, 12, "prospect")).not.toThrow();
    expect(() => assertBranchWrite(employee, 12, "visit")).not.toThrow();
    expect(() => assertBranchWrite(employee, 12, "report")).not.toThrow();
    expect(() => assertBranchWrite(employee, 12, "quality")).toThrow();
  });

  it("keeps organization-wide reads separate from business-development write privileges", () => {
    const businessDevelopment = appUser("business_development");
    expect(branchScope(businessDevelopment)).toBeUndefined();
    expect(() => assertBranchRead(businessDevelopment, 99)).not.toThrow();
    expect(() => assertBranchWrite(businessDevelopment, 99, "prospect")).not.toThrow();
    expect(() => assertBranchWrite(businessDevelopment, 99, "target")).toThrow();
  });

  it("recognizes the platform owner/admin as the super administrator", () => {
    const owner = appUser("branch_employee", 12, "admin");
    expect(() => assertBranchRead(owner, 999)).not.toThrow();
    expect(() => assertBranchWrite(owner, 999, "target")).not.toThrow();
  });

  it("blocks inactive sessions and limits record-detail readers to the required roles", () => {
    const inactive = { ...appUser("branch_employee"), isActive: 0 } as unknown as User;
    expect(() => assertActive(inactive)).toThrow();
    expect(() => assertActive(appUser("branch_employee"))).not.toThrow();
    expect(canReadProspects(appUser("executive"))).toBe(false);
    expect(canReadVisits(appUser("quality"))).toBe(true);
    expect(canReadVisits(appUser("executive"))).toBe(false);
    expect(canReadQualityDetails(appUser("executive"))).toBe(false);
  });
});
