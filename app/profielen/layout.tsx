import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

/** requireUser beschermt alle /profielen-routes ook server-side (naast de middleware). */
export default async function ProfielenLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <AppShell user={user}>{children}</AppShell>;
}
