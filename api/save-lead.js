import { Resend } from 'resend';

console.log(
  'RESEND KEY EXISTS:',
  !!process.env.RESEND_API_KEY
);

const resend = new Resend(
  process.env.RESEND_API_KEY
);

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
      client_id,
      score,
      score_reason
    } = req.body;

    console.log('REQUEST BODY:', req.body);

    // =========================
    // VALIDATION
    // =========================

    if (!client_id) {

      console.log('MISSING CLIENT ID');

      return res.status(400).json({
        error: 'Missing client_id'
      });

    }

    // =========================
    // FETCH CLIENT
    // =========================

    console.log('FETCHING CLIENT...');

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

    console.log('CLIENTS:', clients);

    if (!clients || clients.length === 0) {

      console.log('CLIENT NOT FOUND');

      return res.status(404).json({
        error: 'Client not found'
      });

    }

    const client = clients[0];

    console.log('CLIENT FOUND:', client);

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

    console.log(
      'SAVING LEAD:',
      leadPayload
    );

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

    console.log(
      'SAVED LEAD:',
      savedLead
    );

    // =========================
    // SEND EMAIL
    // =========================

    console.log(
      'CLIENT EMAIL:',
      client.contact_email
    );

    if (client.contact_email) {

      console.log(
        'ATTEMPTING EMAIL SEND'
      );

      const emailResult =
        await resend.emails.send({

          from:
            'NexaDesk <leads@nexadesk.co.uk>',

          to: client.contact_email,

          subject:
            `🔥 New Lead for ${client.business_name}`,

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
                  ${name || 'N/A'}
                </p>

                <p>
                  <strong>Email:</strong>
                  ${email || 'N/A'}
                </p>

                <p>
                  <strong>Phone:</strong>
                  ${phone || 'N/A'}
                </p>

                <p>
                  <strong>
                    Preferred Contact:
                  </strong>
                  ${preferred_contact || 'N/A'}
                </p>

                ${Number.isFinite(parsedScore) ? `
                <p>
                  <strong>Lead Score:</strong>
                  ${leadPayload.score}/100${score_reason ? ` — ${score_reason}` : ''}
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
                    ${message || 'No conversation'}
                  </div>

                </div>

              </div>

            </div>
          `
        });

      console.log(
        'EMAIL RESULT:',
        emailResult
      );

    } else {

      console.log(
        'NO CLIENT EMAIL FOUND'
      );

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
