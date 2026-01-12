import { createClient } from "../../utils/supabase/client";
export async function uploadBannerImage(file: File) {
  const supabase = createClient();
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random()}.${fileExt}`;
  const filePath = `banners/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('marketplace_assets') // Ensure this bucket exists in Supabase
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from('marketplace_assets')
    .getPublicUrl(filePath);

  return data.publicUrl; // Use this URL in your form submission
}