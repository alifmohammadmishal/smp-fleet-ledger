import { createClient } from "@supabase/supabase-js";

// The publishable/anon key is safe to expose in client code — access control
// is enforced by Postgres Row Level Security policies on the database, not
// by keeping this key secret. Fallback values below mean the app works even
// if environment variables aren't configured on the hosting platform.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://vfpftsqnlbrfcxiugqku.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_pWXTxyUUMnh_XGMwoeKWmw_NPVj14qp";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
