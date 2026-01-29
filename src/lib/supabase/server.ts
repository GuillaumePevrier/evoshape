import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "./config";
import { getSupabaseServerEnvStatus } from "@/src/lib/env/server";

export async function createSupabaseServerClient() {
  const envStatus = getSupabaseServerEnvStatus();
  if (!envStatus.ok) {
    throw new Error(
      `supabase-env-missing:${envStatus.missing.join(",")}`
    );
  }
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value;
      },
      set(name, value, options: CookieOptions) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name, options: CookieOptions) {
        cookieStore.set({ name, value: "", ...options });
      },
    },
  });
}
