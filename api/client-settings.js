import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {

  // Auth
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if(!token) return res.status(401).json({error:'Unauthorized'});

  const {data:{user}, error:authErr} = await supabase.auth.getUser(token);
  if(authErr||!user) return res.status(401).json({error:'Unauthorized'});

  // Get client — try ClientUsers first, fallback to email
  let clientId = null;

  const {data:cu} = await supabase
    .from('ClientUsers')
    .select('client_id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if(cu?.client_id){
    clientId = cu.client_id;
  } else {
    const {data:cl} = await supabase
      .from('Clients')
      .select('id')
      .eq('contact_email', user.email)
      .maybeSingle();
    clientId = cl?.id || null;
  }

  if(!clientId) return res.status(404).json({error:'Client not found'});

  // GET — return current settings
  if(req.method === 'GET'){
    const {data:client, error} = await supabase
      .from('Clients')
      .select('*')
      .eq('id', clientId)
      .maybeSingle();

    if(error||!client) return res.status(404).json({error:'Client not found'});
    return res.status(200).json({client});
  }

  // PATCH — update settings
  if(req.method === 'PATCH'){
    const {
      business_name,
      website,
      system_prompt,
      knowledge_base,
      faq_json
    } = req.body;

    // Build the full system prompt from knowledge base + FAQs
    let fullPrompt = system_prompt || '';

    if(knowledge_base && knowledge_base.trim()){
      fullPrompt += `\n\n--- BUSINESS KNOWLEDGE ---\n${knowledge_base.trim()}`;
    }

    if(Array.isArray(faq_json) && faq_json.length){
      const faqText = faq_json
        .filter(f => f.question && f.answer)
        .map(f => `Q: ${f.question}\nA: ${f.answer}`)
        .join('\n\n');
      if(faqText){
        fullPrompt += `\n\n--- FAQs ---\n${faqText}`;
      }
    }

    const {error:updateErr} = await supabase
      .from('Clients')
      .update({
        business_name: business_name || undefined,
        website: website || undefined,
        system_prompt: fullPrompt,
        knowledge_base: knowledge_base || '',
        faq_json: faq_json || []
      })
      .eq('id', clientId);

    if(updateErr) return res.status(500).json({error:updateErr.message});
    return res.status(200).json({success:true});
  }

  return res.status(405).json({error:'Method not allowed'});
}