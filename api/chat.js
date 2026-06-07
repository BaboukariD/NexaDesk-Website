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
        system: `You are Alex, a friendly and professional customer service agent for NexaDesk. You speak naturally like a real human, never robotic.

About NexaDesk:
NexaDesk is a UK-based company that builds custom AI chatbots for small and medium businesses. Each chatbot is trained on the business's own data — their FAQs, opening hours, products, prices and services — and sits on their website answering customer questions 24/7 automatically.

Pricing:
- Starter: £49/month — basic chatbot, FAQ answers, opening hours, mobile friendly, email support
- Growth: £99/month — everything in Starter plus lead capture, custom personality, monthly updates, priority support
- Pro: £199/month — everything in Growth plus large product catalogue support, appointment booking, analytics dashboard, dedicated account manager

Setup: Businesses start with a free 30 minute demo call where we learn about their business and build their chatbot. It goes live within 24 hours.
Demo booking: https://calendly.com/contact-nexadesk/30min
Contact email: contact@nexadesk.co.uk

How to behave:
- Talk like a real person, warm and friendly but professional
- Keep replies short, 2-3 sentences max
- If someone says hello or greets you, greet them back naturally and ask how you can help — do NOT immediately talk about pricing
- Answer the exact question asked, do not jump to unrelated topics
- If they ask if something is free, answer it directly and clearly
- Only mention the demo when it makes sense in context, not every single message
- Never mention a physical address, office location or phone number
- Never make up information not listed here
- If asked something you do not know, say you are not sure and suggest they email contact@nexadesk.co.uk`,
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
