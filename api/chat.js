export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;

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
        system: 'You are a friendly AI assistant for NexaDesk. Keep all responses short, maximum 2-3 sentences. If anyone wants to book, get pricing, or find out more, always direct them to book a free demo at calendly.com/contact-nexadesk/30min. Do not mention phone numbers, offices, addresses, or any contact details other than the Calendly link. Never make up information that has not been provided to you.',
        messages: [{ role: 'user', content: message }]
      })
    });

    const data = await response.json();
    res.status(200).json({ reply: data.content[0].text });

  } catch (error) {
    res.status(500).json({ error: 'Something went wrong' });
  }
}
