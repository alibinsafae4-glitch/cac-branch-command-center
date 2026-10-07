import { statusTone } from "@/lib/domain";
import { cn } from "@/lib/utils";

const toneClass: Record<string, string> = {
  success: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  warning: "bg-amber-50 text-amber-800 ring-amber-200",
  danger: "bg-rose-50 text-rose-800 ring-rose-200",
  info: "bg-sky-50 text-sky-800 ring-sky-200",
};

export function StatusBadge({ children, tone, className }: { children: React.ReactNode; tone?: string; className?: string }) {
  const resolvedTone = tone ?? statusTone(String(children));
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset", toneClass[resolvedTone] ?? toneClass.info, className)}>{children}</span>;
}
