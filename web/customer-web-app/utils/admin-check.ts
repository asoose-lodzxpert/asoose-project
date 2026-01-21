import { auth } from "@/auth";

const ADMIN_ROLES = [
  "SUPER_ADMIN",
  "ADMIN_MANAGER",
  "ADMIN_SUPPORT",
  "ADMIN_FINANCE",
];

export async function requireAdmin() {
  // Get session from NextAuth
  const session = await auth();

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

  // Return both user and role for frontend permission logic
  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    },
    role: userRole,
  };
}
