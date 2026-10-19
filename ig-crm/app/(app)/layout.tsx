import { Toaster } from "sonner";
import { CrmDataProvider } from "@/lib/data";
import { Shell } from "@/components/shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <CrmDataProvider>
      <Shell>{children}</Shell>
      <Toaster
        theme="dark"
        position="top-center"
        toastOptions={{ className: "!bg-surface-2 !border-line-strong !text-white !rounded-xl" }}
      />
    </CrmDataProvider>
  );
}
