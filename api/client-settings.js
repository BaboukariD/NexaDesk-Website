const SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://exqdmvloldvshzpxevht.supabase.co';

const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4cWRtdmxvbGR2c2h6cHhldmh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMzc5NDQsImV4cCI6MjA5NjYxMzk0NH0.nI_pnnKo236Bd6whjvfvZMGnStJz8q4y6ttENmiNgxg';

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function cleanText(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function cleanFaqs(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => ({
      question: cleanText(item.question, 300),
      answer: cleanText(item.answer, 1200)
    }))
    .filter((item) => item.question && item.answer)
    .slice(0, 30);
}

async function supabaseFetch(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.message || data?.error || response.statusText;
    throw new Error(message);
  }

  return data;
}

async function getUserFromRequest(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');

  if (!token) {
    throw new Error('Missing session token');
  }

  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`
    }
  });

  const user = await response.json();

  if (!response.ok || !user?.id) {
    throw new Error('Invalid session');
  }

  return user;
}

async function getClientForUser(user) {
  const links = await supabaseFetch(
    `/rest/v1/ClientUsers?auth_user_id=eq.${user.id}&select=client_id&limit=1`
  );

  let clientId = links?.[0]?.client_id;

  if (!clientId && user.email) {
    const clientsByEmail = await supabaseFetch(
      `/rest/v1/Clients?contact_email=eq.${encodeURIComponent(user.email)}&select=id&limit=1`
    );

    clientId = clientsByEmail?.[0]?.id;
  }

  if (!clientId) {
    throw new Error('No client account found for this user');
  }

  const clients = await supabaseFetch(
    `/rest/v1/Clients?id=eq.${clientId}&select=*&limit=1`
     );

  if (!clients?.length) {
    throw new Error('Client not found');
  }

  return clients[0];
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({
      error: 'Missing SUPABASE_SERVICE_ROLE_KEY environment variable'
    });
  }

  if (!['GET', 'PATCH'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getUserFromRequest(req);
    const client = await getClientForUser(user);

    if (req.method === 'GET') {
      return res.status(200).json({
        client: {
          id: client.id,
          business_name: client.business_name || '',
          contact_name: client.contact_name || '',
          contact_email: client.contact_email || '',
          website: client.website || '',
          plan: client.plan || '',
          system_prompt: client.system_prompt || '',
          knowledge_base: client.knowledge_base || '',
          faq_json: Array.isArray(client.faq_json) ? client.faq_json : []
        }
      });
    }

    const body = req.body || {};
    const payload = {
      business_name: cleanText(body.business_name, 120),
      website: cleanText(body.website, 250),
      system_prompt: cleanText(body.system_prompt, 5000),
      knowledge_base: cleanText(body.knowledge_base, 20000),
      faq_json: cleanFaqs(body.faq_json)
    };

    const updated = await supabaseFetch(
      `/rest/v1/Clients?id=eq.${client.id}`,
      {
        method: 'PATCH',
        headers: {
          Prefer: 'return=representation'
        },
        body: JSON.stringify(payload)
      }
    );

    return res.status(200).json({
      success: true,
      client: updated?.[0] || { ...client, ...payload }
    });
  } catch (error) {
    return res.status(400).json({
      error: error.message || 'Unable to load settings'
    });
  }
}