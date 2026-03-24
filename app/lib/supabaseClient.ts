import { createBrowserClient } from "@supabase/ssr";

// Use createBrowserClient so auth session is stored in cookies (not localStorage)
// This keeps pages in sync with the SSR middleware which also reads from cookies
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
