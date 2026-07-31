import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Server Component / Server Action client -- respects RLS as the calling user.
 * Not parameterized with generated types yet (see lib/supabase/database.types.ts) --
 * run `npm run supabase:types` once the local Supabase instance is up and re-add
 * `createServerClient<Database>` for full column typing.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet: CookieToSet[]) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component render -- middleware refreshes the session instead.
          }
        },
      },
    }
  );
}
