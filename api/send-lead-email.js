import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { name, email, phone, preferred_contact, message } = req.body;

    await resend.emails.send({
      from: 'NexaDesk <leads@nexadesk.co.uk>',
      to: 'contact@nexadesk.co.uk',
      subject: `🔔 New Enquiry: ${name}`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f0f2f8;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%">

        <tr>
          <td style="background:linear-gradient(135deg,#7c5cff,#9b7bff);border-radius:16px 16px 0 0;padding:32px 40px;text-align:center">
            <p style="margin:0;font-size:28px;font-weight:800;color:white">NexaDesk</p>
            <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,.8)">New website enquiry</p>
          </td>
        </tr>

        <tr>
          <td style="background:#5b21b6;padding:14px 40px;text-align:center">
            <p style="margin:0;font-size:15px;font-weight:600;color:white">🔔 Someone wants to get started!</p>
          </td>
        </tr>

        <tr>
          <td style="background:white;padding:40px">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f7ff;border-radius:12px;border:1px solid #e5e0ff">
              <tr><td style="padding:24px">
                <table width="100%" cellpadding="0" cellspacing="0">

                  <tr><td style="padding-bottom:16px;border-bottom:1px solid #ede9ff">
                    <p style="margin:0;font-size:11px;font-weight:600;color:#9da8d6;text-transform:uppercase;letter-spacing:1px">Name</p>
                    <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#1a1a2e">${name || '—'}</p>
                  </td></tr>

                  <tr><td style="padding:16px 0;border-bottom:1px solid #ede9ff">
                    <p style="margin:0;font-size:11px;font-weight:600;color:#9da8d6;text-transform:uppercase;letter-spacing:1px">Email</p>
                    <p style="margin:4px 0 0;font-size:15px"><a href="mailto:${email}" style="color:#7c5cff;text-decoration:none">${email || '—'}</a></p>
                  </td></tr>

                  <tr><td style="padding:16px 0;border-bottom:1px solid #ede9ff">
                    <p style="margin:0;font-size:11px;font-weight:600;color:#9da8d6;text-transform:uppercase;letter-spacing:1px">Phone</p>
                    <p style="margin:4px 0 0;font-size:15px"><a href="tel:${phone}" style="color:#7c5cff;text-decoration:none">${phone || '—'}</a></p>
                  </td></tr>

                  <tr><td style="padding-top:16px">
                    <p style="margin:0;font-size:11px;font-weight:600;color:#9da8d6;text-transform:uppercase;letter-spacing:1px">Details</p>
                    <p style="margin:8px 0 0;font-size:14px;color:#374151;white-space:pre-wrap;line-height:1.6">${message || '—'}</p>
                  </td></tr>

                </table>
              </td></tr>
            </table>

            <p style="margin:24px 0 0;font-size:13px;color:#9da8d6;text-align:center">
              Submitted via nexadesk.co.uk
            </p>
          </td>
        </tr>

        <tr>
          <td style="background:#f8f7ff;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;border-top:1px solid #ede9ff">
            <p style="margin:0;font-size:12px;color:#9da8d6">© 2026 NexaDesk · <a href="https://nexadesk.co.uk" style="color:#7c5cff;text-decoration:none">nexadesk.co.uk</a></p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}