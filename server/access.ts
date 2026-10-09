import { TRPCError } from "@trpc/server";
import type { User } from "../drizzle/schema";

export type AppRole = User["appRole"];

export const appRoleCodes = {
  superAdmin: "مدير_النظام",
  executive: "الإدارة_العليا",
  businessDevelopment: "تطوير_الأعمال",
  quality: "توكيد_الجودة",
  branchManager: "مدير_الفرع",
  branchEmployee: "موظف_الفرع",
} as const satisfies Record<string, AppRole>;

export const roleLabels: Record<AppRole, string> = {
  [appRoleCodes.superAdmin]: "مدير النظام",
  [appRoleCodes.executive]: "الإدارة العليا",
  [appRoleCodes.businessDevelopment]: "تطوير الأعمال",
  [appRoleCodes.quality]: "توكيد الجودة",
  [appRoleCodes.branchManager]: "مدير الفرع",
  [appRoleCodes.branchEmployee]: "موظف الفرع",
};

export const prospectReadRoles: readonly AppRole[] = [appRoleCodes.superAdmin, appRoleCodes.businessDevelopment, appRoleCodes.branchManager, appRoleCodes.branchEmployee];
export const visitReadRoles: readonly AppRole[] = [appRoleCodes.superAdmin, appRoleCodes.businessDevelopment, appRoleCodes.quality, appRoleCodes.branchManager, appRoleCodes.branchEmployee];
export const qualityReadRoles: readonly AppRole[] = [appRoleCodes.superAdmin, appRoleCodes.quality, appRoleCodes.branchManager];

export function canReadProspects(user: User) { return prospectReadRoles.includes(roleOf(user)); }
export function canReadVisits(user: User) { return visitReadRoles.includes(roleOf(user)); }
export function canReadQualityDetails(user: User) { return qualityReadRoles.includes(roleOf(user)); }

export function assertActive(user: User) {
  if (Number(user.isActive) === 0) throw new TRPCError({ code: "FORBIDDEN", message: "هذا الحساب غير مفعّل؛ تواصل مع مدير النظام." });
}

export function roleOf(user: User): AppRole {
  if (user.role === "مدير") return appRoleCodes.superAdmin;
  return user.appRole;
}

export function requireRoles(user: User, allowed: readonly AppRole[]) {
  if (!allowed.includes(roleOf(user))) {
    throw new TRPCError({ code: "FORBIDDEN", message: "ليست لديك صلاحية لتنفيذ هذا الإجراء." });
  }
}

export function assertBranchRead(user: User, branchId?: number) {
  const role = roleOf(user);
  const allBranchReaders: AppRole[] = [appRoleCodes.superAdmin, appRoleCodes.executive, appRoleCodes.businessDevelopment, appRoleCodes.quality];
  if (allBranchReaders.includes(role)) return;
  if (!branchId || !user.assignedBranchId || branchId !== user.assignedBranchId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكنك الوصول إلى بيانات هذا الفرع." });
  }
}

export function assertBranchWrite(user: User, branchId: number, domain: "branch" | "prospect" | "visit" | "report" | "quality" | "target" | "square") {
  const role = roleOf(user);
  if (role === appRoleCodes.superAdmin) return;
  if (role === appRoleCodes.branchManager && user.assignedBranchId === branchId && ["branch", "prospect", "visit", "report", "quality"].includes(domain)) return;
  if (role === appRoleCodes.businessDevelopment && ["prospect", "visit"].includes(domain)) return;
  if (role === appRoleCodes.quality && domain === "quality") return;
  if (role === appRoleCodes.branchEmployee && user.assignedBranchId === branchId && ["prospect", "visit", "report"].includes(domain)) return;
  throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية التعديل في هذا النطاق." });
}

export function branchScope(user: User): number | undefined {
  const role = roleOf(user);
  const allBranchReaders: readonly AppRole[] = [appRoleCodes.superAdmin, appRoleCodes.executive, appRoleCodes.businessDevelopment, appRoleCodes.quality];
  if (allBranchReaders.includes(role)) return undefined;
  return user.assignedBranchId ?? -1;
}
