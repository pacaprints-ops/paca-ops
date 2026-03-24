import { supabaseBrowser } from "./supabaseBrowser";

export async function getUserData<T>(key: string): Promise<T | null> {
  const supabase = supabaseBrowser();
  const { data } = await supabase
    .from("user_data")
    .select("value")
    .eq("key", key)
    .single();
  return data?.value ?? null;
}

export async function setUserData<T>(key: string, value: T): Promise<void> {
  const supabase = supabaseBrowser();
  await supabase
    .from("user_data")
    .upsert({ key, value, updated_at: new Date().toISOString() });
}
