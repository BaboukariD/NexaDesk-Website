(async function () {
  const script = document.currentScript;
  const clientId = script?.getAttribute('data-client-id') || '';
  const apiBase = script?.src ? new URL(script.src).origin : window.location.origin;

  if (!clientId) {
    console.error('NexaDesk: missing data-client-id on embed script.');
    return;
  }

  // Never initialise twice, even if the embed snippet is pasted twice
  if (document.getElementById('nexadesk-widget')) return;

  // ============================================================
  // Shadow DOM host — completely isolates widget styles from the
  // client's website CSS. The widget looks identical everywhere.
  // ============================================================
  const host = document.createElement('div');
  host.id = 'nexadesk-widget';
  host.style.cssText = 'all:initial;position:fixed;z-index:2147483647;';
  document.body.appendChild(host);
  const root = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
  :host{all:initial;}
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

  .nd-btn{
    position:fixed;
    bottom:24px;right:24px;
    width:60px;height:60px;
    border:none;border-radius:50%;
    cursor:pointer;
    background:linear-gradient(135deg,#8b5cf6,#7c3aed);
    display:flex;align-items:center;justify-content:center;
    z-index:2147483647;
    box-shadow:0 10px 32px rgba(139,92,246,.42);
    transition:transform .15s ease;
  }
  .nd-btn:hover{transform:scale(1.06);}
  .nd-btn svg{width:26px;height:26px;stroke:#fff;fill:none;stroke-width:2;}

  .nd-chat{
    position:fixed;
    bottom:96px;right:24px;
    width:380px;
    height:min(620px, calc(100vh - 130px));
    max-width:calc(100vw - 32px);
    background:#f8fafc;
    border-radius:20px;
    overflow:hidden;
    display:none;
    flex-direction:column;
    z-index:2147483647;
    box-shadow:0 24px 70px rgba(0,0,0,.3);
    opacity:0;
    transform:translateY(12px);
    transition:opacity .2s ease,transform .2s ease;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
    font-size:14px;
    line-height:1.5;
    color:#111827;
  }
  .nd-chat.open{opacity:1;transform:translateY(0);}

  .nd-header{
    background:linear-gradient(135deg,#0b1020,#161a2e);
    color:#fff;
    padding:16px 18px;
    display:flex;align-items:center;justify-content:space-between;
    flex-shrink:0;
  }
  .nd-header-left{display:flex;align-items:center;gap:12px;min-width:0;}
  .nd-avatar{
    width:38px;height:38px;
    border-radius:12px;
    background:linear-gradient(135deg,#8b5cf6,#7c3aed);
    display:flex;align-items:center;justify-content:center;
    font-size:16px;font-weight:700;color:#fff;
    flex-shrink:0;
  }
  .nd-title{
    font-size:14.5px;font-weight:700;
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
  }
  .nd-status{
    font-size:11.5px;color:#9ca3af;margin-top:2px;
    display:flex;align-items:center;gap:5px;
  }
  .nd-status::before{
    content:'';width:6px;height:6px;border-radius:50%;
    background:#34d399;flex-shrink:0;
  }
  .nd-close{
    cursor:pointer;
    border:none;background:none;color:#fff;
    font-size:20px;line-height:1;
    opacity:.65;transition:opacity .15s;
    padding:4px;flex-shrink:0;
  }
  .nd-close:hover{opacity:1;}

  .nd-messages{
    flex:1;min-height:0;
    overflow-y:auto;
    padding:16px;
    display:flex;flex-direction:column;gap:12px;
    background:#f8fafc;
  }
  .nd-messages::-webkit-scrollbar{width:6px;}
  .nd-messages::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:99px;}

  .nd-msg{
    max-width:84%;
    padding:11px 14px;
    border-radius:16px;
    font-size:13.5px;
    line-height:1.55;
    white-space:pre-wrap;
    overflow-wrap:anywhere;
    animation:ndFadeIn .18s ease;
  }
  @keyframes ndFadeIn{
    from{opacity:0;transform:translateY(5px);}
    to{opacity:1;transform:translateY(0);}
  }
  .nd-msg.user{
    align-self:flex-end;
    background:linear-gradient(135deg,#8b5cf6,#7c3aed);
    color:#fff;
    border-bottom-right-radius:5px;
  }
  .nd-msg.bot{
    align-self:flex-start;
    background:#fff;
    color:#111827;
    border:1px solid #e5e7eb;
    border-bottom-left-radius:5px;
  }

  .nd-typing{display:flex;gap:4px;align-items:center;height:16px;}
  .nd-typing span{
    width:6px;height:6px;background:#8b5cf6;border-radius:50%;
    animation:ndDot 1.2s infinite both;
  }
  .nd-typing span:nth-child(2){animation-delay:.2s;}
  .nd-typing span:nth-child(3){animation-delay:.4s;}
  @keyframes ndDot{
    0%,80%,100%{transform:scale(.6);opacity:.4;}
    40%{transform:scale(1);opacity:1;}
  }

  .nd-input-wrap{
    display:flex;gap:8px;
    padding:12px;
    background:#fff;
    border-top:1px solid #e5e7eb;
    flex-shrink:0;
  }
  .nd-input{
    flex:1;min-width:0;
    border:none;outline:none;
    background:#f1f5f9;
    border-radius:12px;
    padding:12px 14px;
    font-size:13.5px;
    font-family:inherit;
    color:#111827;
  }
  .nd-input::placeholder{color:#94a3b8;}
  .nd-send{
    width:44px;height:44px;
    border:none;border-radius:12px;
    background:linear-gradient(135deg,#8b5cf6,#7c3aed);
    color:#fff;cursor:pointer;
    display:flex;align-items:center;justify-content:center;
    flex-shrink:0;
    transition:transform .15s;
  }
  .nd-send:hover{transform:translateY(-1px);}
  .nd-send:disabled{opacity:.55;cursor:not-allowed;transform:none;}
  .nd-send svg{width:17px;height:17px;stroke:#fff;fill:none;stroke-width:2;}

  .nd-footer{
    text-align:center;
    padding:7px;
    font-size:10px;
    color:#94a3b8;
    background:#fff;
    border-top:1px solid #f1f5f9;
    flex-shrink:0;
  }
  .nd-footer a{color:#8b5cf6;text-decoration:none;font-weight:600;}

  @media(max-width:480px){
    .nd-chat{
      width:calc(100vw - 20px);
      right:10px;
      bottom:86px;
      height:min(76vh, calc(100vh - 110px));
      border-radius:18px;
    }
    .nd-btn{bottom:18px;right:18px;width:56px;height:56px;}
    .nd-teaser{right:14px;bottom:84px;max-width:calc(100vw - 90px);}
  }

  .nd-teaser{
    position:fixed;
    bottom:96px;right:24px;
    background:#fff;
    color:#111827;
    border:1px solid #e5e7eb;
    border-radius:16px;
    border-bottom-right-radius:5px;
    padding:12px 34px 12px 16px;
    font-size:13.5px;
    line-height:1.5;
    max-width:260px;
    box-shadow:0 12px 36px rgba(0,0,0,.16);
    cursor:pointer;
    z-index:2147483647;
    animation:ndTeaserIn .3s ease;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
  }
  @keyframes ndTeaserIn{
    from{opacity:0;transform:translateY(8px);}
    to{opacity:1;transform:translateY(0);}
  }
  .nd-teaser-close{
    position:absolute;
    top:6px;right:8px;
    border:none;background:none;
    color:#9ca3af;font-size:14px;line-height:1;
    cursor:pointer;padding:3px;
  }
  .nd-teaser-close:hover{color:#111827;}

  .nd-msg.bot a{color:#7c3aed;font-weight:600;text-decoration:underline;}
  .nd-msg.bot a:hover{opacity:.8;}
  `;
  root.appendChild(style);

  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
  <div class="nd-chat" id="nd-chat">
    <div class="nd-header">
      <div class="nd-header-left">
        <div class="nd-avatar" id="nd-avatar">A</div>
        <div style="min-width:0;">
          <div class="nd-title" id="nd-title">AI Assistant</div>
          <div class="nd-status">Online now</div>
        </div>
      </div>
      <button class="nd-close" id="nd-close" aria-label="Close chat">✕</button>
    </div>

    <div class="nd-messages" id="nd-messages"></div>

    <div class="nd-input-wrap">
      <input id="nd-input" class="nd-input" placeholder="Type your message…" />
      <button class="nd-send" id="nd-send" aria-label="Send">
        <svg viewBox="0 0 24 24"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
      </button>
    </div>

    <div class="nd-footer">Powered by <a href="https://nexadesk.co.uk" target="_blank" rel="noopener">NexaDesk</a></div>
  </div>

  <button class="nd-btn" id="nd-btn" aria-label="Open chat">
    <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
  </button>
  `;
  root.appendChild(wrapper);

  const $ = (id) => root.getElementById(id);
  const chat = $('nd-chat');
  const btn = $('nd-btn');
  const closeBtn = $('nd-close');
  const input = $('nd-input');
  const sendBtn = $('nd-send');
  const messagesEl = $('nd-messages');

  let history = [];
  let conversationId = null;
  let leadStep = null;
  let leadSaved = false;
  let clientPlan = 'starter'; // updated from API response
  let lead = { name: '', email: '', preferred_contact: '', phone: '' };

  function scrollBottom() {
    messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: 'smooth' });
  }

  function setBusinessName(name) {
    const titleEl = $('nd-title');
    const avatarEl = $('nd-avatar');
    if (titleEl) titleEl.textContent = name;
    if (avatarEl) avatarEl.textContent = (name || 'A').trim().charAt(0).toUpperCase();
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
      .replaceAll('"','&quot;').replaceAll("'",'&#039;');
  }

  // Escape first, then turn URLs, emails and phone numbers into tappable links
  function linkify(text) {
    let out = escapeHtml(text);
    out = out.replace(/\bhttps?:\/\/[^\s<]+/g,
      (m) => `<a href="${m}" target="_blank" rel="noopener">${m}</a>`);
    out = out.replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+[\w]\b/g,
      (m) => `<a href="mailto:${m}">${m}</a>`);
    out = out.replace(/(?:\+44\s?\d{2,4}|\(?0\d{2,4}\)?)[\s.-]?\d{3,4}[\s.-]?\d{3,4}\b/g,
      (m) => `<a href="tel:${m.replace(/[^\d+]/g, '')}">${m}</a>`);
    return out;
  }

  function renderBubble(role, text) {
    const div = document.createElement('div');
    div.className = `nd-msg ${role === 'assistant' ? 'bot' : 'user'}`;
    if (role === 'assistant') {
      div.innerHTML = linkify(text);
    } else {
      div.textContent = text;
    }
    messagesEl.appendChild(div);
    scrollBottom();
  }

  function makeTyping() {
    const typing = document.createElement('div');
    typing.className = 'nd-msg bot';
    typing.innerHTML = '<span class="nd-typing"><span></span><span></span><span></span></span>';
    return typing;
  }

  function addMessage(role, text) {
    history.push({ role, content: text });
    renderBubble(role, text);
  }

  // Show a reply the way a human would: paragraph by paragraph,
  // with a typing pause scaled to the length of what comes next.
  async function showReplyInChunks(fullText) {
    history.push({ role: 'assistant', content: fullText });

    const parts = fullText.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
    if (!parts.length) parts.push(fullText);

    for (let i = 0; i < parts.length; i++) {
      if (i > 0) {
        const typing = makeTyping();
        messagesEl.appendChild(typing);
        scrollBottom();
        const pause = Math.min(500 + parts[i].length * 18, 2400);
        await new Promise(r => setTimeout(r, pause));
        typing.remove();
      }
      renderBubble('assistant', parts[i]);
    }
  }

  function looksLikeBuyingIntent(text) {
    return /\b(price|pricing|cost|quote|book|call|demo|hire|start|interested|contact|consultation|available|availability|buy|sign up)\b/i.test(text);
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function conversationSummary() {
    return history
      .map((m) => `${m.role === 'user' ? 'Visitor' : 'Assistant'}: ${m.content}`)
      .join('\n\n')
      .slice(0, 8000);
  }

  async function saveConversation() {
    try {
      const response = await fetch(`${apiBase}/api/save-conversation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: String(clientId),
          conversation_id: conversationId,
          messages: history
        })
      });
      const data = await response.json();
      if (data?.conversation?.id) conversationId = data.conversation.id;
    } catch (error) {
      console.error('NexaDesk conversation save failed:', error);
    }
  }

  async function saveLead() {
    if (leadSaved) return;
    leadSaved = true;
    try {
      await fetch(`${apiBase}/api/save-lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...lead,
          client_id: Number(clientId),
          message: conversationSummary()
        })
      });
    } catch (error) {
      leadSaved = false;
      console.error('NexaDesk lead save failed:', error);
    }
  }

  async function getAiReply() {
    const typing = makeTyping();
    messagesEl.appendChild(typing);
    scrollBottom();

    try {
      const response = await fetch(`${apiBase}/api/widget`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, messages: history })
      });
      const data = await response.json();
      typing.remove();

      if (data.businessName) setBusinessName(data.businessName);
      if (data.plan) clientPlan = data.plan;

      await showReplyInChunks(data.reply || 'Sorry, I had trouble replying just now.');
    } catch (error) {
      typing.remove();
      console.error('NexaDesk AI failed:', error);
      addMessage('assistant', 'Sorry, the assistant is temporarily unavailable.');
    }
  }

  async function handleLeadCapture(text) {
    if (leadStep === 'name') {
      lead.name = text;
      leadStep = 'email';
      addMessage('assistant', 'Thanks. What email address should the team use to contact you?');
      return true;
    }

    if (leadStep === 'email') {
      if (!isValidEmail(text)) {
        addMessage('assistant', 'That email does not look quite right. Could you send it again?');
        return true;
      }
      lead.email = text;
      leadStep = 'preferred_contact';
      addMessage('assistant', 'Great. Would you prefer email, phone, or WhatsApp?');
      return true;
    }

    if (leadStep === 'preferred_contact') {
      lead.preferred_contact = text;
      leadStep = 'phone';
      addMessage('assistant', 'Last thing: what phone number should they use if needed?');
      return true;
    }

    if (leadStep === 'phone') {
      lead.phone = text;
      leadStep = null;
      await saveLead();
      addMessage('assistant', 'Perfect. I have passed your details to the team and they will follow up soon.');
      return true;
    }

    return false;
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    sendBtn.disabled = true;

    addMessage('user', text);

    const handledLeadStep = await handleLeadCapture(text);

    if (!handledLeadStep) {
      const canCapture = clientPlan === 'growth' || clientPlan === 'pro';
      if (canCapture && !leadSaved && !leadStep && looksLikeBuyingIntent(text)) {
        await getAiReply();
        leadStep = 'name';
        addMessage('assistant', 'I can ask the team to follow up with you. What is your name?');
      } else {
        await getAiReply();
      }
    }

    await saveConversation();
    sendBtn.disabled = false;
    input.focus();
  }

  function openChat() {
    chat.style.display = 'flex';
    setTimeout(() => chat.classList.add('open'), 10);
    input.focus();
  }

  function closeChat() {
    chat.classList.remove('open');
    setTimeout(() => { chat.style.display = 'none'; }, 200);
  }

  btn.addEventListener('click', () => {
    if (chat.style.display === 'flex') closeChat();
    else openChat();
  });

  closeBtn.addEventListener('click', closeChat);
  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') sendMessage();
  });

  // ===== TEASER POPUP =====
  let teaserEl = null;
  function removeTeaser() {
    if (teaserEl) { teaserEl.remove(); teaserEl = null; }
  }

  setTimeout(() => {
    if (chat.style.display === 'flex') return; // already chatting
    teaserEl = document.createElement('div');
    teaserEl.className = 'nd-teaser';
    teaserEl.innerHTML = `Hi 👋 Got a question? I can help right now.<button class="nd-teaser-close" aria-label="Dismiss">✕</button>`;
    teaserEl.addEventListener('click', (e) => {
      if (e.target.classList.contains('nd-teaser-close')) { e.stopPropagation(); removeTeaser(); return; }
      removeTeaser();
      openChat();
    });
    root.appendChild(teaserEl);
  }, 4000);

  btn.addEventListener('click', removeTeaser);

  addMessage('assistant', 'Hi, how can I help you today?');
})();