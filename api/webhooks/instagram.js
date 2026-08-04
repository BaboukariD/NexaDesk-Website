// api/webhooks/instagram.js
// Meta sends every Instagram DM here. Verify token setup is required once
// in the Meta App dashboard (Instagram Messaging API product).

import { handleMessage } from "../../lib/handleMessage.js";

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;
const IG_PAGE_ACCESS_TOKEN = process.env.IG_PAGE_ACCESS_TOKEN;

export default async function handler(req, res) {
  // Meta's one-time webhook verification (GET request)
  if (req.method === "GET") {
    const { "hub.mode": mode, "hub.verify_token": token, "hub.challenge": challenge } = req.query;
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send("Forbidden");
  }

  // Incoming message (POST request)
  if (req.method === "POST") {
    const body = req.body;

    try {
      for (const entry of body.entry || []) {
        for (const event of entry.messaging || []) {
          const senderId = event.sender?.id;
          const messageText = event.message?.text;
          if (!senderId || !messageText) continue;

          // TODO: map senderId's page/IG account to your internal clientId
          // (store this mapping in Supabase when a client connects their IG)
          const clientId = await lookupClientIdForIgAccount(entry.id);

          const reply = await handleMessage({
            clientId,
            channel: "instagram",
            externalUserId: senderId,
            message: messageText,
          });

          await sendInstagramReply(senderId, reply);
        }
      }
      return res.status(200).send("EVENT_RECEIVED");
    } catch (err) {
      console.error("Instagram webhook error:", err);
      return res.status(500).send("Error");
    }
  }

  return res.status(405).send("Method Not Allowed");
}

async function sendInstagramReply(recipientId, text) {
  await fetch(`https://graph.facebook.com/v21.0/me/messages?access_token=${IG_PAGE_ACCESS_TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
    }),
  });
}

async function lookupClientIdForIgAccount(igAccountId) {
  // Placeholder — replace with a real Supabase lookup once clients
  // connect their IG account through your admin/client portal
  return "REPLACE_WITH_LOOKUP";
}