import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const SUPABASE_URL = 'https://exqdmvloldvshzpxevht.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { client_id, conversation_id, messages } = req.body;

  try {
    let conversation = null;

    if (conversation_id) {
      // Update existing conversation
      await fetch(`${SUPABASE_URL}/rest/v1/Conversations?id=eq.${conversation_id}`, {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messages })
      });
      conversation = { id: conversation_id };

      // Send email notification when conversation ends (has 6+ messages = meaningful chat)
      if (Array.isArray(messages) && messages.length >= 6) {
        try {
          // Get client email
          const clientRes = await fetch(
            `${SUPABASE_URL}/rest/v1/Clients?id=eq.${client_id}&select=contact_email,business_name`,
            { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
          );
          const clients = await clientRes.json();
          const client = clients?.[0];

          if (client?.contact_email) {
            const transcript = messages
              .map(m => `${m.role === 'user' ? '👤 Visitor' : '🤖 AI'}: ${m.content}`)
              .join('\n\n');

            await resend.emails.send({
              from: 'NexaDesk <leads@nexadesk.co.uk>',
              to: client.contact_email,
              subject: `💬 New conversation on ${client.business_name}`,
              html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f0f2f8;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%">
        <tr>
          <td style="background:linear-gradient(135deg,#7c5cff,#9b7bff);border-radius:16px 16px 0 0;padding:28px 40px;text-align:center">
            <p style="margin:0;font-size:24px;font-weight:800;color:white">NexaDesk</p>
            <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,.8)">New conversation on your website</p>
          </td>
        </tr>
        <tr>
          <td style="background:white;padding:32px 40px">
            <p style="margin:0 0 20px;font-size:15px;color:#374151">A visitor just had a conversation with your AI assistant. Here's the full transcript:</p>
            <div style="background:#f8f7ff;border-radius:12px;border:1px solid #e5e0ff;padding:20px;white-space:pre-wrap;font-size:13px;line-height:1.8;color:#1f2937">${transcript}</div>
            <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;text-align:center">Powered by NexaDesk · nexadesk.co.uk</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
            });
          }
        } catch (emailErr) {
          console.error('Conversation email error:', emailErr);
        }
      }

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