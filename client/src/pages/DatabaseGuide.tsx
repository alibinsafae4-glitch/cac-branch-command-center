import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { AppButton, PageHeading, Panel } from "@/components/Blocks";
import { useAuth } from "@/_core/hooks/useAuth";
import { allDictionaryTables, databaseDictionary } from "@/lib/databaseDictionary";
import { ChevronDown, ChevronUp, Database, Download, ExternalLink, Search, ShieldCheck, TableProperties } from "lucide-react";

function downloadCsv() {
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const rows = [
    ["اسم الجدول الفعلي في MySQL", "عنوان الجدول", "اسم العمود الفعلي في MySQL", "اسم الخاصية داخل التطبيق", "شرح الحقل بالعربية"],
    ...databaseDictionary.flatMap(group => group.tables.flatMap(table => table.fields.map(field => [table.databaseName, table.title, field.databaseName, field.name, field.label]))),
  ];
  const csv = `\uFEFF${rows.map(row => row.map(quote).join(",")).join("\r\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "قاموس-قاعدة-بيانات-CAC.csv";
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function DatabaseGuidePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [openTables, setOpenTables] = useState<Record<string, boolean>>({ branches: true });
  const normalizedQuery = query.trim().toLocaleLowerCase("ar");
  const filteredGroups = useMemo(() => databaseDictionary.map(group => ({
    ...group,
    tables: group.tables.flatMap(table => {
      if (!normalizedQuery) return [{ ...table, visibleFields: table.fields }];
      const tableMatch = [table.name, table.databaseName, table.title, table.description].some(value => value.toLocaleLowerCase("ar").includes(normalizedQuery));
      const matchingFields = table.fields.filter(field => `${field.name} ${field.databaseName} ${field.label}`.toLocaleLowerCase("ar").includes(normalizedQuery));
      return tableMatch || matchingFields.length ? [{ ...table, visibleFields: tableMatch ? table.fields : matchingFields }] : [];
    }),
  })).filter(group => group.tables.length), [normalizedQuery]);
  const visibleTableCount = filteredGroups.reduce((sum, group) => sum + group.tables.length, 0);
  const visibleFieldCount = filteredGroups.reduce((sum, group) => sum + group.tables.reduce((inner, table) => inner + table.visibleFields.length, 0), 0);

  const canOpen = (roles?: string[]) => Boolean(user && (!roles || roles.includes(user.appRole) || user.role === "مدير"));

  return <>
    <PageHeading eyebrow="مرجع البيانات" title="قاموس قاعدة البيانات" description="ترجمة عملية لأسماء الجداول والحقول الفعلية في MySQL، مع روابط لشاشات إدارة البيانات المتاحة حسب الدور." actions={<AppButton variant="secondary" onClick={downloadCsv}><Download size={15} />تنزيل القاموس CSV</AppButton>} />

    <Panel className="mb-5 overflow-hidden border-[#cadbd0] bg-[linear-gradient(115deg,#e9f2ec_0%,#f8f7ef_100%)] shadow-none">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#20286d] text-white shadow-sm"><Database size={20} /></div>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm font-bold text-[#1b2748]"><ShieldCheck size={16} className="text-[#20286d]" />كيف تتعامل مع قاعدة البيانات؟</div>
          <p className="mt-2 max-w-4xl text-sm leading-7 text-[#4b5d7c]">أُعيدت تسمية الجداول والأعمدة الفعلية في MySQL بالعربية، وكذلك قيم الأدوار والحالات. تظهر هنا أسماء MySQL كما هي، بينما تبقى أسماء الخصائص داخل الشيفرة ثابتة لدعم التطبيق والتكاملات. للإضافة أو التعديل استخدم شاشة النظام المناسبة؛ هذا الدليل لا يتيح SQL ولا يعرض سجلات عملاء فعلية.</p>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[#65718a]"><span className="rounded-full border border-[#dce3f1] bg-white/80 px-3 py-1.5">أسماء الجداول والأعمدة الفعلية بالعربية</span><span className="rounded-full border border-[#dce3f1] bg-white/80 px-3 py-1.5">واجهات الإضافة تحترم الدور ونطاق الفرع</span><span className="rounded-full border border-[#dce3f1] bg-white/80 px-3 py-1.5">التعديل المباشر للحقول الداخلية غير موصى به</span></div>
        </div>
      </div>
    </Panel>

    <div className="mb-5 grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border border-[#dce2ef] bg-white p-4"><div className="flex items-center gap-2 text-xs text-[#68748f]"><TableProperties size={15} className="text-primary" />الجداول الموثقة</div><div className="mt-2 text-2xl font-bold tabular-nums text-[#172544]">{allDictionaryTables.length}</div></div>
      <div className="rounded-2xl border border-[#dce2ef] bg-white p-4"><div className="flex items-center gap-2 text-xs text-[#68748f]"><Database size={15} className="text-primary" />الحقول المشروحة</div><div className="mt-2 text-2xl font-bold tabular-nums text-[#172544]">{allDictionaryTables.reduce((sum, table) => sum + table.fields.length, 0)}</div></div>
      <div className="rounded-2xl border border-[#dce2ef] bg-white p-4"><div className="flex items-center gap-2 text-xs text-[#68748f]"><Search size={15} className="text-primary" />نتيجة البحث الحالي</div><div className="mt-2 text-2xl font-bold tabular-nums text-[#172544]">{visibleTableCount}<span className="mr-2 text-sm font-medium text-[#7d88a0]">جدول · {visibleFieldCount} حقل</span></div></div>
    </div>

    <div className="relative mb-5">
      <Search size={17} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8994aa]" />
      <input value={query} onChange={event => setQuery(event.target.value)} placeholder="ابحث باسم الجدول أو الحقل أو معناه بالعربية…" aria-label="البحث في قاموس قاعدة البيانات" className="h-12 w-full rounded-2xl border border-[#dce2ef] bg-white pr-11 pl-4 text-sm text-[#172544] shadow-[0_4px_18px_rgba(16,59,66,.035)] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10" />
    </div>

    <div className="space-y-6">
      {filteredGroups.map(group => <section key={group.title}>
        <div className="mb-3 flex items-end justify-between gap-3 border-r-2 border-[#ffc734] pr-3"><div><h2 className="text-sm font-bold text-[#172544]">{group.title}</h2><p className="mt-1 text-xs leading-5 text-[#76829c]">{group.description}</p></div><span className="shrink-0 text-[10px] text-[#8994aa]">{group.tables.length} جداول</span></div>
        <div className="space-y-3">
          {group.tables.map(table => {
            const expanded = normalizedQuery ? true : Boolean(openTables[table.name]);
            const fields = table.visibleFields;
            return <article key={table.name} className="overflow-hidden rounded-2xl border border-[#dce2ef] bg-white shadow-[0_4px_18px_rgba(16,59,66,.035)]">
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <button onClick={() => setOpenTables(current => ({ ...current, [table.name]: !current[table.name] }))} className="flex min-w-0 flex-1 items-center gap-3 text-right">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e9f2ec] text-primary"><TableProperties size={17} /></span>
                  <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-x-2 gap-y-1"><span className="text-sm font-bold text-[#172544]">{table.title}</span><code dir="rtl" title={`المعرّف البرمجي: ${table.name}`} className="rounded-md bg-[#f2f5f1] px-2 py-1 font-mono text-[10px] text-[#506080]">{table.databaseName}</code>{table.managedBySystem && <span className="rounded-full bg-[#fff5d7] px-2 py-1 text-[9px] font-semibold text-[#806219]">تدار تلقائياً جزئياً</span>}</span><span className="mt-1 block text-xs leading-5 text-[#77839b]">{table.description}</span><span className="mt-1 block text-[10px] text-[#8994aa]">{table.fields.length} حقلاً</span></span>
                  {expanded ? <ChevronUp size={17} className="shrink-0 text-[#8490a8]" /> : <ChevronDown size={17} className="shrink-0 text-[#8490a8]" />}
                </button>
                {table.action && canOpen(table.action.roles) && <button onClick={() => setLocation(table.action!.path)} className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#dce2ef] bg-white px-3 text-[11px] font-semibold text-[#304276] transition hover:border-[#bad0c2] hover:bg-[#f4f8f4]"><ExternalLink size={13} />{table.action.label}</button>}
              </div>
              {expanded && <div className="border-t border-[#eef2fa] px-3 py-3 sm:px-5 sm:py-4">
                <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold text-[#7d89a1]"><span>المعنى بالعربية</span><span className="h-px flex-1 bg-[#eef2fa]" /><span>اسم العمود الفعلي بالعربية</span></div>
                <div className="grid gap-1 sm:grid-cols-2 xl:grid-cols-3">
                  {fields.map(field => <div key={field.name} className="flex min-h-10 items-center justify-between gap-3 rounded-lg px-3 py-2 odd:bg-[#f7f9f6]">
                    <span className="text-xs text-[#485978]">{field.label}</span>
                    <code dir="rtl" title={`الخاصية البرمجية: ${field.name}`} className="shrink-0 font-mono text-[10px] text-[#78849c]">{field.databaseName}</code>
                  </div>)}
                </div>
                {table.managedBySystem && <p className="mt-3 rounded-lg bg-[#fbf7e9] px-3 py-2 text-[10px] leading-5 text-[#75601d]">بعض سجلات هذا الجدول تُحدَّث آلياً من عمليات التطبيق؛ استخدم الشاشة المرتبطة للمراجعة ولا تعدّل القيم المحسوبة يدوياً.</p>}
              </div>}
            </article>;
          })}
        </div>
      </section>)}
      {!filteredGroups.length && <div className="rounded-2xl border border-dashed border-[#dce2ef] bg-white px-6 py-12 text-center"><Search size={22} className="mx-auto mb-3 text-[#9aa4b8]" /><div className="text-sm font-semibold text-[#445a55]">لا توجد حقول مطابقة</div><p className="mt-2 text-xs text-[#7a86a0]">جرّب البحث بكلمة عربية أو باسم الحقل التقني.</p></div>}
    </div>

    <Panel title="دليل أنواع البيانات" description="تعريفات مختصرة لمساعدتك على قراءة المخطط التقني." className="mt-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[["INT", "عدد صحيح؛ يستخدم للمعرّفات والعدادات."], ["VARCHAR / TEXT", "نص قصير أو طويل، مثل الاسم والملاحظات."], ["DECIMAL", "رقم عشري مناسب للقيم المالية والإنجاز."], ["DATE / TIMESTAMP", "تاريخ فقط أو تاريخ ووقت."], ["ENUM", "قيمة واحدة من حالات محددة مسبقاً."], ["JSON", "قائمة أو بنية مركبة مثل الحدود أو المرفقات."], ["BOOLEAN", "قيمة نعم/لا مثل التفعيل والقراءة."], ["NULL", "الحقل الاختياري الذي قد لا تكون له قيمة بعد."]].map(([type, explanation]) => <div key={type} className="rounded-xl border border-[#e6ece7] bg-[#fafbf9] p-3"><code dir="ltr" className="font-mono text-[11px] font-semibold text-[#304276]">{type}</code><p className="mt-1 text-[11px] leading-5 text-[#6b7893]">{explanation}</p></div>)}
      </div>
      <p className="mt-4 flex items-start gap-2 border-t border-[#eef2fa] pt-4 text-[10px] leading-5 text-[#8590a8]"><ShieldCheck size={13} className="mt-0.5 shrink-0 text-[#6376a1]" />الدليل يشرح بنية الجداول فقط، ولا يتيح SQL مباشراً أو تجاوز صلاحيات الدور والفرع. بعض الحقول مشتقة أو تديرها الخدمة تلقائياً، وتظهر القيود المعروفة في ملف README.</p>
    </Panel>
  </>;
}
