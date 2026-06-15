import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if(req.method !== 'POST') return res.status(405).end();

  const sig = req.headers['stripe-signature'];
  const rawBody = await getRawBody(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch(err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).json({error: `Webhook error: ${err.message}`});
  }

  if(event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email   = session.customer_email || session.metadata?.email;
    const plan    = session.metadata?.plan || 'starter';

    if(email) {
      const { error } = await supabase
        .from('Clients')
        .update({
          plan,
          is_active: true,
          stripe_customer_id:    session.customer,
          stripe_subscription_id: session.subscription
        })
        .eq('contact_email', email);

      if(error) console.error('Supabase update error:', error);
    }
  }

  if(event.type === 'customer.subscription.deleted') {
    const sub = event.data.object;
    await supabase
      .from('Clients')
      .update({ is_active: false })
      .eq('stripe_subscription_id', sub.id);
  }

  return res.status(200).json({received: true});
}