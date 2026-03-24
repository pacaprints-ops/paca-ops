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

/**
 * Load from Supabase. If nothing there yet, check localStorage and migrate
 * the data up to Supabase automatically (one-time, per device).
 */
export async function getOrMigrateUserData<T>(key: string): Promise<T | null> {
  const remote = await getUserData<T>(key);
  if (remote !== null) return remote;

  if (typeof window === "undefined") return null;
  try {
    const local = localStorage.getItem(key);
    if (!local) return null;
    const parsed = JSON.parse(local) as T;
    await setUserData(key, parsed);
    return parsed;
  } catch {
    return null;
  }
}
