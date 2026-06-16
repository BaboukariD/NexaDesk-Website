(async function () {
  const script = document.currentScript;
  const clientId = script?.getAttribute('data-client-id') || '';
  const apiBase = script?.src ? new URL(script.src).origin : window.location.origin;
  const logoUrl = `${apiBase}/nexadesk-logo.png`;

  if (!clientId) {
    console.error('NexaDesk: missing data-client-id on embed script.');
    return;
  }

  const style = document.createElement('style');
  style.textContent = `
  .nd-widget *{
    box-sizing:border-box;
    font-family:Inter,Arial,sans-serif;
  }

  .nd-chat{
    position:fixed;
    bottom:96px;
    right:24px;
    width:380px;
    height:640px;
    background:#f8fafc;
    border-radius:26px;
    overflow:hidden;
    display:none;
    flex-direction:column;
    z-index:999999;
    box-shadow:0 28px 80px rgba(0,0,0,.28);
    opacity:0;
    transform:translateY(15px);
    transition:all .22s ease;
  }

  .nd-chat.open{
    opacity:1;
    transform:translateY(0);
  }

  .nd-header{
    background:linear-gradient(135deg,#0b1020,#111827);
    color:white;
    padding:18px;
    display:flex;
    align-items:center;
    justify-content:space-between;
    border-bottom:1px solid rgba(255,255,255,.06);
  }

  .nd-header-left{
    display:flex;
    align-items:center;
    gap:14px;
  }

  .nd-logo{
    width:46px;
    height:46px;
    border-radius:14px;
    object-fit:contain;
    background:#050816;
    padding:4px;
  }

  .nd-title{
    font-size:15px;
    font-weight:800;
  }

  .nd-status{
    font-size:12px;
    color:#9ca3af;
    margin-top:3px;
  }

  .nd-close{
    cursor:pointer;
    font-size:22px;
    opacity:.7;
    transition:.2s;
  }

  .nd-close:hover{
    opacity:1;
  }

  .nd-messages{
    flex:1;
    overflow-y:auto;
    padding:18px;
    display:flex;
    flex-direction:column;
    gap:14px;
    background:#f8fafc;
  }

  .nd-msg{
    max-width:84%;    
    padding:14px 16px;
    border-radius:20px;
    line-height:1.6;
    font-size:13px;
    white-space:pre-wrap;
    overflow-wrap:anywhere;
    animation:ndFadeIn .18s ease;
  }

  @keyframes ndFadeIn{
    from{ opacity:0; transform:translateY(6px); }
    to{ opacity:1; transform:translateY(0); }
  }

  .nd-msg.user{
    align-self:flex-end;
    background:linear-gradient(135deg,#8b5cf6,#7c3aed);
    color:white;
    border-bottom-right-radius:6px;
  }

  .nd-msg.bot{
    align-self:flex-start;
    background:white;
    color:#111827;
    border:1px solid #e5e7eb;
    border-bottom-left-radius:6px;
  }

  .nd-input-wrap{
    display:flex;
    gap:10px;
    padding:14px;
    background:white;
    border-top:1px solid #e5e7eb;
  }

  .nd-input{
    flex:1;
    border:none;
    outline:none;
    background:#f1f5f9;
    border-radius:16px;
    padding:14px;
    font-size:13px;
    color:#111827;
  }

  .nd-send{
    width:50px;
    height:50px;
    border:none;
    border-radius:16px;
    background:linear-gradient(135deg,#8b5cf6,#7c3aed);
    color:white;
    cursor:pointer;
    font-size:16px;
    flex-shrink:0;
    transition:.2s;
  }

  .nd-send:hover{
    transform:translateY(-1px);
  }

  .nd-send:disabled{
    opacity:.6;
    cursor:not-allowed;
    transform:none;
  }

  .nd-footer{
    text-align:center;
    padding:8px;
    font-size:10px;
    color:#64748b;
    background:white;
    border-top:1px solid #e5e7eb;
  }

  .nd-btn{
    position:fixed;
    bottom:24px;
    right:24px;
    width:68px;
    height:68px;
    border:none;
    border-radius:50%;
    cursor:pointer;
    background:linear-gradient(135deg,#8b5cf6,#7c3aed);
    display:flex;
    align-items:center;
    justify-content:center;
    z-index:999999;
    box-shadow:0 16px 45px rgba(139,92,246,.45);
  }

  .nd-btn img{
    width:38px;
    height:38px;    
    object-fit:contain;
  }

  @media(max-width:480px){
    .nd-chat{
      width:calc(100vw - 24px);
      right:12px;
      left:12px;
      bottom:84px;
      height:74vh;
    }
  }
  `;

  document.head.appendChild(style);

  const wrapper = document.createElement('div');
  wrapper.className = 'nd-widget';
  wrapper.innerHTML = `
  <div class="nd-chat" id="nd-chat">
    <div class="nd-header">
      <div class="nd-header-left">
        <img src="${logoUrl}" class="nd-logo" alt="NexaDesk" />
        <div>
          <div class="nd-title" id="nd-title">AI Assistant</div>
          <div class="nd-status">Online now</div>
        </div>
      </div>
      <div class="nd-close" id="nd-close" aria-label="Close">✕</div>
    </div>

    <div class="nd-messages" id="nd-messages"></div>

    <div class="nd-input-wrap">
      <input id="nd-input" class="nd-input" placeholder="Type your message..." />
      <button class="nd-send" id="nd-send" aria-label="Send">➤</button>
    </div>

    <div class="nd-footer">Powered by NexaDesk</div>
  </div>

  <button class="nd-btn" id="nd-btn" aria-label="Open chat">
    <img src="${logoUrl}" alt="" />
  </button>
  `;

  document.body.appendChild(wrapper);

  const chat = document.getElementById('nd-chat');
  const btn = document.getElementById('nd-btn');
    const closeBtn = document.getElementById('nd-close');
  const input = document.getElementById('nd-input');
  const sendBtn = document.getElementById('nd-send');
  const messagesEl = document.getElementById('nd-messages');

  let history = [];
  let conversationId = null;
  let leadStep = null;
  let leadSaved = false;
  let lead = {
    name: '',
    email: '',
    preferred_contact: '',
    phone: ''
  };

  function scrollBottom() {
    messagesEl.scrollTo({
      top: messagesEl.scrollHeight,
      behavior: 'smooth'
    });
  }

  function addMessage(role, text) {
    history.push({ role, content: text });

    const div = document.createElement('div');
    div.className = `nd-msg ${role === 'assistant' ? 'bot' : 'user'}`;
    div.textContent = text;

    messagesEl.appendChild(div);
    scrollBottom();
  }

  function looksLikeBuyingIntent(text) {
    return /\b(price|pricing|cost|quote|book|call|demo|hire|start|interested|contact|consultation|available|availability|buy|sign up)\b/i.test(text);
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function conversationSummary() {
    return history
      .map((message) => `${message.role === 'user' ? 'Visitor' : 'Assistant'}: ${message.content}`)
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

      if (data?.conversation?.id) {
        conversationId = data.conversation.id;
      }
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
    const typing = document.createElement('div');
    typing.className = 'nd-msg bot';
    typing.innerHTML = '<span style="display:flex;gap:4px;align-items:center;height:18px"><span style="width:7px;height:7px;background:#8b5cf6;border-radius:50%;animation:ndDot 1.2s infinite both"></span><span style="width:7px;height:7px;background:#8b5cf6;border-radius:50%;animation:ndDot 1.2s .2s infinite both"></span><span style="width:7px;height:7px;background:#8b5cf6;border-radius:50%;animation:ndDot 1.2s .4s infinite both"></span></span>';
    if(!document.getElementById('ndDotStyle')){const s=document.createElement('style');s.id='ndDotStyle';s.textContent='@keyframes ndDot{0%,80%,100%{transform:scale(0.6);opacity:.4}40%{transform:scale(1);opacity:1}}';document.head.appendChild(s);}
    messagesEl.appendChild(typing);
    scrollBottom();

    try {
      const response = await fetch(`${apiBase}/api/widget`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          messages: history
        })
      });

      const data = await response.json();
      typing.remove();

      // Update header with business name if returned
      if (data.businessName) {
        const titleEl = document.getElementById('nd-title');
        if (titleEl) titleEl.textContent = data.businessName;
      }

      addMessage(
        'assistant',
        data.reply || 'Sorry, I had trouble replying just now.'
      );
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
      if (!leadSaved && !leadStep && looksLikeBuyingIntent(text)) {
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
    setTimeout(() => {
      chat.style.display = 'none';
    }, 200);
  }

  btn.addEventListener('click', () => {
    if (chat.style.display === 'flex') {
      closeChat();
    } else {
      openChat();
    }
  });

  closeBtn.addEventListener('click', closeChat);
  sendBtn.addEventListener('click', sendMessage);

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      sendMessage();
    }
  });

  addMessage('assistant', 'Hi, how can I help you today?');
  await saveConversation();
})();