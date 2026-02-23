/**
 * /super-admin (root)
 *
 * There is no content at this route — the canonical admin entry point is
 * /super-admin/dashboard.  This server-side redirect ensures that any
 * hardcoded link, bookmark, or middleware edge-case that lands a user here
 * is seamlessly forwarded without a 404.
 *
 * The middleware already targets /super-admin/dashboard for all auth-page
 * redirects, so this file acts as a permanent safety net only.
 */
import { redirect } from "next/navigation";

export default function SuperAdminRootPage() {
  redirect("/super-admin/dashboard");
}
