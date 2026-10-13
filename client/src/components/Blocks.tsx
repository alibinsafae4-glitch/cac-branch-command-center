import { X } from "lucide-react";
import { useEffect } from "react";

export function PageHeading({ eyebrow, title, description, actions, variant = "default", className = "mb-6" }: { eyebrow?: string; title: string; description?: string; actions?: React.ReactNode; variant?: "default" | "hero"; className?: string }) {
  const hero = variant === "hero";
  return <div className={`${className} flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between`}><div>{eyebrow && <div className={`brand-eyebrow mb-2 text-xs font-semibold uppercase tracking-[.16em] ${hero ? "text-[#ffe28a]" : "text-primary"}`}>{eyebrow}</div>}<h1 className={`text-2xl font-bold tracking-[-.035em] sm:text-[30px] ${hero ? "text-white" : "text-[#172544]"}`}>{title}</h1>{description && <p className={`mt-2 max-w-3xl text-sm leading-7 ${hero ? "text-white/75" : "text-[#68748f]"}`}>{description}</p>}</div>{actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}</div>;
}

export function Panel({ title, description, action, children, className = "" }: { title?: string; description?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-[#dce2ef] bg-white shadow-[0_6px_24px_rgba(32,40,109,.045)] ${className}`}><div className="flex items-start justify-between gap-4 px-5 pt-5">{(title || description) && <div>{title && <h2 className="text-base font-bold leading-7 text-[#172544]">{title}</h2>}{description && <p className="mt-1 text-xs leading-6 text-[#68748f]">{description}</p>}</div>}{action}</div><div className="p-5">{children}</div></section>;
}

export function AppButton({ children, variant = "primary", className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  const styles = {
    primary: "bg-primary text-white shadow-sm hover:bg-[#0d4d46] disabled:bg-slate-300",
    secondary: "border border-[#dce2ef] bg-white text-[#31474b] hover:bg-[#f2f6f2] disabled:opacity-50",
    ghost: "text-slate-600 hover:bg-slate-100 disabled:opacity-50",
    danger: "bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50",
  };
  return <button {...props} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${styles[variant]} ${className}`}>{children}</button>;
}

export function TextField({ label, hint, className = "", inputClassName = "", ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; inputClassName?: string }) {
  return <label className={`grid gap-1.5 text-sm font-medium text-slate-700 ${className}`}><span>{label}</span><input {...props} className={`h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:bg-slate-50 ${inputClassName}`} />{hint && <small className="text-xs font-normal text-slate-500">{hint}</small>}</label>;
}

export function SelectField({ label, children, className = "", inputClassName = "", ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: React.ReactNode; inputClassName?: string }) {
  return <label className={`grid gap-1.5 text-sm font-medium text-slate-700 ${className}`}><span>{label}</span><select {...props} className={`h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 ${inputClassName}`}>{children}</select></label>;
}

export function TextAreaField({ label, className = "", inputClassName = "", ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; inputClassName?: string }) {
  return <label className={`grid gap-1.5 text-sm font-medium text-slate-700 ${className}`}><span>{label}</span><textarea {...props} className={`min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 ${inputClassName}`} /></label>;
}

export function Modal({ title, open, onClose, children, wide = false }: { title: string; open: boolean; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open, onClose]);
  if (!open) return null;
  return <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-[2px]" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><div role="dialog" aria-modal="true" aria-label={title} className={`my-auto max-h-[92vh] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl ${wide ? "max-w-3xl" : "max-w-xl"}`}><div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur"><h2 className="font-semibold text-slate-900">{title}</h2><button onClick={onClose} aria-label="إغلاق" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button></div><div className="p-5">{children}</div></div></div>;
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-12 text-center"><div className="text-sm font-semibold text-slate-800">{title}</div><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{message}</p></div>;
}

export function ProgressBar({ value, tone }: { value: number; tone?: "green" | "amber" | "red" }) {
  const color = tone ?? (value >= 100 ? "green" : value >= 70 ? "amber" : "red");
  const colors = { green: "bg-emerald-500", amber: "bg-amber-500", red: "bg-rose-500" };
  return <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${colors[color]} transition-[width] duration-500`} style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} /></div>;
}
