// as/customer-web-app/src/app/super-admin/layout.tsx

import { redirect } from "next/navigation";
import { requireSuperAdmin } from "../../../utils/admin-check";
import AdminLayoutClient from "./AdminLayoutClient";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This runs strictly on the server
  const user = await requireSuperAdmin();

  // If the server check fails (no session or wrong role), redirect immediately
  if (!user) {
    redirect("/store");
  }

  // If authorized, pass the children into the Client-side UI
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}