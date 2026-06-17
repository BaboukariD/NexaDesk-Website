import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const SUPABASE_URL = 'https://exqdmvloldvshzpxevht.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { name, email, phone, preferred_contact, message, client_id } = req.body;

    if (!client_id) return res.status(400).json({ error: 'Missing client_id' });

    // Fetch client
    const clientRes = await fetch(
      `${SUPABASE_URL}/rest/v1/Clients?id=eq.${client_id}&select=*`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    const clients = await clientRes.json();
    if (!clients?.length) return res.status(404).json({ error: 'Client not found' });
    const client = clients[0];

    // Save lead
    const saveRes = await fetch(`${SUPABASE_URL}/rest/v1/Leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'return=representation'
      },
      body: JSON.stringify({
        name: name || '',
        email: email || '',
        phone: phone || '',
        preferred_contact: preferred_contact || '',
        message: message || '',
        client_id: Number(client_id)
      })
    });
    const savedLead = await saveRes.json();

    // Email the client
    if (client.contact_email) {
      await resend.emails.send({
        from: 'NexaDesk <leads@nexadesk.co.uk>',
        to: client.contact_email,
        subject: `🔥 New Lead for ${client.business_name}`,
        html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f0f2f8;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%">
        <tr>
          <td style="background:linear-gradient(135deg,#7c5cff,#9b7bff);border-radius:16px 16px 0 0;padding:32px 40px;text-align:center">
            <p style="margin:0;font-size:28px;font-weight:800;color:white">NexaDesk</p>
            <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,.8)">New lead captured</p>
          </td>
        </tr>
        <tr>
          <td style="background:white;padding:40px">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f7ff;border-radius:12px;border:1px solid #e5e0ff">
              <tr><td style="padding:24px">
                <p style="margin:0 0 16px;font-size:11px;font-weight:600;color:#9da8d6;text-transform:uppercase;letter-spacing:1px">Name</p>
                <p style="margin:0 0 20px;font-size:18px;font-weight:700;color:#1a1a2e">${name || '—'}</p>
                <p style="margin:0 0 8px;font-size:11px;font-weight:600;color:#9da8d6;text-transform:uppercase;letter-spacing:1px">Email</p>
                <p style="margin:0 0 20px"><a href="mailto:${email}" style="color:#7c5cff;text-decoration:none;font-size:15px">${email || '—'}</a></p>
                <p style="margin:0 0 8px;font-size:11px;font-weight:600;color:#9da8d6;text-transform:uppercase;letter-spacing:1px">Phone</p>
                <p style="margin:0 0 20px"><a href="tel:${phone}" style="color:#7c5cff;text-decoration:none;font-size:15px">${phone || '—'}</a></p>
                <p style="margin:0 0 8px;font-size:11px;font-weight:600;color:#9da8d6;text-transform:uppercase;letter-spacing:1px">Preferred Contact</p>
                <p style="margin:0 0 20px;font-size:15px;color:#374151">${preferred_contact || '—'}</p>
                <p style="margin:0 0 8px;font-size:11px;font-weight:600;color:#9da8d6;text-transform:uppercase;letter-spacing:1px">Conversation</p>
                <div style="background:#f0eeff;border-radius:10px;padding:14px;font-size:13px;color:#1f2937;white-space:pre-wrap;line-height:1.6">${message || '—'}</div>
              </td></tr>
            </table>
            <div style="text-align:center;margin-top:24px">
              <a href="https://nexadesk.co.uk/client-login.html" style="background:linear-gradient(135deg,#7c5cff,#9b7bff);color:white;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:700;font-size:14px">View in Dashboard →</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#f8f7ff;border-radius:0 0 16px 16px;padding:16px 40px;text-align:center;border-top:1px solid #ede9ff">
            <p style="margin:0;font-size:12px;color:#9ca3af">© 2026 NexaDesk · <a href="https://nexadesk.co.uk" style="color:#7c5cff;text-decoration:none">nexadesk.co.uk</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
      }).catch(err => console.error('Email error:', err));
    }

    return res.status(200).json(savedLead);

  } catch (err) {
    console.error('Save lead error:', err);
    return res.status(500).json({ error: err.message });
  }
}