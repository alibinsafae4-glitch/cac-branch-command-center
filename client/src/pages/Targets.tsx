import { trpc } from "@/lib/trpc";
import { dateForInput, formatNumber, formatPercent, metricNames, toArabicDate } from "@/lib/domain";
import { AppButton, EmptyState, Modal, PageHeading, Panel, ProgressBar, SelectField, TextField } from "@/components/Blocks";
import { useAuth } from "@/_core/hooks/useAuth";
import { Download, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { exportExcel } from "@/lib/export";

const metricOptions = Object.entries(metricNames);
const intervals = [["daily", "يومي"], ["weekly", "أسبوعي"], ["monthly", "شهري"], ["quarterly", "ربع سنوي"], ["yearly", "سنوي"]] as const;
type TargetForm = { id?: number; branchId: number; metricCode: string; metricName: string; interval: "daily" | "weekly" | "monthly" | "quarterly" | "yearly"; periodStart: string; targetValue: number };
const newForm = (branchId = 0): TargetForm => ({ branchId, metricCode: "new_customers", metricName: metricNames.new_customers, interval: "monthly", periodStart: `${dateForInput().slice(0, 7)}-01`, targetValue: 30 });

export default function TargetsPage() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<TargetForm>(newForm());
  const rows = trpc.business.targets.list.useQuery();
  const branches = trpc.business.branches.list.useQuery();
  const utils = trpc.useUtils();
  const save = trpc.business.targets.save.useMutation({ onSuccess: () => { void utils.business.targets.list.invalidate(); void utils.business.dashboard.summary.invalidate(); setOpen(false); } });
  const canEdit = user?.role === "admin" || user?.appRole === "super_admin";
  const data = rows.data ?? [];
  const openNew = () => { setForm(newForm(user?.assignedBranchId ?? branches.data?.[0]?.id ?? 0)); setOpen(true); };
  const edit = (row: NonNullable<typeof rows.data>[number]) => setForm({ id: row.id, branchId: row.branchId, metricCode: row.metricCode, metricName: row.metricName, interval: row.interval, periodStart: dateForInput(row.periodStart), targetValue: Number(row.targetValue) });
  const submit = (event: React.FormEvent) => { event.preventDefault(); save.mutate(form); };
  return <>
    <PageHeading eyebrow="التخطيط والأداء" title="المستهدفات" description="حدد أهداف كل فرع ومؤشر لكل أفق زمني، واعرض الفعلي والإنجاز المحسوبين ضمن الفترة نفسها." actions={<><AppButton variant="secondary" onClick={() => exportExcel("branch-targets", data.map(item => ({ الفرع: branches.data?.find(branch => branch.id === item.branchId)?.nameAr, المؤشر: item.metricName, الفترة: intervals.find(([key]) => key === item.interval)?.[1], البداية: toArabicDate(item.periodStart), المستهدف: item.targetValue, الفعلي: item.actual, الإنجاز: `${item.achievement.toFixed(1)}%` })))}><Download size={14} />Excel</AppButton>{canEdit && <AppButton onClick={openNew}><Plus size={16} />إضافة مستهدف</AppButton>}</>} />
    <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{intervals.map(([key, label]) => <div key={key} className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs text-slate-500">مستهدفات {label}</div><div className="mt-2 text-xl font-bold">{formatNumber(data.filter(item => item.interval === key).length)}</div></div>)}</div>
    <Panel title="سجل المستهدفات" description="الأوزان الافتراضية لتقييم الفروع: تجاري 30%، استقطاب 20%، ودائع 15%، نشاط ميداني 10%، رقمي 10%، جودة 10%، التزام 5%.">
      {rows.isLoading ? <div className="py-8 text-center text-sm text-slate-400">جارٍ تحميل المستهدفات…</div> : rows.isError ? <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{rows.error.message}</div> : data.length ? <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-right text-xs"><thead><tr className="border-b border-slate-100 text-[10px] text-slate-400"><th className="pb-3">الفرع</th><th className="pb-3">المؤشر</th><th className="pb-3">الأفق</th><th className="pb-3">بداية الفترة</th><th className="pb-3">المستهدف</th><th className="pb-3">الفعلي</th><th className="w-36 pb-3">الإنجاز</th>{canEdit && <th className="pb-3">إجراء</th>}</tr></thead><tbody>{data.map(row => <tr key={row.id} className="border-b border-slate-50 last:border-0"><td className="py-3.5 font-semibold">{branches.data?.find(branch => branch.id === row.branchId)?.nameAr ?? "—"}</td><td className="py-3.5 text-slate-700">{row.metricName}</td><td className="py-3.5">{intervals.find(([key]) => key === row.interval)?.[1]}</td><td className="py-3.5 text-slate-500">{toArabicDate(row.periodStart)}</td><td className="py-3.5 font-semibold">{formatNumber(row.targetValue)}</td><td className="py-3.5">{formatNumber(row.actual)}</td><td className="py-3.5"><div className="space-y-1"><ProgressBar value={row.achievement} /><span className="text-[10px] text-slate-500">{formatPercent(row.achievement)}</span></div></td>{canEdit && <td className="py-3.5"><button onClick={() => { edit(row); setOpen(true); }} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-primary" aria-label="تعديل"><Pencil size={14} /></button></td>}</tr>)}</tbody></table></div> : <EmptyState title="لا توجد مستهدفات" message="أضف مستهدفات لكل فرع ومؤشر وفترة زمنية." />}
    </Panel>
    <Modal title={form.id ? "تعديل مستهدف" : "إضافة مستهدف"} open={open} onClose={() => setOpen(false)}><form onSubmit={submit} className="grid gap-4"><SelectField label="الفرع" value={form.branchId || ""} required onChange={event => setForm({ ...form, branchId: Number(event.target.value) })}><option value="" disabled>اختر الفرع</option>{(branches.data ?? []).map(branch => <option key={branch.id} value={branch.id}>{branch.nameAr}</option>)}</SelectField><SelectField label="المؤشر" value={form.metricCode} onChange={event => setForm({ ...form, metricCode: event.target.value, metricName: metricNames[event.target.value] ?? event.target.value })}>{metricOptions.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</SelectField><SelectField label="الفترة" value={form.interval} onChange={event => setForm({ ...form, interval: event.target.value as TargetForm["interval"] })}>{intervals.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</SelectField><TextField label="تاريخ بداية الفترة" type="date" required value={form.periodStart} onChange={event => setForm({ ...form, periodStart: event.target.value })} /><TextField label="القيمة المستهدفة" type="number" min={0.01} step="any" required value={form.targetValue} onChange={event => setForm({ ...form, targetValue: Number(event.target.value) })} />{save.error && <p className="text-xs text-rose-700">{save.error.message}</p>}<div className="flex justify-end gap-2"><AppButton type="button" variant="secondary" onClick={() => setOpen(false)}>إلغاء</AppButton><AppButton type="submit" disabled={save.isPending}>{save.isPending ? "جارٍ الحفظ…" : "حفظ المستهدف"}</AppButton></div></form></Modal>
  </>;
}
