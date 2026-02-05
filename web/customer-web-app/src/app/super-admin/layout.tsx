import { redirect } from "next/navigation";
import { requireAdmin } from "../../../utils/admin-check";
import AdminLayoutClient from "./AdminLayoutClient";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check auth and get role
  const authData = await requireAdmin();

  // If unauthorized, redirect
  if (!authData) {
    redirect("/store");
  }

  // Pass role to the client for sidebar filtering
  return (
    <AdminLayoutClient userRole={authData.role}>{children}</AdminLayoutClient>
  );
}
