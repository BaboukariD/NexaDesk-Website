export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { clientId, messages } = req.body;

  if (!clientId) {
    return res.status(400).json({ error: 'Client ID required' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || "https://exqdmvloldvshzpxevht.supabase.co";
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || "sb_publishable__bJTNHHD95Uop41LMarPsQ_zjZzk4af";

  // Fetch client data from Supabase
  const clientResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/Clients?id=eq.${clientId}&select=*`,
    {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    }
  );

  const clients = await clientResponse.json();
  console.log("CLIENT RESPONSE:", clients);


  if (!clients.length) {
    return res.status(404).json({
  error: 'Client not found',
  data: clients
});
  }

  const client = clients[0];

  const systemPrompt = client.system_prompt || `You are a friendly and professional AI assistant for a business. 
Your job is to help website visitors, answer their questions clearly and concisely, 
and guide interested visitors toward booking a call or getting in touch. 
Keep responses short, warm and helpful. Never make up specific prices or policies.`;

  // Call Claude with client's system prompt
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
max_tokens: 500,
system: systemPrompt,
messages: messages.map(msg => ({
role: msg.role,
content: msg.content
}))
})
});

const data = await response.json();

console.log("CLAUDE RESPONSE:", data);

const reply = data.content?.[0]?.text || JSON.stringify(data);

return res.status(200).json({ reply });

} catch (error) {

console.error("SERVER ERROR:", error);

return res.status(500).json({
reply: "Server crashed: " + error.message
});

}


}