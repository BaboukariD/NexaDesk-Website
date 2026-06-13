(function() {
  const clientId = document.currentScript.getAttribute('data-client-id');
  if (!clientId) return;

  // =========================
  // STYLES
  // =========================

  const style = document.createElement('style');
  style.innerHTML = `

.nd-widget-wrap {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
  font-family: Inter, sans-serif;
}

.nd-btn {
  width: 58px;
  height: 58px;
  background: linear-gradient(135deg,#7c5cff,#9b7bff);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 30px rgba(124,92,252,0.35), 0 4px 16px rgba(0,0,0,0.12);
  transition: all 0.25s ease;
}

.nd-btn:hover {
  transform: scale(1.08);
  box-shadow: 0 14px 36px rgba(124,92,252,0.45), 0 8px 24px rgba(0,0,0,0.18);
}

.nd-btn svg {
  width: 24px;
  height: 24px;
  fill: white;
}

.nd-chat {
  display: none;
  width: 360px;
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.08), 0 20px 60px rgba(124,92,252,0.12);
  overflow: hidden;
  margin-bottom: 14px;
  opacity: 0;
  transform: translateY(14px) scale(0.96);
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.nd-chat.open {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.nd-header {
  background: linear-gradient(135deg,#7c5cff,#9b7bff);
  padding: 16px;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nd-agent {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 0.95rem;
}

.nd-agent-dot {
  width: 8px;
  height: 8px;
  background: #4dff88;
  border-radius: 50%;
  box-shadow: 0 0 10px rgba(77,255,136,0.8);
  animation: pulseDot 2s infinite;
}

.nd-close {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 1.2rem;
  opacity: 0.9;
  transition: opacity 0.2s ease;
}

.nd-close:hover { opacity: 1; }

.nd-messages {
  padding: 16px;
  height: 280px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: #f9f9fb;
  scroll-behavior: smooth;
}

.nd-msg {
  max-width: 82%;
  padding: 10px 14px;
  border-radius: 14px;
  font-size: 0.88rem;
  line-height: 1.55;
  white-space: pre-wrap;
  word-wrap: break-word;
  animation: fadeInMsg 0.25s ease;
}

.nd-msg.bot {
  background: white;
  border: 1px solid #ececf4;
  color: #111;
  align-self: flex-start;
}

.nd-msg.user {
  background: linear-gradient(135deg,#7c5cff,#9b7bff);
  color: white;
  align-self: flex-end;
}

.nd-input-row {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid #eee;
  background: white;
}

.nd-input {
  flex: 1;
  border: 1px solid #e8e8ee;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 0.88rem;
  outline: none;
  transition: all 0.2s ease;
  background: #fafafe;
}

.nd-input:focus {
  border-color: #9b7bff;
  box-shadow: 0 0 0 4px rgba(124,92,252,0.12);
  background: white;
}

.nd-send {
  width: 38px;
  height: 38px;
  background: linear-gradient(135deg,#7c5cff,#9b7bff);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  color: white;
  font-size: 1rem;
  transition: all 0.2s ease;
}

.nd-send:hover { transform: scale(1.08); }

.nd-footer {
  text-align: center;
  padding: 8px;
  font-size: 0.68rem;
  color: #aaa;
  background: white;
}

.nd-typing-bubble {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 10px 14px;
  height: 38px;
}

.typing-dot {
  width: 7px;
  height: 7px;
  background: #bbb;
  border-radius: 50%;
  flex-shrink: 0;
  animation: bounce 1.2s infinite;
}

.typing-dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes pulseDot {
  0%   { transform: scale(1);    opacity: 1; }
  50%  { transform: scale(1.25); opacity: 0.7; }
  100% { transform: scale(1);    opacity: 1; }
}

@keyframes bounce {
  0%,80%,100% { transform: scale(0.8); opacity: 0.5; }
  40%          { transform: scale(1);   opacity: 1; }
}

@keyframes fadeInMsg {
  0%   { opacity: 0; transform: translateY(8px); }
  100% { opacity: 1; transform: translateY(0); }
}

@media (max-width: 480px) {
  .nd-widget-wrap { right: 14px; bottom: 14px; }
  .nd-chat { width: calc(100vw - 28px); max-width: 360px; }
  .nd-messages { height: 240px; }
}
}

`;

  document.head.appendChild(style);

  // =========================
  // HTML
  // =========================

  const wrap = document.createElement('div');
  wrap.className = 'nd-widget-wrap';
  wrap.innerHTML = `
<div class="nd-chat" id="nd-chat">
  <div class="nd-header">
    <div class="nd-agent">
      <div class="nd-agent-dot"></div>
      <span>Assistant Online</span>
    </div>
    <button class="nd-close" id="nd-close">✕</button>
  </div>
  <div class="nd-messages" id="nd-messages">
    <div class="nd-msg bot">Hi! How can I help you today?</div>
  </div>
  <div class="nd-input-row">
    <input type="text" class="nd-input" id="nd-input" placeholder="Type a message..." />
    <button class="nd-send" id="nd-send">➤</button>
  </div>
  <div class="nd-footer">Powered by NexaDesk</div>
</div>

<button class="nd-btn" id="nd-btn">
  <svg viewBox="0 0 24 24">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
</button>
`;

  document.body.appendChild(wrap);

  // =========================
  // ELEMENTS
  // =========================

  const chat     = document.getElementById('nd-chat');
  const btn      = document.getElementById('nd-btn');
  const closeBtn = document.getElementById('nd-close');
  const input    = document.getElementById('nd-input');
  const send     = document.getElementById('nd-send');
  const messages = document.getElementById('nd-messages');

  // =========================
  // STATE
  // =========================

  let history = [];
  let leadMode = false;
  let leadData = { name: '', email: '', phone: '', preferred_contact: '' };

  let awaitingName              = false;
  let awaitingEmail             = false;
  let awaitingContactPreference = false;
  let awaitingPhone             = false;

  // =========================
  // HELPERS
  // =========================

  function addMsg(role, text) {
    const div = document.createElement('div');
    div.className = `nd-msg ${role}`;
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTo({ top: messages.scrollHeight, behavior: 'smooth' });
    return div;
  }

  async function addBotMsgAnimated(text) {
    // Show typing dots first
    const typing = document.createElement('div');
    typing.className = 'nd-msg bot nd-typing-bubble';
    typing.innerHTML = `
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    `;
    messages.appendChild(typing);
    messages.scrollTo({ top: messages.scrollHeight, behavior: 'smooth' });

    // Short thinking pause
    await new Promise(r => setTimeout(r, 700 + text.length * 12));
    typing.remove();

    // Typewriter
    const botMsg = document.createElement('div');
    botMsg.className = 'nd-msg bot';
    messages.appendChild(botMsg);

    let current = '';
    for (const char of text) {
      current += char;
      botMsg.textContent = current;
      messages.scrollTo({ top: messages.scrollHeight, behavior: 'smooth' });
      await new Promise(r => setTimeout(r, 18));
    }

    return botMsg;
  }

  function resetLeadState() {
    leadMode = false;
    awaitingName = false;
    awaitingEmail = false;
    awaitingContactPreference = false;
    awaitingPhone = false;
    leadData = { name: '', email: '', phone: '', preferred_contact: '' };
  }

  async function saveLead() {
  const response = await fetch('https://nexadesk.co.uk/api/save-lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name:              leadData.name || '',
      email:             leadData.email || '',
      phone:             leadData.phone || '',
      preferred_contact: leadData.preferred_contact,
      message:           history.map(m => m.content).join(' | '),
      client_id:         clientId
    })
  });
  if (!response.ok) throw new Error('Failed to save lead');
  const data = await response.json();
  return data[0]?.id || null;
}
  async function saveConversation(leadId) {
  await fetch('https://nexadesk.co.uk/api/save-conversation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      lead_id: leadId || null,
      messages: history
    })
  });
}

  async function sendLeadEmail() {
    await fetch('https://nexadesk.co.uk/api/send-lead-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:              leadData.name,
        email:             leadData.email,
        phone:             leadData.phone || '',
        preferred_contact: leadData.preferred_contact,
        message:           history.map(m => m.content).join(' | ')
      })
    });
  }

  // =========================
  // OPEN / CLOSE
  // =========================

  btn.addEventListener('click', () => {
    if (chat.style.display === 'block') {
      chat.classList.remove('open');
      setTimeout(() => { chat.style.display = 'none'; }, 250);
    } else {
      chat.style.display = 'block';
      setTimeout(() => { chat.classList.add('open'); }, 10);
      input.focus();
    }
  });

  closeBtn.addEventListener('click', () => {
    chat.classList.remove('open');
    setTimeout(() => { chat.style.display = 'none'; }, 250);
  });

  // =========================
  // SEND MESSAGE
  // =========================

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    const lowerText = text.toLowerCase();

    // ── STEP 1: Awaiting name ──────────────────────────────────────
    if (awaitingName) {
      leadData.name = text;
      addMsg('user', text);
      history.push({ role: 'user', content: text });
      input.value = '';
      awaitingName  = false;
      awaitingEmail = true;
      await addBotMsgAnimated('Perfect — what\'s the best email to reach you on?');
      return;
    }

    // ── STEP 2: Awaiting email ─────────────────────────────────────
    if (awaitingEmail) {
      addMsg('user', text);
      input.value = '';
      const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
      if (!validEmail) {
        await addBotMsgAnimated('Hmm, that email doesn\'t look quite right — could you double-check it for me?');
        return;
      }
      leadData.email = text;
      history.push({ role: 'user', content: text });
      awaitingEmail             = false;
      awaitingContactPreference = true;
      await addBotMsgAnimated('Got it! Would you prefer we contact you by email or phone?');
      return;
    }

    // ── STEP 3: Awaiting contact preference ───────────────────────
    if (awaitingContactPreference) {
      addMsg('user', text);
      history.push({ role: 'user', content: text });
      input.value = '';
      leadData.preferred_contact = lowerText.includes('phone') ? 'phone' : 'email';
      awaitingContactPreference  = false;

      if (leadData.preferred_contact === 'phone') {
        awaitingPhone = true;
        await addBotMsgAnimated('Perfect — what\'s the best number to reach you on?');
        return;
      }

      // Email preferred — save and confirm
      try {
        await saveLead();
        await sendLeadEmail();
      } catch (e) {
        console.error('Lead save error:', e);
      }

      await addBotMsgAnimated('Amazing — you\'re all set! Someone from the team will be in touch very soon. 🎉');
      resetLeadState();
      return;
    }

    // ── STEP 4: Awaiting phone ─────────────────────────────────────
    if (awaitingPhone) {
      leadData.phone = text;
      addMsg('user', text);
      history.push({ role: 'user', content: text });
      input.value = '';

      try {
        await saveLead();
        await sendLeadEmail();
      } catch (e) {
        console.error('Lead save error:', e);
      }

      await addBotMsgAnimated('Perfect — you\'re all set! Someone from the team will call you very soon. 🎉');
      resetLeadState();
      return;
    }

    // ── BUYING INTENT DETECTION ────────────────────────────────────
    const interested =
      lowerText.includes('price')      ||
      lowerText.includes('pricing')    ||
      lowerText.includes('interested') ||
      lowerText.includes('contact')    ||
      lowerText.includes('call')       ||
      lowerText.includes('book')       ||
      lowerText.includes('demo')       ||
      lowerText.includes('get started');

    history.push({ role: 'user', content: text });

    if (interested && !leadMode) {
      leadMode     = true;
      awaitingName = true;
      addMsg('user', text);
      input.value = '';
      await addBotMsgAnimated('Great! Before we continue, could I get your name?');
      return;
    }

    // ── NORMAL AI RESPONSE ─────────────────────────────────────────
    addMsg('user', text);
    input.value = '';
    messages.scrollTop = messages.scrollHeight;

    try {
      const response = await fetch('https://nexadesk.co.uk/api/widget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, messages: history })
      });

      const raw  = await response.text();
      const data = JSON.parse(raw);

      history.push({ role: 'assistant', content: data.reply });

      const fullReply  = data.reply || raw;
      const splitReply = fullReply
        .split(/\n\s*\n/)
        .map(p => p.trim())
        .filter(p => p.length > 0);

      for (const paragraph of splitReply) {

        // Typing indicator
        const typing = document.createElement('div');
        typing.className = 'nd-msg bot nd-typing-bubble';
        typing.innerHTML = `
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
        `;
        messages.appendChild(typing);
        messages.scrollTop = messages.scrollHeight;

        const thinkingTime = Math.min(1200 + paragraph.length * 10, 2800);
        await new Promise(r => setTimeout(r, thinkingTime));
        typing.remove();

        // Typewriter effect
        const botMsg = document.createElement('div');
        botMsg.className = 'nd-msg bot';
        messages.appendChild(botMsg);

        let current = '';
        for (const char of paragraph) {
          current += char;
          botMsg.textContent = current;
          messages.scrollTo({ top: messages.scrollHeight, behavior: 'smooth' });
          const typingSpeed =
            paragraph.length > 180 ? 8 :
            paragraph.length > 100 ? 14 : 20;
          await new Promise(r => setTimeout(r, typingSpeed));
        }

        await new Promise(r => setTimeout(r, 350));
      }

    } catch (e) {
      addMsg('bot', 'Sorry, something went wrong.');
    }
  }

  // =========================
  // EVENTS
  // =========================

  send.addEventListener('click', sendMessage);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') sendMessage();
  });

})();