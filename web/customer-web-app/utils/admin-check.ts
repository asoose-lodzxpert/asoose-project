import { getServerSession } from "next-auth"; // <--- v4 Import
import { authOptions } from "./authOptions";
const ADMIN_ROLES = [
  "SUPER_ADMIN",
  "ADMIN_MANAGER",
  "ADMIN_SUPPORT",
  "ADMIN_FINANCE",
];

export async function requireAdmin() {
  const session = await getServerSession(authOptions); // <--- v4 Usage

  if (!session || !session.user) {
    console.error("❌ Admin Check Failed: No session found.");
    return null;
  }

  const userRole = session.user.role;

  if (!ADMIN_ROLES.includes(userRole)) {
    console.error(
      `❌ Admin Check Failed: Role '${userRole}' is not an admin role.`,
    );
    return null;
  }

  return {
    user: session.user,
    role: userRole,
  };
}
