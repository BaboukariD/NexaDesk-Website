import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PRICES = {
  starter: 'price_1TiYPjCGmdceCc6LmyhYnol2',
  growth:  'price_1TiYQ2CGmdceCc6Loshd2qVr',
  pro:     'price_1TiYQNCGmdceCc6LDPqHtKA4'
};

export default async function handler(req, res) {
  if(req.method !== 'POST') return res.status(405).end();

  const { plan, email } = req.body;

  if(!PRICES[plan]) return res.status(400).json({error:'Invalid plan'});

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email || undefined,
      line_items: [{
        price: PRICES[plan],
        quantity: 1
      }],
      success_url: 'https://nexadesk.co.uk/success.html?session_id={CHECKOUT_SESSION_ID}',
      cancel_url:  'https://nexadesk.co.uk/#pricing',
      metadata: { plan, email: email || '' }
    });

    return res.status(200).json({ url: session.url });
  } catch(err) {
    console.error('Stripe error:', err);
    return res.status(500).json({error: err.message});
  }
}