import { redirect } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { getServerSession } from "@/lib/server/auth-session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession();
  if (!session) {
    redirect("/login?next=/admin");
  }

  return <AdminShell user={session.user}>{children}</AdminShell>;
}
