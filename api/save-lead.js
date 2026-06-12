import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
process.env.SUPABASE_URL,
process.env.SUPABASE_SERVICE_ROLE_KEY
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

const { data, error } = await supabase
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