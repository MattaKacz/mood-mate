import path from "path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/db/database.types";

dotenv.config({ path: path.resolve(process.cwd(), ".env.test") });

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Brak wymaganej zmiennej środowiskowej: ${name}`);
  }
  return value;
}

async function clearTables() {
  const supabaseUrl = getRequiredEnv("SUPABASE_URL");
  const supabaseKey = getRequiredEnv("SUPABASE_KEY");

  const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const tablesToClear = ["mood_entries", "generation_error_logs", "users_profile"] as const;

  for (const table of tablesToClear) {
    const { error } = await supabase.from(table).delete().not("id", "is", null);
    if (error) {
      throw new Error(`Nie udało się wyczyścić tabeli ${table}: ${error.message}`);
    }
  }
}

export default async function globalTeardown() {
  await clearTables();
}
