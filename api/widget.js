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

function buildKnowledgePrompt(client) {
  const basePrompt =
    client.system_prompt ||
    `You are a friendly and professional AI assistant for ${client.business_name || 'this business'}.
Your job is to help website visitors, answer questions clearly and concisely, and guide interested visitors toward booking a call or getting in touch.
Keep responses short, warm and helpful. Never make up specific prices, policies, guarantees, availability, or legal advice.`;

  const knowledge = client.knowledge_base
    ? `

Client-approved business knowledge:
${client.knowledge_base}`
    : '';

  const faqs = Array.isArray(client.faq_json) && client.faq_json.length
    ? `

Client-approved FAQs:
${client.faq_json
  .map((item, index) => `${index + 1}. Q: ${item.question}\nA: ${item.answer}`)
  .join('\n\n')}`
    : '';

  return `${basePrompt}${knowledge}${faqs}

Rules:
- Use the client-approved knowledge above as your source of truth.
- If the answer is not in the provided knowledge, be honest and offer to take the visitor's details so the business can follow up.
- Ask one question at a time when qualifying a lead.
- Keep replies under 120 words unless the visitor asks for detail.`;
}

function cleanMessages(messages) {
  if (!Array.isArray(messages)) return [];

  return messages
    .filter((msg) => ['user', 'assistant'].includes(msg.role) && msg.content)
    .map((msg) => ({
      role: msg.role,
      content: String(msg.content).slice(0, 4000)
    }))
    .slice(-20);
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { clientId, messages } = req.body || {};

  if (!clientId) {
    return res.status(400).json({ error: 'Client ID required' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({
      reply: 'The AI assistant is not configured yet.'
    });
  }

  try {
    const clientResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/Clients?id=eq.${clientId}&select=*&limit=1`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`
        }
      }
    );

    const clients = await clientResponse.json();

    if (!clientResponse.ok) {
      return res.status(500).json({
        error: clients?.message || 'Could not load client'
      });
    }

    if (!clients.length || clients[0].is_active === false) {
      return res.status(404).json({
        reply: 'This assistant is not available right now.'
      });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5',
        max_tokens: 500,
        system: buildKnowledgePrompt(clients[0]),
        messages: cleanMessages(messages)
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        reply: 'Sorry, the assistant had trouble answering just now.',
        error: data?.error?.message || data?.message || 'Anthropic request failed'
      });
    }

    const reply =
      data.content?.find((item) => item.type === 'text')?.text ||
      data.content?.[0]?.text ||
      'Sorry, I could not generate a reply.';

    return res.status(200).json({ reply });
  } catch (error) {
    return res.status(500).json({
      reply: 'Sorry, the assistant is temporarily unavailable.',
      error: error.message
    });
  }
}