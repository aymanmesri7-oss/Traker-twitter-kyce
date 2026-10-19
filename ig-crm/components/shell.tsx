"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Home, Instagram, Menu, Settings, Users, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCrm } from "@/lib/data";
import { computeAlerts } from "@/lib/compute";
import { formatDuration } from "@/lib/time";

const NAV = [
  { href: "/", label: "Quoi faire", icon: Home },
  { href: "/vas", label: "VA", icon: Users },
  { href: "/comptes", label: "Comptes", icon: Instagram },
  { href: "/parametres", label: "Paramètres", icon: Settings },
];

function NavLinks({ onNavigate, urgentCount }: { onNavigate?: () => void; urgentCount: number }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
              active ? "bg-white/[0.06] text-white" : "text-muted hover:bg-white/[0.03] hover:text-white"
            )}
          >
            {active && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent" />}
            <Icon className={cn("h-[18px] w-[18px] transition-colors", active ? "text-accent" : "text-muted group-hover:text-white")} />
            {label}
            {href === "/" && urgentCount > 0 && (
              <span className="ml-auto rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-red-400">{urgentCount}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#8f81f8] to-[#5b4be0] shadow-[0_4px_16px_-4px_rgba(124,108,246,0.7)]">
        <Zap className="h-4 w-4 text-white" fill="currentColor" />
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-white">Agence CRM</span>
    </div>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { accounts, vas, settings, now, loading } = useCrm();

  const urgentCount = useMemo(
    () => (loading ? 0 : computeAlerts(accounts, vas, settings, now, formatDuration).urgent.length),
    [accounts, vas, settings, now, loading]
  );

  useEffect(() => setOpen(false), [pathname]);

  const footer = (
    <div className="border-t border-line px-3 pt-4 text-xs text-muted">Heure de Paris</div>
  );

  return (
    <div className="min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-[#0c0c12] px-3 py-5 lg:flex">
        <div className="mb-8 px-2">
          <Brand />
        </div>
        <NavLinks urgentCount={urgentCount} />
        <div className="mt-auto">{footer}</div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-bg/80 px-4 backdrop-blur-xl lg:hidden">
        <Brand />
        <button onClick={() => setOpen(true)} className="relative -mr-2 rounded-xl p-2 text-muted transition hover:bg-white/5 hover:text-white" aria-label="Menu">
          <Menu className="h-5 w-5" />
          {urgentCount > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-bg" />}
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-line bg-[#0c0c12] px-3 py-5 animate-slide-in-left">
            <div className="mb-8 flex items-center justify-between px-2">
              <Brand />
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-muted hover:bg-white/5 hover:text-white" aria-label="Fermer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavLinks urgentCount={urgentCount} onNavigate={() => setOpen(false)} />
            <div className="mt-auto">{footer}</div>
          </aside>
        </div>
      )}

      <main className="lg:pl-60">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
