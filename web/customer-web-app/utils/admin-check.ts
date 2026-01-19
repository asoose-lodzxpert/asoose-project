import { createClient } from "./supabase/server";

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN_MANAGER', 'ADMIN_SUPPORT', 'ADMIN_FINANCE'];

export async function requireAdmin() {
  const supabase = await createClient();
  
  // 1. Check User Session
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  // 2. Check Role in Database
  // Using 'User' table to match Prisma schema and Middleware
  const { data: profile, error: profileError } = await supabase
    .from('User')
    .select('role')
    .eq('id', user.id)
    .single(); 

  if (profileError || !profile) {
    console.error("❌ Admin Check Failed: Profile not found.");
    return null;
  }

  if (!ADMIN_ROLES.includes(profile.role)) {
    console.error(`❌ Admin Check Failed: Role '${profile.role}' is not an admin role.`);
    return null;
  }

  // Return both user and role for frontend permission logic
  return { user, role: profile.role };
}