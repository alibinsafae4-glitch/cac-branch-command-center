import { trpc } from "@/lib/trpc";
import { toArabicDate } from "@/lib/domain";
import { AppButton, EmptyState, PageHeading, Panel } from "@/components/Blocks";
import { AppWindow, Bell, CircleCheck, CircleHelp, Clock3, ShieldAlert } from "lucide-react";
import { useState } from "react";

const icons: Record<string, React.ElementType> = { "خطر": ShieldAlert, "نجاح": CircleCheck, "تذكير": Clock3, "تحذير": ShieldAlert, "معلومات": CircleHelp };
const colors: Record<string, string> = { "خطر": "bg-rose-50 text-rose-700 ring-rose-200", "نجاح": "bg-emerald-50 text-emerald-700 ring-emerald-200", "تذكير": "bg-amber-50 text-amber-700 ring-amber-200", "تحذير": "bg-amber-50 text-amber-700 ring-amber-200", "معلومات": "bg-blue-50 text-blue-700 ring-blue-200" };

export default function AlertsPage() {
  const [filter, setFilter] = useState("all");
  const alerts = trpc.business.alerts.list.useQuery(undefined, { refetchInterval: 45_000 });
  const utils = trpc.useUtils();
  const markRead = trpc.business.alerts.markRead.useMutation({ onSuccess: () => void utils.business.alerts.list.invalidate() });
  const rows = (alerts.data ?? []).filter(item => filter === "all" || (filter === "unread" ? !item.isRead : item.type === filter));
  const staticRows = ["خطر", "نجاح", "تحذير", "تذكير", "معلومات"] as const;
  return <>
    <PageHeading eyebrow="المتابعة الاستباقية" title="مركز التنبيهات" description="إشارات تشغيلية للإنجاز والتراجع والتقارير والمتابعة المطلوبة." actions={<AppButton variant="secondary" onClick={() => void alerts.refetch()}><Bell size={14} />تحديث الإشارات</AppButton>} />
    <div className="mb-5 flex flex-wrap gap-2">{[["all", "الكل"], ["unread", "غير مقروء"], ...staticRows.map(key => [key, key === "خطر" ? "تدخل" : key === "نجاح" ? "إنجاز" : key === "تحذير" ? "انخفاض تحويل" : key === "تذكير" ? "تذكير" : "معلومة"])].map(([key, label]) => <button key={key} onClick={() => setFilter(key)} className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${filter === key ? "bg-primary text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>{label}</button>)}</div>
    <Panel title={`الإشارات (${rows.length})`} description="التنبيهات المحسوبة من البيانات تتحدث مع تحديث الأداء والسجلات.">{rows.length ? <div className="space-y-3">{rows.map(item => { const Icon = icons[item.type] ?? AppWindow; return <article key={String(item.id)} className={`flex items-start gap-4 rounded-2xl border p-4 ${item.isRead ? "border-slate-100 bg-white" : "border-slate-200 bg-slate-50/70"}`}><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1 ring-inset ${colors[item.type] ?? colors["معلومات"]}`}><Icon size={18} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold text-slate-900">{item.title}</h2>{!item.isRead && <span className="h-2 w-2 rounded-full bg-primary" />}</div><p className="mt-1 text-xs leading-6 text-slate-600">{item.body}</p><div className="mt-2 text-[10px] text-slate-400">{toArabicDate(item.createdAt)}{item.branchId ? ` · فرع #${item.branchId}` : " · جميع الفروع"}</div></div>{typeof item.id === "number" && !item.isRead && <button onClick={() => markRead.mutate({ id: item.id as number })} disabled={markRead.isPending} className="rounded-lg px-3 py-2 text-[10px] font-semibold text-primary hover:bg-teal-50">تمت المراجعة</button>}</article>; })}</div> : <EmptyState title="لا توجد إشارات في هذا العرض" message="ستظهر هنا التنبيهات المتعلقة بتراجع الأداء أو تجاوز المستهدف أو التقارير والمتابعات المستحقة." />}</Panel>
  </>;
}
