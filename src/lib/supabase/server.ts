import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { getServerEnv } from "@/lib/env";
import type { AppDatabase } from "@/lib/supabase/app-database.types";

const AUTH_STORAGE_KEY = "sightline-auth";
const COOKIE_CHUNK_SIZE = 3_500;
const MAX_COOKIE_CHUNKS = 8;

type CookieOptions = {
  httpOnly: boolean;
  path: string;
  sameSite: "lax";
  secure: boolean;
};

function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  };
}

function cookieName(key: string, index: number): string {
  const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80);
  return index === 0 ? safeKey : `${safeKey}.${index}`;
}

export async function createServerSupabaseClient(): Promise<
  SupabaseClient<AppDatabase>
> {
  const env = getServerEnv();
  const cookieStore = await cookies();

  return createClient<AppDatabase>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        flowType: "pkce",
        persistSession: true,
        storageKey: AUTH_STORAGE_KEY,
        storage: {
          isServer: true,
          getItem: (key) => {
            let value = "";
            for (let index = 0; index < MAX_COOKIE_CHUNKS; index += 1) {
              const chunk = cookieStore.get(cookieName(key, index))?.value;
              if (!chunk) break;
              value += chunk;
            }
            return value || null;
          },
          setItem: (key, value) => {
            try {
              const chunks = Array.from(
                { length: Math.ceil(value.length / COOKIE_CHUNK_SIZE) },
                (_, index) =>
                  value.slice(
                    index * COOKIE_CHUNK_SIZE,
                    (index + 1) * COOKIE_CHUNK_SIZE,
                  ),
              );
              chunks.forEach((chunk, index) => {
                cookieStore.set(
                  cookieName(key, index),
                  chunk,
                  cookieOptions(),
                );
              });
              for (
                let index = chunks.length;
                index < MAX_COOKIE_CHUNKS;
                index += 1
              ) {
                cookieStore.delete(cookieName(key, index));
              }
            } catch {
              // Server Components cannot mutate cookies. Proxy refreshes them.
            }
          },
          removeItem: (key) => {
            try {
              for (let index = 0; index < MAX_COOKIE_CHUNKS; index += 1) {
                cookieStore.delete(cookieName(key, index));
              }
            } catch {
              // Server Components cannot mutate cookies.
            }
          },
        },
      },
      global: {
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            cache: "no-store",
          }),
      },
    },
  );
}

export function createAdminSupabaseClient(): SupabaseClient<AppDatabase> {
  const env = getServerEnv();

  return createClient<AppDatabase>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            cache: "no-store",
          }),
      },
    },
  );
}
