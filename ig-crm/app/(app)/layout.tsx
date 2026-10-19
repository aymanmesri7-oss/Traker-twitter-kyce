import { Toaster } from "sonner";
import { Zap } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-2.5 px-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#8f81f8] to-[#5b4be0] shadow-[0_4px_16px_-4px_rgba(124,108,246,0.7)]">
            <Zap className="h-4 w-4 text-white" fill="currentColor" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-white">Agence CRM</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6 sm:py-10">{children}</main>
      <Toaster
        theme="dark"
        position="top-center"
        toastOptions={{ className: "!bg-surface-2 !border-line-strong !text-white !rounded-xl" }}
      />
    </>
  );
}
