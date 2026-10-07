import { BUSINESS_TIME_ZONE, businessDateKey } from "../../../shared/date";

export const formatNumber = (value: number | string | null | undefined, compact = false) => {
  const number = Number(value ?? 0);
  return new Intl.NumberFormat("ar-YE", compact ? { notation: "compact", maximumFractionDigits: 1 } : { maximumFractionDigits: 0 }).format(Number.isFinite(number) ? number : 0);
};

export const formatMoney = (value: number | string | null | undefined) => {
  const number = Number(value ?? 0);
  return `${formatNumber(number, true)} ر.ي`;
};

export const formatPercent = (value: number | string | null | undefined) => `${formatNumber(Number(value ?? 0), false)}٪`;

export const toArabicDate = (value?: string | Date | null) => {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("ar-YE", { day: "numeric", month: "short", year: "numeric", timeZone: BUSINESS_TIME_ZONE }).format(date);
};

export const metricNames: Record<string, string> = {
  new_customers: "العملاء الجدد",
  individual_accounts: "حسابات الأفراد",
  company_accounts: "حسابات الشركات",
  organization_accounts: "حسابات المنظمات",
  government_accounts: "الحسابات الحكومية",
  deposits: "الودائع الجديدة",
  financing: "التمويلات",
  cards: "البطاقات",
  cac_fast: "CAC Fast",
  digital_services: "الخدمات الرقمية",
  visits: "الزيارات الميدانية",
  meetings: "الاجتماعات",
  calls: "الاتصالات",
  prospects: "العملاء المحتملون",
  new_opportunities: "الفرص الجديدة المبلّغ عنها",
  converted: "العملاء المستقطبون",
};

export const prospectStatusLabels: Record<string, string> = {
  new: "جديد", contacted: "تم التواصل", visited: "تمت الزيارة", following_up: "قيد المتابعة", negotiation: "قيد التفاوض", converted: "تم الاستقطاب", not_interested: "غير مهتم", deferred: "مؤجل",
};

export const statusTone = (status: string) => {
  if (["converted", "resolved", "closed", "active", "excellent"].includes(status)) return "success";
  if (["negotiation", "following_up", "in_progress", "medium", "deferred"].includes(status)) return "warning";
  if (["open", "critical", "not_interested", "danger"].includes(status)) return "danger";
  return "info";
};

export const dateForInput = (value?: string | Date | null) => {
  if (!value) return businessDateKey();
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? businessDateKey() : businessDateKey(date);
};

export const roleLabels: Record<string, string> = {
  super_admin: "مدير النظام",
  executive: "الإدارة العليا",
  business_development: "تطوير الأعمال",
  quality: "توكيد الجودة",
  branch_manager: "مدير الفرع",
  branch_employee: "موظف الفرع",
};
