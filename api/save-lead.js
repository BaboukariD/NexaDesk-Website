import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const SUPABASE_URL =
  'https://exqdmvloldvshzpxevht.supabase.co';

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {

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
      client_id
    } = req.body;

    // =========================
    // VALIDATION
    // =========================

    if (!client_id) {
      return res.status(400).json({
        error: 'Missing client_id'
      });
    }

    // =========================
    // GET CLIENT
    // =========================

    const clientRes = await fetch(
      `${SUPABASE_URL}/rest/v1/Clients?id=eq.${client_id}&select=*`,
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

    // =========================
    // SAVE LEAD
    // =========================

    const leadPayload = {
      name: name || '',
      email: email || '',
      phone: phone || '',
      preferred_contact: preferred_contact || '',
      message: message || '',
      client_id
    };

    const saveRes = await fetch(
      `${SUPABASE_URL}/rest/v1/Leads`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          Prefer: 'return=representation'
        },
        body: JSON.stringify(leadPayload)
      }
    );

    const savedLead = await saveRes.json();

    // =========================
    // SEND EMAIL TO CLIENT
    // =========================

    if (client.contact_email) {

      await resend.emails.send({
        from: 'NexaDesk <leads@nexadesk.co.uk>',
        to: client.contact_email,
        subject: `New Lead for ${client.business_name}`,
        html: `
          <div style="font-family:Arial,sans-serif;padding:24px;">
            
            <h2>New Lead Captured</h2>

            <p>
              A new visitor submitted their details
              through your NexaDesk assistant.
            </p>

            <hr style="margin:24px 0;" />

            <p><strong>Name:</strong> ${name || 'N/A'}</p>
            <p><strong>Email:</strong> ${email || 'N/A'}</p>
            <p><strong>Phone:</strong> ${phone || 'N/A'}</p>

            <p>
              <strong>Preferred Contact:</strong>
              ${preferred_contact || 'N/A'}
            </p>

            <p>
              <strong>Conversation Summary:</strong>
            </p>

            <div style="
              background:#f5f5f5;
              padding:16px;
              border-radius:12px;
              white-space:pre-wrap;
            ">
              ${message || 'No message'}
            </div>

          </div>
        `
      });

    }

    // =========================
    // SUCCESS
    // =========================

    return res.status(200).json(savedLead);

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      error: err.message
    });

  }

}
