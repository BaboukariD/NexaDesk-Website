export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { client_id, lead_id, messages } = req.body;

  const SUPABASE_URL = "https://exqdmvloldvshzpxevht.supabase.co";
  const SUPABASE_KEY = "sb_publishable__bJTNHHD95Uop41LMarPsQ_zjZzk4af";

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/Conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        client_id,
        lead_id: lead_id || null,
        messages
      })
    });

    const data = await response.json();
    res.status(200).json({ success: true, data });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}