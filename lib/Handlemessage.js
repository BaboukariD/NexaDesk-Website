// lib/handleMessage.js
// Shared "brain" — every channel (web widget, Instagram, WhatsApp, Messenger)
// funnels through this one function. Same pattern as your existing web widget,
// just with a `channel` field added so replies get routed back correctly.

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * @param {Object} params
 * @param {string} params.clientId - your existing NexaDesk client id
 * @param {string} params.channel - "web" | "instagram" | "whatsapp" | "messenger"
 * @param {string} params.externalUserId - IG/WA/Messenger user id, or web session id
 * @param {string} params.message - the incoming text
 */
export async function handleMessage({ clientId, channel, externalUserId, message }) {
  // 1. Load client config (system prompt, business info) — same table you already use
  const { data: client } = await supabase
    .from("Clients")
    .select("*")
    .eq("id", clientId)
    .single();

  if (!client) throw new Error(`Unknown client: ${clientId}`);

  // 2. Load or create the conversation thread for this channel + user
  let { data: conversation } = await supabase
    .from("Conversations")
    .select("*")
    .eq("client_id", clientId)
    .eq("channel", channel)
    .eq("external_user_id", externalUserId)
    .single();

  if (!conversation) {
    const { data: newConvo } = await supabase
      .from("Conversations")
      .insert({ client_id: clientId, channel, external_user_id: externalUserId, messages: [] })
      .select()
      .single();
    conversation = newConvo;
  }

  const history = conversation.messages || [];
  history.push({ role: "user", content: message });

  // 3. Call Claude Haiku — same model, per-client system prompt
  //    (this is where your "qualify leads, book calls" prompt lives, per client)
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    system: client.system_prompt,
    messages: history,
  });

  const reply = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  history.push({ role: "assistant", content: reply });

  // 4. Save conversation + extract lead info (reuse your existing hidden-JSON lead extraction)
  await supabase
    .from("Conversations")
    .update({ messages: history })
    .eq("id", conversation.id);

  return reply;
}