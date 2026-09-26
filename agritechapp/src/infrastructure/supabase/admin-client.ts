import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// In Node.js < 22, Supabase Realtime requires the 'ws' package.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const wsTransport = typeof WebSocket === 'undefined' ? require('ws') : WebSocket;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  realtime: { transport: wsTransport } as Record<string, unknown>,
});
