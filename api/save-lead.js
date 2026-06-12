import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
process.env.SUPABASE_URL,
process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(
process.env.RESEND_API_KEY
);

export default async function handler(req, res) {

if (req.method !== 'POST') {

return res.status(405).json({
error: 'Method not allowed'
});

}

try {

const {
name,
email,
phone,
preferred_contact,
message,
client_id
} = req.body;

const { error } = await supabase
.from('Leads')
.insert([
{
name,
email,
phone,
preferred_contact,
message,
client_id
}
]);

if (error) throw error;

await resend.emails.send({

from: 'NexaDesk <onboarding@resend.dev>',

to: 'contact@nexadesk.co.uk',

subject: 'New Lead Captured',

html: `

<h2>New Lead</h2>

<p><strong>Name:</strong> ${name}</p>

<p><strong>Email:</strong> ${email}</p>

<p><strong>Preferred Contact:</strong> ${preferred_contact}</p>

<p><strong>Message:</strong> ${message}</p>

`

});

return res.status(200).json({
success: true
});

} catch (err) {

console.error(err);

return res.status(500).json({
error: 'Failed to save lead'
});

}

}
