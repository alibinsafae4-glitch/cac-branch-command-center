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
  "جديد": "جديد", "تم_التواصل": "تم التواصل", "تمت_الزيارة": "تمت الزيارة", "قيد_المتابعة": "قيد المتابعة", "قيد_التفاوض": "قيد التفاوض", "تم_الاستقطاب": "تم الاستقطاب", "غير_مهتم": "غير مهتم", "مؤجل": "مؤجل",
};

export const statusTone = (status: string) => {
  if (["تم_الاستقطاب", "تمت_المعالجة", "مغلق", "نشط", "excellent"].includes(status)) return "success";
  if (["قيد_التفاوض", "قيد_المتابعة", "قيد_التنفيذ", "متوسط", "مؤجل"].includes(status)) return "warning";
  if (["مفتوح", "حرج", "غير_مهتم", "خطر"].includes(status)) return "danger";
  return "info";
};

export const dateForInput = (value?: string | Date | null) => {
  if (!value) return businessDateKey();
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? businessDateKey() : businessDateKey(date);
};

export const roleLabels: Record<string, string> = {
  "مدير_النظام": "مدير النظام",
  "الإدارة_العليا": "الإدارة العليا",
  "تطوير_الأعمال": "تطوير الأعمال",
  "توكيد_الجودة": "توكيد الجودة",
  "مدير_الفرع": "مدير الفرع",
  "موظف_الفرع": "موظف الفرع",
};
