export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { client_id, conversation_id, messages } = req.body;

  const SUPABASE_URL = 'https://exqdmvloldvshzpxevht.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4cWRtdmxvbGR2c2h6cHhldmh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMzc5NDQsImV4cCI6MjA5NjYxMzk0NH0.nI_pnnKo236Bd6whjvfvZMGnStJz8q4y6ttENmiNgxg';

  try {
    let conversation = null;

    if (conversation_id) {
      // Update existing conversation
      await fetch(
        `${SUPABASE_URL}/rest/v1/Conversations?id=eq.${conversation_id}`,
        {
          method: 'PATCH',
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ messages })
        }
      );
      conversation = { id: conversation_id };
    } else {
      // Create new conversation
      const r = await fetch(`${SUPABASE_URL}/rest/v1/Conversations`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation'
        },
        body: JSON.stringify({ client_id: String(client_id), messages })
      });
      const data = await r.json();
      conversation = data?.[0] || null;
    }

    return res.status(200).json({ success: true, conversation });
  } catch (err) {
    console.error('Save conversation error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}