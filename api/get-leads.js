import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
process.env.SUPABASE_URL,
process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {

try {

const { data, error } = await supabase
.from('Leads')
.select('*')
.order('created_at', {
ascending: false
});

if (error) throw error;

return res.status(200).json(data);

} catch (err) {

console.error(err);

return res.status(500).json({
error: 'Failed to fetch leads'
});

}

}
