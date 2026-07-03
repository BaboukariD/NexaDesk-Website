import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Verifies the bearer token belongs to the admin account.
// Set ADMIN_EMAIL in Vercel env vars to your admin login email.
async function requireAdmin(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) return null;

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  if (!adminEmail) return null;
  if ((user.email || '').toLowerCase().trim() !== adminEmail) return null;

  return user;
}

export default async function handler(req, res) {
  const admin = await requireAdmin(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });

  try {
    // ============ GET ============
    if (req.method === 'GET') {
      const action = req.query.action;

      if (action === 'clients') {
        const { data, error } = await supabase
          .from('Clients')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return res.status(200).json(data);
      }

      if (action === 'leads') {
        const { data, error } = await supabase
          .from('Leads')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return res.status(200).json(data);
      }

      if (action === 'conversations') {
        const leadId = req.query.lead_id;
        if (!leadId) return res.status(400).json({ error: 'Missing lead_id' });
        const { data, error } = await supabase
          .from('Conversations')
          .select('*')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: true });
        if (error) throw error;
        return res.status(200).json(data);
      }

      return res.status(400).json({ error: 'Unknown action' });
    }

    // ============ POST ============
    if (req.method === 'POST') {
      const { action } = req.body || {};

      if (action === 'add-client') {
        const { business_name, contact_name, contact_email, website, plan, system_prompt } = req.body;
        if (!business_name || !contact_email) {
          return res.status(400).json({ error: 'Business name and email are required' });
        }
        const { data, error } = await supabase
          .from('Clients')
          .insert({
            business_name,
            contact_name: contact_name || '',
            contact_email,
            website: website || '',
            plan: plan || 'starter',
            system_prompt: system_prompt || '',
            is_active: true
          })
          .select()
          .single();
        if (error) throw error;
        return res.status(200).json(data);
      }

      if (action === 'toggle-client') {
        const { id, is_active } = req.body;
        if (!id) return res.status(400).json({ error: 'Missing id' });
        const { error } = await supabase
          .from('Clients')
          .update({ is_active: !!is_active })
          .eq('id', id);
        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      return res.status(400).json({ error: 'Unknown action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Admin API error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}