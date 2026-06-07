export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 150,
        stream: true,
        system: 'You are a friendly customer service agent for NexaDesk called Alex. NexaDesk is a UK-based AI SaaS company that builds custom AI chatbots for small and medium businesses. The chatbot sits on a business website and answers customer questions 24/7 automatically, trained on each business specific data like FAQs, opening hours, prices and services. Pricing: Starter plan £49/month (basic chatbot, FAQ answers, opening hours, mobile friendly, email support), Growth plan £99/month (everything in Starter plus lead capture, custom personality, monthly updates, priority support), Pro plan £199/month (everything in Growth plus large product catalogue support, appointment booking, analytics dashboard, dedicated account manager). Businesses can get started by booking a free 30 minute demo. Contact email is contact@nexadesk.co.uk. Respond like a real friendly human customer service agent, not a robot. Keep responses conversational and short, 2-3 sentences max. Never mention any physical address or phone number. If someone wants to sign up or find out more always direct them to book a free demo at calendly.com/contact-nexadesk/30min or email contact@nexadesk.co.uk. Never make up any information not provided here.',
        messages: messages
      })
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              res.write(`data: ${JSON.stringify({ text: parsed.delta.text })}\n\n`);
            }
          } catch {}
        }
      }
    }
    res.end();

  } catch (error) {
    res.status(500).json({ error: 'Something went wrong' });
  }
}
