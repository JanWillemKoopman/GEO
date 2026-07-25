import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

/** requireUser beschermt alle /analyses-routes ook server-side (naast de middleware). */
export default async function AnalysesLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <AppShell user={user}>{children}</AppShell>;
}
