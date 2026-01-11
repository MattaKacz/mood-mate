import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types.ts";

const publicSupabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const publicSupabaseKey = import.meta.env.PUBLIC_SUPABASE_KEY;

if (!publicSupabaseUrl || !publicSupabaseKey) {
  throw new Error("PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_KEY must be defined in the environment.");
}

let browserClient: SupabaseClient<Database> | null = null;

export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  if (browserClient) {
    return browserClient;
  }

  browserClient = createClient<Database>(publicSupabaseUrl, publicSupabaseKey, {
    auth: {
      persistSession: true,
    },
  });

  return browserClient;
}
