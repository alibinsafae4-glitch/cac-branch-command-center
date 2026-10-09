import { trpc } from "@/lib/trpc";
import { formatNumber, toArabicDate } from "@/lib/domain";
import { AppButton, EmptyState, Modal, PageHeading, Panel, SelectField, TextAreaField, TextField } from "@/components/Blocks";
import { useAuth } from "@/_core/hooks/useAuth";
import { Download, FileBarChart2, Printer, RefreshCw, Send, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { exportExcel, printReport } from "@/lib/export";
import { businessDateKey, businessMonthKey } from "../../../shared/date";

const reportTypes = [["يومي", "اليومي"], ["أسبوعي", "الأسبوعي"], ["شهري", "الشهري"], ["branches", "الفروع"], ["squares", "المربعات"], ["visits", "الزيارات"], ["prospects", "العملاء المحتملون"], ["توكيد_الجودة", "الجودة"], ["complaints", "الشكاوى"], ["targets", "المستهدفات"], ["الإدارة_العليا", "التنفيذي"]] as const;
const fields = [["individualAccounts", "حسابات أفراد"], ["companyAccounts", "حسابات شركات"], ["organizationAccounts", "حسابات منظمات"], ["governmentAccounts", "حسابات حكومية"], ["cacFast", "CAC Fast"], ["cards", "البطاقات"], ["transfers", "الحوالات"], ["digitalServices", "الخدمات الرقمية"], ["visitsCount", "الزيارات"], ["meetingsCount", "الاجتماعات"], ["callsCount", "الاتصالات"], ["newCustomers", "العملاء الجدد"], ["newOpportunities", "الفرص الجديدة"], ["followups", "المتابعات"]] as const;
type DailyForm = { branchId: number; reportDate: string; status: "مسودة" | "مرسل"; obstacles: string; needs: string } & Record<(typeof fields)[number][0], number>;
const newDaily = (branchId = 0): DailyForm => ({ branchId, reportDate: businessDateKey(), status: "مرسل", obstacles: "", needs: "", individualAccounts: 0, companyAccounts: 0, organizationAccounts: 0, governmentAccounts: 0, cacFast: 0, cards: 0, transfers: 0, digitalServices: 0, visitsCount: 0, meetingsCount: 0, callsCount: 0, newCustomers: 0, newOpportunities: 0, followups: 0 });
const mondayStart = () => { const date = new Date(`${businessDateKey()}T00:00:00.000Z`); date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7)); return date.toISOString().slice(0, 10); };
const currentMonth = () => businessMonthKey();
const objectValue = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
function weeklyReportRow(report: { title: string; periodStart: Date | string; periodEnd: Date | string; reportData: unknown }): Record<string, unknown> {
  const data = objectValue(report.reportData);
  const comparison = objectValue(data.comparison);
  const activity = objectValue(data.fieldActivity);
  const current = objectValue(data.currentTotals);
  const previous = objectValue(data.previousTotals);
  const listMetrics = (metrics: Record<string, unknown>) => Object.entries(metrics).map(([key, value]) => `${key}: ${value}`).join(" | ");
  return {
    العنوان: report.title,
    الفترة: `${toArabicDate(report.periodStart)} — ${toArabicDate(report.periodEnd)}`,
    الملخص_التنفيذي: data.summary ?? "",
    العملاء_الجدد: data.newCustomers ?? 0,
    نمو_العملاء: `${comparison.newCustomersGrowthPercent ?? 0}%`,
    الحسابات_الجديدة: data.newAccounts ?? 0,
    نمو_الحسابات: `${comparison.accountGrowthPercent ?? 0}%`,
    الودائع: data.deposits ?? 0,
    التمويلات: data.financing ?? 0,
    المستهدف_الأسبوعي: data.weeklyTarget ?? 0,
    أساس_المستهدف: data.targetBasis ?? "",
    الإنجاز: `${comparison.achievementPercent ?? 0}%`,
    الزيارات: data.visits ?? 0,
    الاجتماعات: activity.meetings ?? 0,
    الاتصالات: activity.calls ?? 0,
    العملاء_المحتملون: data.newProspects ?? 0,
    المستقطبون: data.converted ?? 0,
    معدل_التحويل: `${data.conversionRatePercent ?? 0}%`,
    المعوقات: data.obstacles ?? "",
    الاحتياجات: data.needs ?? "",
    الإجراءات_المطلوبة: data.actions ?? "",
    خطة_الأسبوع_القادم: data.nextWeekPlan ?? "",
    المؤشرات_الحالية: listMetrics(current),
    مؤشرات_الفترة_السابقة: listMetrics(previous),
    بيانات_تجريبية: data.demoData ? "نعم" : "",
  };
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [active, setActive] = useState<(typeof reportTypes)[number][0]>("يومي");
  const appRole = user?.role === "مدير" ? "مدير_النظام" : user?.appRole ?? "موظف_الفرع";
  const canReadProspects = ["مدير_النظام", "تطوير_الأعمال", "مدير_الفرع", "موظف_الفرع"].includes(appRole);
  const canReadVisits = ["مدير_النظام", "تطوير_الأعمال", "توكيد_الجودة", "مدير_الفرع", "موظف_الفرع"].includes(appRole);
  const canReadQuality = ["مدير_النظام", "توكيد_الجودة", "مدير_الفرع"].includes(appRole);
  const availableReportTypes = reportTypes.filter(([key]) => (key !== "prospects" || canReadProspects) && (key !== "visits" || canReadVisits) && (!(["توكيد_الجودة", "complaints"] as string[]).includes(key) || canReadQuality));
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState("");
  const [weekStart, setWeekStart] = useState(mondayStart);
  const [month, setMonth] = useState(currentMonth);
  const monthIsFuture = month > currentMonth();
  const weekEnd = useMemo(() => {
    const start = new Date(`${weekStart}T00:00:00.000Z`);
    const today = new Date(`${businessDateKey()}T00:00:00.000Z`);
    if (Number.isNaN(start.getTime()) || start > today) return "—";
    return new Date(Math.min(start.getTime() + 6 * 86_400_000, today.getTime())).toISOString().slice(0, 10);
  }, [weekStart]);
  const [dailyForm, setDailyForm] = useState(newDaily(user?.assignedBranchId ?? 0));
  const branches = trpc.business.branches.list.useQuery();
  const dashboard = trpc.business.dashboard.summary.useQuery();
  const squares = trpc.business.squares.list.useQuery();
  const prospects = trpc.business.prospects.list.useQuery({ search: search || undefined }, { enabled: canReadProspects });
  const visits = trpc.business.visits.list.useQuery(undefined, { enabled: canReadVisits });
  const daily = trpc.business.dailyReports.list.useQuery();
  const targets = trpc.business.targets.list.useQuery();
  const quality = trpc.business.quality.overview.useQuery(undefined, { enabled: canReadQuality });
  const reports = trpc.business.reports.list.useQuery();
  const monthly = trpc.business.reports.monthly.useQuery({ month }, { enabled: active === "شهري" && !monthIsFuture });
  const utils = trpc.useUtils();
  const saveDaily = trpc.business.dailyReports.save.useMutation({ onSuccess: () => { void utils.business.dailyReports.list.invalidate(); void utils.business.dashboard.summary.invalidate(); void utils.business.dashboard.trend.invalidate(); void utils.business.alerts.list.invalidate(); setModal(false); } });
  const makeWeekly = trpc.business.reports.weekly.useMutation({ onSuccess: () => void utils.business.reports.list.invalidate() });
  const branchName = (id: number) => branches.data?.find(item => item.id === id)?.nameAr ?? `فرع ${id}`;
  const canSubmitDaily = user?.role === "مدير" || ["مدير_النظام", "مدير_الفرع", "موظف_الفرع"].includes(user?.appRole ?? "");
  const reportData = useMemo((): Array<Record<string, unknown>> => {
    if (active === "شهري") return (monthly.data ?? []).map(row => ({ الفرع: row.branch, الفترة: toArabicDate(row.period), العملاء_الجدد: row.customers, الحسابات_الجديدة: row.accounts, الودائع: row.deposits, التمويلات: row.financing, الزيارات: row.visits, المستهدف: row.target, الإنجاز: `${row.achievement.toFixed(1)}%` }));
    if (active === "أسبوعي") return (reports.data ?? []).filter(row => row.reportType === "أسبوعي").map(weeklyReportRow);
    if (active === "يومي") return (daily.data ?? []).map(row => ({ الفرع: branchName(row.branchId), التاريخ: toArabicDate(row.reportDate), حسابات_أفراد: row.individualAccounts, حسابات_شركات: row.companyAccounts, حسابات_منظمات: row.organizationAccounts, حسابات_حكومية: row.governmentAccounts, CAC_Fast: row.cacFast, بطاقات: row.cards, حوالات: row.transfers, خدمات_رقمية: row.digitalServices, زيارات: row.visitsCount, اجتماعات: row.meetingsCount, اتصالات: row.callsCount, عملاء_جدد: row.newCustomers, فرص: row.newOpportunities, متابعات: row.followups, الحالة: row.status === "مرسل" ? "مُرسل" : "مسودة" }));
    if (active === "branches" || active === "الإدارة_العليا") return (dashboard.data?.branches ?? []).map((row, i) => ({ الترتيب: i + 1, الفرع: row.nameAr, المستهدف: row.target, الفعلي: row.actual, الإنجاز: `${row.achievement.toFixed(1)}%`, النمو: `${row.growth.toFixed(1)}%`, التقييم: row.rating, عملاء_محتملون: row.prospectsCount, زيارات: row.visitsCount, شكاوى_مفتوحة: row.complaintsCount }));
    if (active === "squares") return (squares.data ?? []).map(row => ({ المربع: row.name, المنطقة: row.region, الجهات: row.entitiesCount, الشركات: row.companiesCount, المنظمات: row.organizationsCount, التجار: row.merchantsCount, العملاء_المحتملون: row.prospectsCount, الزيارات: row.visitsCount, الإنجاز: `${row.achievement}%` }));
    if (active === "visits") return (visits.data ?? []).map(row => ({ الجهة: row.agencyName, النوع: row.agencyType, الفرع: branchName(row.branchId), التاريخ: toArabicDate(row.visitAt), نوع_الزيارة: row.visitType, النتيجة: row.result, الفرص: row.opportunities, المتابعة: toArabicDate(row.nextFollowupAt) }));
    if (active === "prospects") return (prospects.data ?? []).map(row => ({ العميل: row.name, النوع: row.customerType, القطاع: row.sector, الفرع: branchName(row.branchId), الحالة: row.status, القيمة_المتوقعة: row.expectedValue, المتابعة: toArabicDate(row.nextFollowupAt) }));
    if (active === "توكيد_الجودة") return (quality.data?.reviews ?? []).map(row => ({ الفرع: branchName(row.branchId), التاريخ: toArabicDate(row.reviewDate), الاستقبال: row.reception, سرعة_الخدمة: row.speed, الدقة: row.accuracy, تجربة_العميل: row.customerExperience, الإجراءات: row.procedures, النماذج: row.forms, KYC: row.kyc, التعليمات: row.instructions }));
    if (active === "complaints") return (quality.data?.complaints ?? []).map(row => ({ نوع_الشكوى: row.complaintType, الفرع: branchName(row.branchId), التاريخ: toArabicDate(row.complaintDate), المسؤول: row.ownerName, مدة_المعالجة: row.processingDays, الحالة: row.status, التفاصيل: row.details }));
    if (active === "targets") return (targets.data ?? []).map(row => ({ الفرع: branchName(row.branchId), المؤشر: row.metricName, الفترة: row.interval, تاريخ_البداية: toArabicDate(row.periodStart), المستهدف: row.targetValue }));
    return (reports.data ?? []).map(row => ({ العنوان: row.title, النوع: row.reportType, الفرع: row.branchId ? branchName(row.branchId) : "جميع الفروع", البداية: toArabicDate(row.periodStart), النهاية: toArabicDate(row.periodEnd), تاريخ_الإنشاء: toArabicDate(row.createdAt) }));
  }, [active, daily.data, dashboard.data, squares.data, visits.data, prospects.data, quality.data, targets.data, reports.data, branches.data, monthly.data]);
  const visibleReportData = useMemo(() => {
    if (!search.trim()) return reportData;
    const needle = search.toLowerCase();
    return reportData.filter(row => Object.values(row).some(value => String(value ?? "").toLowerCase().includes(needle)));
  }, [reportData, search]);
  const submitDaily = (event: React.FormEvent) => { event.preventDefault(); saveDaily.mutate(dailyForm); };
  const setField = (key: string, value: string | number) => setDailyForm(current => ({ ...current, [key]: value }));
  return <>
    <PageHeading eyebrow="التقارير والقرارات" title="مركز التقارير" description="تقارير يومية وأسبوعية وتشغيلية قابلة للتصفية والتصدير والطباعة." actions={<><AppButton variant="secondary" onClick={() => exportExcel(`cbcc-${active}-report`, visibleReportData)}><Download size={14} />Excel</AppButton><AppButton variant="secondary" onClick={printReport}><Printer size={14} />طباعة / PDF</AppButton>{active === "يومي" && canSubmitDaily && <AppButton onClick={() => { setDailyForm(newDaily(user?.assignedBranchId ?? branches.data?.[0]?.id ?? 0)); setModal(true); }}><Send size={14} />تقرير يومي</AppButton>}</>} />
    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div className="flex flex-wrap gap-2">{availableReportTypes.map(([key, label]) => <button key={key} onClick={() => setActive(key)} className={`rounded-xl px-3 py-2 text-xs font-semibold ${active === key ? "bg-primary text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>{label}</button>)}</div><div className="flex gap-2"><input value={search} onChange={event => setSearch(event.target.value)} placeholder="بحث بالتقارير أو السجلات…" className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-primary" /><AppButton variant="secondary" onClick={() => { void reports.refetch(); void daily.refetch(); }}><RefreshCw size={14} /></AppButton></div></div>
    {active === "أسبوعي" && <div className="mb-4 flex flex-wrap items-end justify-between gap-3 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3"><div className="max-w-2xl text-xs leading-6 text-teal-900"><p>يجمع التقرير الأداء والعملاء والزيارات ضمن نافذة من 7 أيام، ويقارنها بالفترة السابقة المماثلة؛ تنتهي الفترة الحالية عند اليوم.</p><p className="mt-1 font-semibold">الفترة المختارة: {weekStart || "—"} — {weekEnd}</p></div><div className="flex flex-wrap items-end gap-2"><TextField label="بداية الفترة" type="date" value={weekStart} onChange={event => setWeekStart(event.target.value)} /><AppButton onClick={() => makeWeekly.mutate({ start: weekStart })} disabled={makeWeekly.isPending || weekEnd === "—"}><Sparkles size={14} />{makeWeekly.isPending ? "جارٍ التوليد…" : "توليد التقرير الأسبوعي"}</AppButton></div></div>}
    {active === "شهري" && <div className="mb-4 flex flex-wrap items-end justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"><p className="text-xs text-slate-600">اختر الشهر لعرض الأداء والمستهدفات الشهرية ضمن نطاق صلاحيتك.</p><div><TextField label="الشهر" type="month" max={currentMonth()} value={month} onChange={event => setMonth(event.target.value)} />{monthIsFuture && <p className="mt-1 text-[10px] text-rose-700">لا تتوفر تقارير لشهر مستقبلي.</p>}{monthly.error && <p className="mt-1 text-[10px] text-rose-700">تعذر تحميل التقرير: {monthly.error.message}</p>}</div></div>}
    <Panel title={reportTypes.find(([key]) => key === active)?.[1]} description={`${formatNumber(visibleReportData.length)} سجلات ظاهرة · تتغير البيانات حسب نطاق صلاحيتك والفلاتر.`} action={<span className="inline-flex items-center gap-2 text-[10px] text-slate-400"><FileBarChart2 size={14} />Excel XLSX · PDF عبر الطباعة</span>}>
      {visibleReportData.length ? <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-right text-xs"><thead><tr className="border-b border-slate-100 text-[10px] text-slate-400">{Object.keys(visibleReportData[0]).slice(0, 8).map(key => <th key={key} className="pb-3">{key.replaceAll("_", " ")}</th>)}</tr></thead><tbody>{visibleReportData.slice(0, 100).map((row, index) => <tr key={index} className="border-b border-slate-50 last:border-0">{Object.values(row).slice(0, 8).map((value, i) => <td key={i} className="max-w-52 py-3 text-slate-700">{String(value ?? "—")}</td>)}</tr>)}</tbody></table></div> : <EmptyState title="لا توجد بيانات في التقرير المحدد" message="أنشئ تقريراً يومياً أو ولّد تقريراً أسبوعياً/شهرياً، أو غيّر عبارة البحث." />}
    </Panel>
    <Panel title="تقارير تم إنشاؤها" description="التقارير الأسبوعية المحفوظة وبياناتها المصدرية." className="mt-5"><div className="divide-y divide-slate-100">{(reports.data ?? []).slice(0, 10).map(row => <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><div className="text-xs font-semibold">{row.title}</div><div className="mt-1 text-[10px] text-slate-400">{row.reportType} · {toArabicDate(row.periodStart)} — {toArabicDate(row.periodEnd)}</div></div><button onClick={() => exportExcel(`report-${row.id}`, row.reportType === "أسبوعي" ? [weeklyReportRow(row)] : [{ العنوان: row.title, النوع: row.reportType, البداية: toArabicDate(row.periodStart), النهاية: toArabicDate(row.periodEnd), التقرير: JSON.stringify(row.reportData) }])} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="تصدير التقرير"><Download size={15} /></button></div>)}{!reports.data?.length && <div className="py-5 text-xs text-slate-400">لا توجد تقارير أسبوعية محفوظة بعد.</div>}</div></Panel>
    <Modal title="التقرير اليومي" open={modal} onClose={() => setModal(false)} wide><form onSubmit={submitDaily} className="grid grid-cols-1 gap-3 sm:grid-cols-3"><SelectField label="الفرع" value={dailyForm.branchId || ""} required onChange={event => setField("branchId", Number(event.target.value))}><option value="" disabled>اختر الفرع</option>{(branches.data ?? []).map(branch => <option key={branch.id} value={branch.id}>{branch.nameAr}</option>)}</SelectField><TextField label="التاريخ" type="date" value={dailyForm.reportDate} required onChange={event => setField("reportDate", event.target.value)} /><SelectField label="حالة التقرير" value={dailyForm.status} onChange={event => setField("status", event.target.value)}><option value="مرسل">مرسل</option><option value="مسودة">مسودة</option></SelectField>{fields.map(([key, label]) => <TextField key={key} label={label} type="number" min={0} value={dailyForm[key]} onChange={event => setField(key, Number(event.target.value))} />)}<TextAreaField label="المعوقات" className="sm:col-span-3" value={dailyForm.obstacles} onChange={event => setField("obstacles", event.target.value)} /><TextAreaField label="الاحتياجات" className="sm:col-span-3" value={dailyForm.needs} onChange={event => setField("needs", event.target.value)} />{saveDaily.error && <p className="text-xs text-rose-700 sm:col-span-3">{saveDaily.error.message}</p>}<div className="flex justify-end gap-2 sm:col-span-3"><AppButton type="button" variant="secondary" onClick={() => setModal(false)}>إلغاء</AppButton><AppButton type="submit" disabled={saveDaily.isPending}>{saveDaily.isPending ? "جارٍ الحفظ…" : "حفظ التقرير"}</AppButton></div></form></Modal>
  </>;
}
