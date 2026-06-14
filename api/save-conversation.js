const SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://exqdmvloldvshzpxevht.supabase.co';

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  'sb_publishable__bJTNHHD95Uop41LMarPsQ_zjZzk4af';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function cleanMessages(messages) {
  if (!Array.isArray(messages)) return [];

  return messages
    .filter((message) => message && message.role && message.content)
    .map((message) => ({
      role: String(message.role),
      content: String(message.content).slice(0, 8000)
    }))
    .slice(-80);
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const {
    client_id,
    lead_id,
    messages,
    conversation_id
  } = req.body || {};

  if (!client_id) {
    return res.status(400).json({ success: false, error: 'Missing client_id' });
  }

  try {
    const payload = {
      client_id: String(client_id),
      lead_id: lead_id || null,
      messages: cleanMessages(messages)
    };

    const url = conversation_id
      ? `${SUPABASE_URL}/rest/v1/Conversations?id=eq.${conversation_id}`
      : `${SUPABASE_URL}/rest/v1/Conversations`;

    const response = await fetch(url, {
      method: conversation_id ? 'PATCH' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'return=representation'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        success: false,
        error: data?.message || 'Could not save conversation'
      });
    }

    return res.status(200).json({
      success: true,
      conversation: data?.[0] || null
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}