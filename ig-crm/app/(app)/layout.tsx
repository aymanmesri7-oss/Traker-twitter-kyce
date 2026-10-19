import { redirect } from "next/navigation";
import { Toaster } from "sonner";
import { supabaseServer } from "@/lib/supabase/server";
import { CrmDataProvider } from "@/lib/data";
import { Shell } from "@/components/shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { data } = await supabaseServer().auth.getUser();
  if (!data.user) redirect("/login");

  return (
    <CrmDataProvider>
      <Shell email={data.user.email ?? ""}>{children}</Shell>
      <Toaster
        theme="dark"
        position="top-center"
        toastOptions={{ className: "!bg-surface-2 !border-line-strong !text-white !rounded-xl" }}
      />
    </CrmDataProvider>
  );
}
