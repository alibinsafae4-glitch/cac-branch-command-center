import { trpc } from "@/lib/trpc";
import { toArabicDate } from "@/lib/domain";
import { AppButton, EmptyState, PageHeading, Panel } from "@/components/Blocks";
import { useAuth } from "@/_core/hooks/useAuth";
import { AppWindow, Bell, CircleCheck, CircleHelp, Clock3, ShieldAlert } from "lucide-react";
import { useState } from "react";

const icons: Record<string, React.ElementType> = { "خطر": ShieldAlert, "نجاح": CircleCheck, "تذكير": Clock3, "تحذير": ShieldAlert, "معلومات": CircleHelp };
const colors: Record<string, string> = { "خطر": "bg-rose-50 text-rose-700 ring-rose-200", "نجاح": "bg-emerald-50 text-emerald-700 ring-emerald-200", "تذكير": "bg-amber-50 text-amber-700 ring-amber-200", "تحذير": "bg-amber-50 text-amber-700 ring-amber-200", "معلومات": "bg-blue-50 text-blue-700 ring-blue-200" };
const statusLabels: Record<string, string> = { "نشط": "نشط", "تمت_المراجعة": "تمت المراجعة", "مؤجل": "مؤجل", "محلول": "محلول", "انتهى": "انتهى تلقائياً" };

export default function AlertsPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState("current");
  const alerts = trpc.business.alerts.list.useQuery(undefined, { refetchInterval: 45_000 });
  const utils = trpc.useUtils();
  const invalidate = () => void utils.business.alerts.list.invalidate();
  const markRead = trpc.business.alerts.markRead.useMutation({ onSuccess: invalidate });
  const snooze = trpc.business.alerts.snooze.useMutation({ onSuccess: invalidate });
  const resolve = trpc.business.alerts.resolve.useMutation({ onSuccess: invalidate });
  const role = user?.role === "مدير" ? "مدير_النظام" : user?.appRole ?? "موظف_الفرع";
  const canResolve = ["مدير_النظام", "تطوير_الأعمال", "توكيد_الجودة", "مدير_الفرع"].includes(role);
  const rows = (alerts.data ?? []).filter(item => {
    if (filter === "current") return !["محلول", "انتهى"].includes(item.alertStatus);
    if (filter === "unread") return !item.isRead;
    if (filter === "snoozed") return item.alertStatus === "مؤجل";
    return item.type === filter;
  });
  const filters = [["current", "الحالية"], ["unread", "غير مقروءة"], ["snoozed", "المؤجلة"], ["خطر", "تدخل"], ["نجاح", "إنجاز"], ["تحذير", "انخفاض تحويل"], ["تذكير", "تذكير"], ["معلومات", "معلومة"]];
  const statusClass = (status: string) => status === "نشط" ? "bg-rose-50 text-rose-700" : status === "مؤجل" ? "bg-amber-50 text-amber-700" : status === "محلول" || status === "انتهى" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600";
  return <>
    <PageHeading eyebrow="المتابعة الاستباقية" title="مركز التنبيهات" description="تنبيهات محفوظة لكل مستخدم؛ أقرّها أو أجّلها أو وثّق حلّها بحسب صلاحيتك." actions={<AppButton variant="secondary" onClick={() => void alerts.refetch()}><Bell size={14} />تحديث الإشارات</AppButton>} />
    <div className="mb-5 flex flex-wrap gap-2">{filters.map(([key, label]) => <button key={key} onClick={() => setFilter(key)} className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${filter === key ? "bg-primary text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>{label}</button>)}</div>
    <Panel title={`الإشارات (${rows.length})`} description="تبقى الإشارة نشطة حتى مراجعتها أو تأجيلها أو توثيق حلّها؛ ويُغلق التنبيه الآلي عندما يزول سببه.">
      {alerts.error && <p className="mb-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-700">تعذر تحميل التنبيهات: {alerts.error.message}</p>}
      {markRead.error && <p className="mb-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-700">تعذر إقرار التنبيه: {markRead.error.message}</p>}
      {snooze.error && <p className="mb-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-700">تعذر تأجيل التنبيه: {snooze.error.message}</p>}
      {resolve.error && <p className="mb-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-700">تعذر حل التنبيه: {resolve.error.message}</p>}
      {rows.length ? <div className="space-y-3">{rows.map(item => { const Icon = icons[item.type] ?? AppWindow; return <article key={String(item.id)} className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-start ${item.isRead ? "border-slate-100 bg-white" : "border-slate-200 bg-slate-50/70"}`}>
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1 ring-inset ${colors[item.type] ?? colors["معلومات"]}`}><Icon size={18} /></span>
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold text-slate-900">{item.title}</h2><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusClass(item.alertStatus)}`}>{statusLabels[item.alertStatus] ?? item.alertStatus}</span>{!item.isRead && <span className="h-2 w-2 rounded-full bg-primary" />}</div><p className="mt-1 text-xs leading-6 text-slate-600">{item.body}</p><div className="mt-2 text-[10px] text-slate-400">{toArabicDate(item.createdAt)}{item.branchId ? ` · فرع #${item.branchId}` : " · جميع الفروع"}{item.snoozedUntil ? ` · يستأنف ${toArabicDate(item.snoozedUntil)}` : ""}</div>
          <div className="mt-3 flex flex-wrap gap-2">{!item.isRead && <button onClick={() => markRead.mutate({ id: item.id })} disabled={markRead.isPending} className="rounded-lg bg-slate-100 px-3 py-2 text-[10px] font-semibold text-slate-700 hover:bg-slate-200">تمت المراجعة</button>}{item.isDynamic && !["محلول", "انتهى"].includes(item.alertStatus) && <><button onClick={() => snooze.mutate({ id: item.id, minutes: 60 })} disabled={snooze.isPending} className="rounded-lg bg-amber-50 px-3 py-2 text-[10px] font-semibold text-amber-800 hover:bg-amber-100">تأجيل ساعة</button><button onClick={() => snooze.mutate({ id: item.id, minutes: 1440 })} disabled={snooze.isPending} className="rounded-lg bg-amber-50 px-3 py-2 text-[10px] font-semibold text-amber-800 hover:bg-amber-100">تأجيل يوم</button>{canResolve && <button onClick={() => { const reason = window.prompt("ما الإجراء الذي اتخذته لحل هذا التنبيه؟"); if (reason?.trim().length && reason.trim().length >= 5) resolve.mutate({ id: item.id, reason: reason.trim() }); }} disabled={resolve.isPending} className="rounded-lg bg-emerald-50 px-3 py-2 text-[10px] font-semibold text-emerald-800 hover:bg-emerald-100">توثيق الحل</button>}</>}</div>
        </div>
      </article>; })}</div> : <EmptyState title="لا توجد إشارات في هذا العرض" message="تظهر التنبيهات المحسوبة من الأداء، وتأخير التقارير، ومواعيد متابعة العملاء المصرح بها." />}
    </Panel>
  </>;
}
