import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Used by client-login.html "Activate account" tab.
// After RLS, the browser can no longer check the Clients table
// unauthenticated — so this endpoint does it server-side.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body || {};
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Missing email' });
  }

  try {
    const { data, error } = await supabase
      .from('Clients')
      .select('id')
      .eq('contact_email', email.trim())
      .limit(1);

    if (error) throw error;
    const found = !!(data && data.length);
    return res.status(200).json({ registered: found, exists: found });
  } catch (err) {
    console.error('check-client error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}