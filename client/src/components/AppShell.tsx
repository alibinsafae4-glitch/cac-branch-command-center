import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { formatNumber } from "@/lib/domain";
import { AppButton } from "@/components/Blocks";
import { Activity, Bell, BrainCircuit, Building2, ChevronDown, Database, FileBarChart2, Gauge, Landmark, LayoutDashboard, LogOut, MapPinned, Menu, Search, Settings, ShieldCheck, Target, UsersRound, X, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { BUSINESS_TIME_ZONE } from "../../../shared/date";

const navItems: Array<{ label: string; path: string; icon: LucideIcon; roles?: string[] }> = [
  { label: "لوحة القيادة", path: "/", icon: LayoutDashboard },
  { label: "الفروع", path: "/branches", icon: Landmark },
  { label: "المربعات الجغرافية", path: "/squares", icon: MapPinned },
  { label: "العملاء المحتملون", path: "/prospects", icon: UsersRound, roles: ["super_admin", "business_development", "branch_manager", "branch_employee"] },
  { label: "الزيارات الميدانية", path: "/visits", icon: Activity, roles: ["super_admin", "business_development", "quality", "branch_manager", "branch_employee"] },
  { label: "المستهدفات", path: "/targets", icon: Target, roles: ["super_admin", "executive", "business_development", "branch_manager"] },
  { label: "توكيد الجودة", path: "/quality", icon: ShieldCheck, roles: ["super_admin", "quality", "branch_manager"] },
  { label: "مركز التقارير", path: "/reports", icon: FileBarChart2 },
  { label: "ذكاء الأعمال", path: "/intelligence", icon: BrainCircuit, roles: ["super_admin", "executive", "business_development"] },
  { label: "التنبيهات", path: "/alerts", icon: Bell },
  { label: "الإعدادات", path: "/settings", icon: Settings, roles: ["super_admin"] },
  { label: "قاموس قاعدة البيانات", path: "/database-guide", icon: Database },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { loading, user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const search = trpc.business.search.global.useQuery({ query }, { enabled: Boolean(user && query.trim().length > 1), staleTime: 5000 });
  const alerts = trpc.business.alerts.list.useQuery(undefined, { enabled: Boolean(user), staleTime: 20_000 });
  const visibleNav = navItems.filter(item => !item.roles || item.roles.includes(user?.appRole ?? "branch_employee") || user?.role === "admin");
  const [pathname] = useLocation();
  useEffect(() => { setMobileOpen(false); setSearchOpen(false); }, [pathname]);
  const openResults = search.data ?? [];

  if (loading) return <div className="grid min-h-screen place-items-center bg-[#f4f6f8]"><div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm"><span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />جارٍ التحقق من جلسة الدخول…</div></div>;
  if (!user) return <div dir="rtl" className="grid min-h-screen place-items-center bg-[#f3f6f1] p-5"><div className="w-full max-w-lg rounded-[28px] border border-[#dbe4de] bg-white p-8 text-center shadow-[0_20px_60px_rgba(16,59,66,.10)]"><img src="/cac-mark.svg" alt="CAC BANK" className="mx-auto mb-6 h-16 w-16 rounded-2xl shadow-md shadow-[#125b53]/15" /><div className="mb-3 inline-flex items-center rounded-full bg-[#f7f1e3] px-3 py-1 text-xs font-semibold text-[#765c2d] ring-1 ring-[#e5d4ab]">بيئة تجريبية · Demo Data</div><h1 className="text-2xl font-bold tracking-tight text-[#193037]">مركز قيادة ومتابعة أداء الفروع</h1><p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-[#667571]">لوحة مصرفية موحدة لمتابعة الأداء والاستقطاب والجودة. يتطلب الوصول تسجيل دخول معتمداً.</p><AppButton onClick={() => startLogin()} className="mt-7 w-full"><Landmark size={17} /> تسجيل الدخول الآمن</AppButton><p className="mt-4 text-xs text-slate-400">CAC Branch Command Center</p></div></div>;
  if (user.isActive === 0) return <div dir="rtl" className="grid min-h-screen place-items-center bg-[#f4f6f8] p-5"><div className="rounded-2xl border border-rose-200 bg-white p-8 text-center"><ShieldCheck className="mx-auto mb-3 text-rose-600" /><h1 className="font-semibold">الحساب غير مفعّل</h1><p className="mt-2 text-sm text-slate-500">يرجى التواصل مع مدير النظام لتفعيل صلاحيتك.</p><AppButton variant="secondary" className="mt-5" onClick={() => void logout()}>تسجيل الخروج</AppButton></div></div>;

  return <div dir="rtl" className="min-h-screen bg-[#f3f6f1] text-[#193037]">
    {mobileOpen && <button aria-label="إغلاق القائمة" className="fixed inset-0 z-40 bg-slate-950/40 md:hidden" onClick={() => setMobileOpen(false)} />}
    <aside className={`fixed inset-y-0 right-0 z-50 flex w-[264px] flex-col border-l border-[#28545a] bg-[linear-gradient(180deg,#123f45_0%,#103b42_54%,#0e333d_100%)] text-white shadow-[0_18px_55px_rgba(13,46,51,.22)] transition-transform duration-200 md:translate-x-0 ${mobileOpen ? "translate-x-0" : "translate-x-full"}`}>
      <div className="flex h-[76px] items-center justify-between border-b border-white/10 px-5"><div className="flex items-center gap-3"><img src="/cac-mark.svg" alt="CAC BANK" className="h-10 w-10 rounded-xl shadow-sm shadow-black/15" /><div><div className="text-[13px] font-extrabold tracking-[.08em] text-white">CAC BANK</div><div className="mt-0.5 text-[10px] text-white/60">مركز قيادة الفروع</div></div></div><button onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-white/60 hover:bg-white/10 md:hidden"><X size={18} /></button></div>
      <div className="mx-4 mt-4 flex items-center justify-between rounded-xl border border-white/15 bg-white/5 px-3 py-2"><span className="flex items-center gap-2 text-[11px] font-semibold text-[#ead8ab]"><span className="h-2 w-2 rounded-full bg-[#d9bd7e]" />بيانات تجريبية</span><span className="text-[10px] text-white/60">DEMO</span></div>
      <nav className="flex-1 overflow-y-auto px-3 py-5"><div className="mb-3 px-3 text-[10px] font-bold tracking-[.14em] text-white/40">مساحة العمل</div>{visibleNav.map(item => { const active = item.path === "/" ? pathname === "/" : pathname === item.path || pathname.startsWith(`${item.path}/`); return <button key={item.path} onClick={() => setLocation(item.path)} className={`group mb-1 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-right text-[13px] transition-colors ${active ? "bg-white/10 font-semibold text-white shadow-sm ring-1 ring-inset ring-white/10" : "text-white/70 hover:bg-white/5 hover:text-white"}`}><item.icon size={17} strokeWidth={active ? 2.2 : 1.8} /><span className="flex-1">{item.label}</span>{active && <span className="h-5 w-1 rounded-full bg-[#d9bd7e]" />}</button>; })}</nav>
      <div className="border-t border-white/10 p-4"><div className="mb-3 rounded-xl border border-white/10 bg-white/5 p-3"><div className="text-[11px] font-semibold text-white/80">مؤشرات تشغيلية</div><div className="mt-2 flex items-center justify-between text-xs text-white/55"><span>التنبيهات المفتوحة</span><span className="font-bold text-white">{formatNumber((alerts.data ?? []).filter(item => !item.isRead).length)}</span></div></div><button onClick={() => void logout()} className="flex h-10 w-full items-center gap-2 rounded-xl px-3 text-xs font-medium text-white/65 hover:bg-rose-500/10 hover:text-rose-200"><LogOut size={15} />تسجيل الخروج</button></div>
    </aside>
    <div className="min-h-screen md:mr-[264px] print:mr-0">
      <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-[#dbe4de]/80 bg-[#fbfcfa]/95 px-4 backdrop-blur sm:px-7">
        <div className="flex min-w-0 items-center gap-3"><button aria-label="فتح القائمة" className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 md:hidden" onClick={() => setMobileOpen(true)}><Menu size={19} /></button><div className="hidden text-xs text-slate-400 sm:block">{new Intl.DateTimeFormat("ar-YE", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: BUSINESS_TIME_ZONE }).format(new Date())}</div><div className="hidden h-5 w-px bg-slate-200 sm:block" /><div className="truncate text-[13px] font-semibold text-slate-700">{navItems.find(item => item.path === pathname)?.label ?? (pathname.startsWith("/branches/") ? "تفاصيل الفرع" : "مركز القيادة")}</div></div>
        <div className="flex items-center gap-2 sm:gap-3"><div className="relative hidden sm:block"><div className="flex h-9 w-[220px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-primary focus-within:bg-white"><Search size={15} className="text-slate-400" /><input value={query} onFocus={() => setSearchOpen(true)} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === "Escape") setSearchOpen(false); if (event.key === "Enter" && openResults[0]) setLocation(openResults[0].href); }} placeholder="بحث عام…" className="w-full bg-transparent text-xs outline-none placeholder:text-slate-400" /></div>{searchOpen && query.length > 1 && <div className="absolute left-0 top-11 z-50 max-h-80 w-[320px] overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl">{search.isLoading ? <div className="p-3 text-xs text-slate-400">جارٍ البحث…</div> : openResults.length ? openResults.map((result, i) => <button key={`${result.kind}-${i}`} onClick={() => setLocation(result.href)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-right hover:bg-slate-50"><span className="min-w-20 text-[10px] text-primary">{result.kind}</span><span className="truncate text-xs text-slate-700">{result.label}</span></button>) : <div className="p-3 text-xs text-slate-400">لا توجد نتائج مطابقة.</div>}</div>}</div>
          <button aria-label="التنبيهات" onClick={() => setLocation("/alerts")} className="relative rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"><Bell size={16} />{(alerts.data ?? []).some(item => !item.isRead) && <span className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-rose-500" />}</button>
          <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-50"><span className="grid h-8 w-8 place-items-center rounded-full bg-teal-100 text-xs font-bold text-primary">{(user.name ?? "م").slice(0, 1)}</span><span className="hidden max-w-32 text-right sm:block"><span className="block truncate text-xs font-semibold text-slate-800">{user.name ?? "مستخدم"}</span><span className="block truncate text-[10px] text-slate-500">{user.appRole === "super_admin" || user.role === "admin" ? "مدير النظام" : "مستخدم مصرح"}</span></span><ChevronDown size={14} className="hidden text-slate-400 sm:block" /></button>
          {profileOpen && <div className="fixed left-4 top-[58px] z-50 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl"><div className="border-b border-slate-100 px-3 py-2"><div className="text-xs font-semibold">{user.name}</div><div className="mt-1 truncate text-[10px] text-slate-500">{user.email}</div></div><button onClick={() => { setProfileOpen(false); void logout(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-rose-700 hover:bg-rose-50"><LogOut size={14} />تسجيل الخروج</button></div>}
        </div>
      </header>
      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">{children}<footer className="mt-10 flex flex-col gap-2 border-t border-slate-200/70 py-5 text-[10px] text-slate-400 sm:flex-row sm:items-center sm:justify-between"><span>CAC Branch Command Center · نسخة عرض تشغيلية</span><span>البيانات المعروضة اصطناعية لأغراض التجربة والتطوير</span></footer></main>
    </div>
  </div>;
}
