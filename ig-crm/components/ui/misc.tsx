import { ChevronDown, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

const statTones = {
  violet: "text-[#a99ffb] bg-accent-soft",
  green: "text-emerald-400 bg-emerald-500/10",
  orange: "text-amber-400 bg-amber-500/10",
  blue: "text-sky-400 bg-sky-500/10",
  pink: "text-pink-400 bg-pink-500/10",
  red: "text-red-400 bg-red-500/10",
};

export function StatCard({ label, value, icon: Icon, tone = "violet", hint }: { label: string; value: React.ReactNode; icon: LucideIcon; tone?: keyof typeof statTones; hint?: string }) {
  return (
    <div className="card group relative overflow-hidden p-4 transition-colors hover:border-line-strong sm:p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted">{label}</span>
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", statTones[tone])}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-white">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">{children}</div>;
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-3 text-muted ring-1 ring-line">
        <Icon className="h-5 w-5" />
      </span>
      <div className="font-medium text-white">{title}</div>
      {text && <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-white/[0.04]", className)} />;
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={cn("relative", className)}>
      <select className="field cursor-pointer appearance-none pr-9" {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
    </div>
  );
}

export function Progress({ value, tone }: { value: number; tone: "green" | "orange" | "red" | "gray" }) {
  const colors = { green: "bg-emerald-400", orange: "bg-amber-400", red: "bg-red-400", gray: "bg-zinc-600" };
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
      <div className={cn("h-full rounded-full transition-all duration-700", colors[tone])} style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` }} />
    </div>
  );
}
