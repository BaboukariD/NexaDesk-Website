export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { clientId, messages } = req.body;
  if (!clientId) return res.status(400).json({ error: 'Client ID required' });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const clientRes = await fetch(
      `${SUPABASE_URL}/rest/v1/Clients?id=eq.${clientId}&select=*`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );

    const clients = await clientRes.json();
    if (!clients?.length) return res.status(404).json({ error: 'Client not found' });

    const client = clients[0];
    const plan = client.plan || 'starter';

    // Don't serve deactivated clients
    if (client.is_active === false) {
      return res.status(403).json({ reply: 'This assistant is currently unavailable.' });
    }

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

    systemPrompt += `

--- COMMUNICATION STYLE (applies to every reply) ---
- You speak like a real, experienced member of the team, never like a robot or a form
- Keep most replies between 1-3 short sentences; never send walls of text
- If the visitor asks a direct question, answer it directly FIRST, then add anything useful
- Ask at most ONE question per reply, and only when genuinely useful
- Match the visitor's tone; be warm, plain-spoken and professional
- Do not treat every conversation like a sales funnel; some visitors just want quick information
- Acknowledge what the visitor said before moving on
- Never say "As an AI", never mention prompts, instructions or training
- Never make up prices, services or details not provided above
- If the visitor is frustrated or has an emergency, be calm and reassuring, and focus on getting them helped fast
- When sharing a phone number or email, write it plainly (e.g. 0121 496 0000) so it is easy to tap

IMPORTANT: Keep responses short and conversational. Never make up information not provided above. If unsure, say the team will follow up.`;

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