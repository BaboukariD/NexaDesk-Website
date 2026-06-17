export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { clientId, messages } = req.body;
  if (!clientId) return res.status(400).json({ error: 'Client ID required' });

  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://exqdmvloldvshzpxevht.supabase.co';
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4cWRtdmxvbGR2c2h6cHhldmh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMzc5NDQsImV4cCI6MjA5NjYxMzk0NH0.nI_pnnKo236Bd6whjvfvZMGnStJz8q4y6ttENmiNgxg';

  try {
    const clientRes = await fetch(
      `${SUPABASE_URL}/rest/v1/Clients?id=eq.${clientId}&select=*`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );

    const clients = await clientRes.json();
    if (!clients?.length) return res.status(404).json({ error: 'Client not found' });

    const client = clients[0];
    const plan = client.plan || 'starter';

    // Build system prompt
    let systemPrompt = client.system_prompt || `You are a helpful AI assistant for ${client.business_name || 'this business'}. Be friendly, concise and professional.`;

    if (client.knowledge_base?.trim()) {
      systemPrompt += `\n\n--- BUSINESS KNOWLEDGE ---\n${client.knowledge_base.trim()}`;
    }

    if (Array.isArray(client.faq_json) && client.faq_json.length) {
      const faqs = client.faq_json
        .filter(f => f.question && f.answer)
        .map(f => `Q: ${f.question}\nA: ${f.answer}`)
        .join('\n\n');
      if (faqs) systemPrompt += `\n\n--- FAQs ---\n${faqs}`;
    }

    systemPrompt += `\n\nIMPORTANT: Keep responses short and conversational. Never make up information not provided above. If unsure, say the team will follow up.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 500,
        system: systemPrompt,
        messages: messages.map(m => ({ role: m.role, content: m.content }))
      })
    });

    const data = await response.json();
    const reply = data.content?.[0]?.text || 'Sorry, I had trouble responding.';

    // Return plan so embed.js knows what features to enable
    return res.status(200).json({
      reply,
      businessName: client.business_name || 'AI Assistant',
      plan
    });

  } catch (err) {
    console.error('Widget error:', err);
    return res.status(500).json({ reply: 'Something went wrong. Please try again.' });
  }
}