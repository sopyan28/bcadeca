import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role client. Bypasses RLS entirely.
 * Only ever import this inside Server Actions / route handlers that need to run
 * privileged RPCs (record_attempt, purchase_item) -- never import in a Client Component
 * or anything that could ship the service key to the browser.
 * Not parameterized with generated types yet -- see lib/supabase/server.ts for why.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
