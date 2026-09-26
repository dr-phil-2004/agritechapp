import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const wsTransport = typeof WebSocket === 'undefined' ? require('ws') : WebSocket;

let _instance: SupabaseClient | null = null;

function getInstance(): SupabaseClient {
  if (!_instance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    _instance = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
      realtime: { transport: wsTransport } as Record<string, unknown>,
    });
  }
  return _instance;
}

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_, prop: string | symbol) {
    return (getInstance() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
