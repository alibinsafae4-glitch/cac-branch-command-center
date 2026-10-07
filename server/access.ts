import { TRPCError } from "@trpc/server";
import type { User } from "../drizzle/schema";

export type AppRole = "super_admin" | "executive" | "business_development" | "quality" | "branch_manager" | "branch_employee";
export const roleLabels: Record<AppRole, string> = {
  super_admin: "مدير النظام",
  executive: "الإدارة العليا",
  business_development: "تطوير الأعمال",
  quality: "توكيد الجودة",
  branch_manager: "مدير الفرع",
  branch_employee: "موظف الفرع",
};

export const prospectReadRoles: readonly AppRole[] = ["super_admin", "business_development", "branch_manager", "branch_employee"];
export const visitReadRoles: readonly AppRole[] = ["super_admin", "business_development", "quality", "branch_manager", "branch_employee"];
export const qualityReadRoles: readonly AppRole[] = ["super_admin", "quality", "branch_manager"];

export function canReadProspects(user: User) { return prospectReadRoles.includes(roleOf(user)); }
export function canReadVisits(user: User) { return visitReadRoles.includes(roleOf(user)); }
export function canReadQualityDetails(user: User) { return qualityReadRoles.includes(roleOf(user)); }

export function assertActive(user: User) {
  if (Number(user.isActive) === 0) throw new TRPCError({ code: "FORBIDDEN", message: "هذا الحساب غير مفعّل؛ تواصل مع مدير النظام." });
}

export function roleOf(user: User): AppRole {
  if (user.role === "admin") return "super_admin";
  return user.appRole as AppRole;
}

export function requireRoles(user: User, allowed: readonly AppRole[]) {
  if (!allowed.includes(roleOf(user))) {
    throw new TRPCError({ code: "FORBIDDEN", message: "ليست لديك صلاحية لتنفيذ هذا الإجراء." });
  }
}

export function assertBranchRead(user: User, branchId?: number) {
  const role = roleOf(user);
  const allBranchReaders: AppRole[] = ["super_admin", "executive", "business_development", "quality"];
  if (allBranchReaders.includes(role)) return;
  if (!branchId || !user.assignedBranchId || branchId !== user.assignedBranchId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكنك الوصول إلى بيانات هذا الفرع." });
  }
}

export function assertBranchWrite(user: User, branchId: number, domain: "branch" | "prospect" | "visit" | "report" | "quality" | "target" | "square") {
  const role = roleOf(user);
  if (role === "super_admin") return;
  if (role === "branch_manager" && user.assignedBranchId === branchId && ["branch", "prospect", "visit", "report", "quality"].includes(domain)) return;
  if (role === "business_development" && ["prospect", "visit"].includes(domain)) return;
  if (role === "quality" && domain === "quality") return;
  if (role === "branch_employee" && user.assignedBranchId === branchId && ["prospect", "visit", "report"].includes(domain)) return;
  throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية التعديل في هذا النطاق." });
}

export function branchScope(user: User): number | undefined {
  const role = roleOf(user);
  if (["super_admin", "executive", "business_development", "quality"].includes(role)) return undefined;
  return user.assignedBranchId ?? -1;
}
