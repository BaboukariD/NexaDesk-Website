import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { client_id, conversation_id, messages } = req.body;

    if (!client_id) return res.status(400).json({ error: 'Missing client_id' });
    if (!Array.isArray(messages)) return res.status(400).json({ error: 'Missing messages' });

    // Don't create a row until the visitor has actually said something —
    // avoids junk conversations from people who open the widget and leave.
    const hasUserMessage = messages.some(m => m.role === 'user');
    if (!conversation_id && !hasUserMessage) {
      return res.status(200).json({ conversation: null });
    }

    // Update existing conversation — scoped to client_id too, otherwise
    // anyone who learns/guesses a conversation_id (e.g. from their own
    // browser state) could overwrite a DIFFERENT client's conversation.
    if (conversation_id) {
      const { data, error } = await supabase
        .from('Conversations')
        .update({ messages })
        .eq('id', conversation_id)
        .eq('client_id', String(client_id))
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Conversation not found' });
      return res.status(200).json({ conversation: data });
    }

    // Create new conversation
    const { data, error } = await supabase
      .from('Conversations')
      .insert({
        client_id: String(client_id),
        messages
      })
      .select()
      .single();

    if (error) throw error;
    return res.status(200).json({ conversation: data });

  } catch (err) {
    console.error('Save conversation error:', err);
    return res.status(500).json({ error: err.message });
  }
}