(async function () {

  const script = document.currentScript;
  const clientId = script.getAttribute('data-client-id');

  // =========================
  // STYLES
  // =========================

  const style = document.createElement('style');
  style.textContent = `

  * {
    box-sizing: border-box;
    font-family: Inter, sans-serif;
  }

  .nd-chat {
    position: fixed;
    bottom: 100px;
    right: 24px;
    width: 380px;
    height: 620px;
    background: #0f1117;
    border: 1px solid #1f2430;
    border-radius: 22px;
    overflow: hidden;
    display: none;
    flex-direction: column;
    z-index: 999999;
    box-shadow: 0 20px 60px rgba(0,0,0,.45);
    transform: translateY(20px);
    opacity: 0;
    transition: all .25s ease;
  }

  .nd-chat.open {
    transform: translateY(0);
    opacity: 1;
  }

  .nd-header {
    background: linear-gradient(135deg, #7c3aed, #9333ea);
    color: white;
    padding: 18px;
    font-size: 18px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .nd-close {
    cursor: pointer;
    font-size: 20px;
    opacity: .8;
  }

  .nd-messages {
    flex: 1;
    overflow-y: auto;
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: #0b0d12;
  }

  .nd-msg {
    max-width: 85%;
    padding: 12px 14px;
    border-radius: 16px;
    line-height: 1.45;
    font-size: 14px;
    white-space: pre-wrap;
  }

  .nd-msg.user {
    align-self: flex-end;
    background: #7c3aed;
    color: white;
    border-bottom-right-radius: 4px;
  }

  .nd-msg.bot {
    align-self: flex-start;
    background: #171b24;
    color: #e6e6e6;
    border-bottom-left-radius: 4px;
  }

  .nd-input-wrap {
    display: flex;
    gap: 10px;
    padding: 14px;
    border-top: 1px solid #1d2230;
    background: #11141c;
  }

  .nd-input {
    flex: 1;
    border: none;
    outline: none;
    border-radius: 14px;
    background: #1a1f2b;
    color: white;
    padding: 12px;
    font-size: 14px;
  }

  .nd-send {
    width: 44px;
    height: 44px;
    border: none;
    border-radius: 12px;
    background: #7c3aed;
    color: white;
    cursor: pointer;
    font-size: 16px;
  }

  .nd-footer {
    text-align: center;
    padding: 10px;
    font-size: 12px;
    color: #8b93a7;
    border-top: 1px solid #1d2230;
    background: #11141c;
  }

  .nd-btn {
    position: fixed;
    right: 24px;
    bottom: 24px;
    width: 62px;
    height: 62px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    background: linear-gradient(135deg, #7c3aed, #9333ea);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999999;
    box-shadow: 0 12px 35px rgba(124,58,237,.45);
  }

  .nd-btn svg {
    width: 28px;
    height: 28px;
    fill: white;
  }

  .typing-dot {
    width: 8px;
    height: 8px;
    background: #a855f7;
    border-radius: 50%;
    animation: blink 1.4s infinite both;
  }

  .nd-typing-bubble {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .typing-dot:nth-child(2) {
    animation-delay: .2s;
  }

  .typing-dot:nth-child(3) {
    animation-delay: .4s;
  }

  @keyframes blink {
    0% { opacity: .2; transform: translateY(0px); }
    20% { opacity: 1; transform: translateY(-3px); }
    100% { opacity: .2; transform: translateY(0px); }
  }

  `;
  document.head.appendChild(style);

  // =========================
  // HTML
  // =========================

  const wrap = document.createElement('div');

  wrap.innerHTML = `

  <div class="nd-chat" id="nd-chat">

    <div class="nd-header">
      Assistant Online
      <span class="nd-close" id="nd-close">✕</span>
    </div>

    <div class="nd-messages" id="nd-messages">
      <div class="nd-msg bot">
        Hi! How can I help you today?
      </div>
    </div>

    <div class="nd-input-wrap">
      <input
        id="nd-input"
        class="nd-input"
        placeholder="Type a message..."
      />
      <button class="nd-send" id="nd-send">➤</button>
    </div>

    <div class="nd-footer">
      Powered by NexaDesk
    </div>

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

  const chat = document.getElementById('nd-chat');
  const btn = document.getElementById('nd-btn');
  const closeBtn = document.getElementById('nd-close');
  const input = document.getElementById('nd-input');
  const send = document.getElementById('nd-send');
  const messages = document.getElementById('nd-messages');

  // =========================
  // STATE
  // =========================

  let history = [];

  let leadMode = false;

  let awaitingName = false;
  let awaitingEmail = false;
  let awaitingContactPreference = false;
  let awaitingPhone = false;

  let leadData = {
    name: '',
    email: '',
    phone: '',
    preferred_contact: ''
  };

  // =========================
  // HELPERS
  // =========================

  function addMsg(role, text) {

    const div = document.createElement('div');

    div.className = `nd-msg ${role}`;

    div.textContent = text;

    messages.appendChild(div);

    messages.scrollTo({
      top: messages.scrollHeight,
      behavior: 'smooth'
    });

    return div;
  }

  async function addBotMsgAnimated(text) {

    const typing = document.createElement('div');

    typing.className = 'nd-msg bot nd-typing-bubble';

    typing.innerHTML = `
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    `;

    messages.appendChild(typing);

    messages.scrollTo({
      top: messages.scrollHeight,
      behavior: 'smooth'
    });

    await new Promise(r =>
      setTimeout(r, 600 + text.length * 10)
    );

    typing.remove();

    const botMsg = document.createElement('div');

    botMsg.className = 'nd-msg bot';

    messages.appendChild(botMsg);

    let current = '';

    for (const char of text) {

      current += char;

      botMsg.textContent = current;

      messages.scrollTo({
        top: messages.scrollHeight,
        behavior: 'smooth'
      });

      await new Promise(r => setTimeout(r, 14));
    }

    return botMsg;
  }

  function resetLeadState() {

    leadMode = false;

    awaitingName = false;
    awaitingEmail = false;
    awaitingContactPreference = false;
    awaitingPhone = false;

    leadData = {
      name: '',
      email: '',
      phone: '',
      preferred_contact: ''
    };
  }

  async function saveLead() {

    const response = await fetch(
      'https://nexadesk.co.uk/api/save-lead',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: leadData.name || '',
          email: leadData.email || '',
          phone: leadData.phone || '',
          preferred_contact: leadData.preferred_contact,
          message: history.map(m => m.content).join(' | '),
          client_id: clientId
        })
      }
    );

    if (!response.ok) {
      throw new Error('Failed to save lead');
    }

    const data = await response.json();

    return data.id || null;
  }

  async function saveConversation(leadId) {

    await fetch(
      'https://nexadesk.co.uk/api/save-conversation',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: clientId,
          lead_id: leadId || null,
          messages: history
        })
      }
    );
  }

  // =========================
  // OPEN / CLOSE
  // =========================

  btn.addEventListener('click', () => {

    if (chat.style.display === 'block') {

      chat.classList.remove('open');

      setTimeout(() => {
        chat.style.display = 'none';
      }, 250);

    } else {

      chat.style.display = 'flex';

      setTimeout(() => {
        chat.classList.add('open');
      }, 10);

      input.focus();
    }
  });

  closeBtn.addEventListener('click', () => {

    chat.classList.remove('open');

    setTimeout(() => {
      chat.style.display = 'none';
    }, 250);
  });

  // =========================
  // SEND MESSAGE
  // =========================

  async function sendMessage() {

    const text = input.value.trim();

    if (!text) return;

    const lowerText = text.toLowerCase();

    // NAME

    if (awaitingName) {

      leadData.name = text;

      addMsg('user', text);

      history.push({
        role: 'user',
        content: text
      });

      input.value = '';

      awaitingName = false;
      awaitingEmail = true;

      await addBotMsgAnimated(
        'Perfect — what’s the best email to reach you on?'
      );

      return;
    }

    // EMAIL

    if (awaitingEmail) {

      addMsg('user', text);

      input.value = '';

      const validEmail =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);

      if (!validEmail) {

        await addBotMsgAnimated(
          'Hmm, that email doesn’t look quite right — could you double-check it for me?'
        );

        return;
      }

      leadData.email = text;

      history.push({
        role: 'user',
        content: text
      });

      awaitingEmail = false;
      awaitingContactPreference = true;

      await addBotMsgAnimated(
        'Got it! Would you prefer we contact you by email or phone?'
      );

      return;
    }

    // CONTACT PREFERENCE

    if (awaitingContactPreference) {

      addMsg('user', text);

      history.push({
        role: 'user',
        content: text
      });

      input.value = '';

      leadData.preferred_contact =
        lowerText.includes('phone')
          ? 'phone'
          : 'email';

      awaitingContactPreference = false;

      if (leadData.preferred_contact === 'phone') {

        awaitingPhone = true;

        await addBotMsgAnimated(
          'Perfect — what’s the best number to reach you on?'
        );

        return;
      }

      try {

        const leadId = await saveLead();

        await saveConversation(leadId);

      } catch (e) {

        console.error('Lead save error:', e);
      }

      await addBotMsgAnimated(
        'Amazing — you’re all set! Someone from the team will be in touch very soon. 🎉'
      );

      resetLeadState();

      return;
    }

    // PHONE

    if (awaitingPhone) {

      leadData.phone = text;

      addMsg('user', text);

      history.push({
        role: 'user',
        content: text
      });

      input.value = '';

      try {

        const leadId = await saveLead();

        await saveConversation(leadId);

      } catch (e) {

        console.error('Lead save error:', e);
      }

      await addBotMsgAnimated(
        'Perfect — you’re all set! Someone from the team will call you very soon. 🎉'
      );

      resetLeadState();

      return;
    }

    // BUYING INTENT

    const interested =
      lowerText.includes('price') ||
      lowerText.includes('pricing') ||
      lowerText.includes('interested') ||
      lowerText.includes('contact') ||
      lowerText.includes('call') ||
      lowerText.includes('demo') ||
      lowerText.includes('book');

    history.push({
      role: 'user',
      content: text
    });

    if (interested && !leadMode) {

      leadMode = true;

      awaitingName = true;

      addMsg('user', text);

      input.value = '';

      await addBotMsgAnimated(
        'Great! Before we continue, could I get your name?'
      );

      return;
    }

    // NORMAL AI

    addMsg('user', text);

    input.value = '';

    try {

      const response = await fetch(
        'https://nexadesk.co.uk/api/widget',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            clientId,
            messages: history
          })
        }
      );

      const data = await response.json();

      history.push({
        role: 'assistant',
        content: data.reply
      });

      const parts = data.reply
        .split(/\n\s*\n/)
        .map(p => p.trim())
        .filter(Boolean);

      for (const part of parts) {
        await addBotMsgAnimated(part);
      }

    } catch (err) {

      console.error(err);

      await addBotMsgAnimated(
        'Something went wrong. Please try again.'
      );
    }
  }

  // =========================
  // EVENTS
  // =========================

  send.addEventListener('click', sendMessage);

  input.addEventListener('keypress', e => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });

})();