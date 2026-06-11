export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { clientId, messages } = req.body;

  if (!clientId) {
    return res.status(400).json({ error: 'Client ID required' });
  }

  // Fetch client data from Supabase
  const clientResponse = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/clients?id=eq.${clientId}&select=*`,
    {
      headers: {
        'apikey': process.env.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
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
model: 'claude-3-haiku-20240307',
max_tokens: 200,
system: client.system_prompt,
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
