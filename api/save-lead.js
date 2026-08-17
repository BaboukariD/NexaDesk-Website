import { Resend } from 'resend';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

const resend = new Resend(
  process.env.RESEND_API_KEY
);

const SUPABASE_URL =
  'https://exqdmvloldvshzpxevht.supabase.co';

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {

  // Called cross-origin from embed.js on a client's own website.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {

    return res.status(405).json({
      error: 'Method not allowed'
    });

  }

  try {

    // =========================
    // REQUEST DATA
    // =========================

    const {
      name,
      email,
      phone,
      preferred_contact,
      message,
      client_id,
      score,
      score_reason
    } = req.body;

    // =========================
    // VALIDATION
    // =========================

    if (!client_id || !/^\d+$/.test(String(client_id))) {
      return res.status(400).json({
        error: 'Missing or invalid client_id'
      });
    }

    // =========================
    // FETCH CLIENT
    // =========================

    const clientRes = await fetch(
      `${SUPABASE_URL}/rest/v1/Clients?id=eq.${encodeURIComponent(client_id)}&select=*`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`
        }
      }
    );

    const clients = await clientRes.json();

    if (!clients || clients.length === 0) {
      return res.status(404).json({
        error: 'Client not found'
      });
    }

    const client = clients[0];

    // Don't let leads land against a client that's been switched off
    if (client.is_active === false) {
      return res.status(403).json({ error: 'Client is not active' });
    }

    // =========================
    // SAVE LEAD
    // =========================

    const parsedScore = Number(score);

    const leadPayload = {
      name: name || '',
      email: email || '',
      phone: phone || '',
      preferred_contact:
        preferred_contact || '',
      message: message || '',
      client_id: Number(client_id),
      score: Number.isFinite(parsedScore) ? Math.max(0, Math.min(100, Math.round(parsedScore))) : null,
      score_reason: (score_reason || '').slice(0, 200)
    };

    const saveRes = await fetch(
      `${SUPABASE_URL}/rest/v1/Leads`,
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json',
          apikey: SUPABASE_KEY,
          Authorization:
            `Bearer ${SUPABASE_KEY}`,
          Prefer: 'return=representation'
        },
        body: JSON.stringify(
          leadPayload
        )
      }
    );

    const savedLead =
      await saveRes.json();

    // =========================
    // SEND EMAIL
    // =========================

    if (client.contact_email) {

      await resend.emails.send({

          from:
            'NexaDesk <leads@nexadesk.co.uk>',

          to: client.contact_email,

          subject:
            `🔥 New Lead for ${client.business_name || 'your business'}`,

          html: `
            <div style="
              font-family:Arial,sans-serif;
              padding:24px;
              background:#f9fafb;
            ">

              <div style="
                max-width:600px;
                margin:auto;
                background:white;
                border-radius:16px;
                padding:32px;
                border:1px solid #e5e7eb;
              ">

                <h1 style="
                  margin-top:0;
                  color:#7c3aed;
                ">
                  New Lead Captured 🚀
                </h1>

                <p>
                  A new visitor submitted
                  their details through
                  your NexaDesk assistant.
                </p>

                <hr style="
                  margin:24px 0;
                  border:none;
                  border-top:1px solid #eee;
                " />

                <p>
                  <strong>Name:</strong>
                  ${escapeHtml(name) || 'N/A'}
                </p>

                <p>
                  <strong>Email:</strong>
                  ${escapeHtml(email) || 'N/A'}
                </p>

                <p>
                  <strong>Phone:</strong>
                  ${escapeHtml(phone) || 'N/A'}
                </p>

                <p>
                  <strong>
                    Preferred Contact:
                  </strong>
                  ${escapeHtml(preferred_contact) || 'N/A'}
                </p>

                ${Number.isFinite(parsedScore) ? `
                <p>
                  <strong>Lead Score:</strong>
                  ${leadPayload.score}/100${score_reason ? ` — ${escapeHtml(score_reason)}` : ''}
                </p>
                ` : ''}

                <div style="
                  margin-top:28px;
                ">

                  <h3>
                    Conversation Summary
                  </h3>

                  <div style="
                    background:#f3f4f6;
                    padding:18px;
                    border-radius:12px;
                    white-space:pre-wrap;
                    line-height:1.6;
                    color:#111827;
                  ">
                    ${escapeHtml(message) || 'No conversation'}
                  </div>

                </div>

              </div>

            </div>
          `
        });

    }

    // =========================
    // SUCCESS
    // =========================

    return res.status(200).json(
      savedLead
    );

  } catch (err) {

    console.error(
      'SAVE LEAD ERROR:',
      err
    );

    return res.status(500).json({
      error: err.message
    });

  }

}
