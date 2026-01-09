import { createClient } from "./supabase/server";
export async function requireSuperAdmin() {
  const supabase = await createClient();
  
  // 1. Check User Session
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("❌ Admin Check Failed: No User Session found.");
    return null;
  }

  // 2. Check Profile Role
  // CHANGED: .single() -> .maybeSingle() to handle missing rows gracefully
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle(); 

  if (profileError) {
    console.error("❌ Admin Check Failed: DB Error.", profileError.message);
    return null;
  }

  if (!profile) {
    console.error("❌ Admin Check Failed: Profile not found for user. (Did you seed the DB and delete your row?)");
    return null;
  }

  if (profile.role !== 'super_admin') {
    console.error(`❌ Admin Check Failed: User role is '${profile.role}', expected 'super_admin'.`);
    return null;
  }

  return user;
}