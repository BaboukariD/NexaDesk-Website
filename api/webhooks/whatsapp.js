// api/webhooks/whatsapp.js
// WhatsApp Business Platform webhook. Needs a Meta Business verification
// (this is the part that can take 1-2 weeks for approval).

import { handleMessage } from "../../lib/handleMessage.js";

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

export default async function handler(req, res) {
  if (req.method === "GET") {
    const { "hub.mode": mode, "hub.verify_token": token, "hub.challenge": challenge } = req.query;
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send("Forbidden");
  }

  if (req.method === "POST") {
    const body = req.body;

    try {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const messages = changes?.value?.messages;

      if (messages) {
        for (const msg of messages) {
          const from = msg.from; // sender's phone number
          const text = msg.text?.body;
          if (!from || !text) continue;

          // TODO: map the receiving phone_number_id to your internal clientId
          const clientId = await lookupClientIdForWaNumber(changes.value.metadata.phone_number_id);

          const reply = await handleMessage({
            clientId,
            channel: "whatsapp",
            externalUserId: from,
            message: text,
          });

          await sendWhatsappReply(from, reply);
        }
      }
      return res.status(200).send("EVENT_RECEIVED");
    } catch (err) {
      console.error("WhatsApp webhook error:", err);
      return res.status(500).send("Error");
    }
  }

  return res.status(405).send("Method Not Allowed");
}

async function sendWhatsappReply(to, text) {
  await fetch(`https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      text: { body: text },
    }),
  });
}

async function lookupClientIdForWaNumber(phoneNumberId) {
  // Placeholder — replace with a real Supabase lookup
  return "REPLACE_WITH_LOOKUP";
}