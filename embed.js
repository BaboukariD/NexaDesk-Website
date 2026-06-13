(async function () {

  const script = document.currentScript;
  const clientId = script.getAttribute('data-client-id');

  // =========================
  // STYLES
  // =========================

  const style = document.createElement('style');

  style.textContent = `

  *{
    box-sizing:border-box;
    font-family:Inter,sans-serif;
  }

  .nd-chat{
    position:fixed;
    bottom:90px;
    right:24px;
    width:340px;
    height:520px;
    background:#0f1117;
    border:1px solid #1c2230;
    border-radius:20px;
    overflow:hidden;
    display:none;
    flex-direction:column;
    z-index:999999;
    box-shadow:0 18px 60px rgba(0,0,0,.45);
    opacity:0;
    transform:translateY(15px);
    transition:all .25s ease;
  }

  .nd-chat.open{
    opacity:1;
    transform:translateY(0);
  }

  .nd-header{
    background:#111827;
    color:white;
    padding:16px;
    font-size:15px;
    font-weight:600;
    display:flex;
    align-items:center;
    justify-content:space-between;
    border-bottom:1px solid #1f2937;
  }

  .nd-close{
    cursor:pointer;
    opacity:.75;
    font-size:18px;
  }

  .nd-messages{
    flex:1;
    overflow-y:auto;
    padding:16px;
    display:flex;
    flex-direction:column;
    gap:12px;
    background:#0b0f17;
  }

  .nd-msg{
    max-width:85%;
    padding:11px 13px;
    border-radius:16px;
    line-height:1.45;
    font-size:13.5px;
    white-space:pre-wrap;
  }

  .nd-msg.user{
    align-self:flex-end;
    background:#7c3aed;
    color:white;
    border-bottom-right-radius:5px;
  }

  .nd-msg.bot{
    align-self:flex-start;
    background:#161c27;
    color:#e5e7eb;
    border-bottom-left-radius:5px;
  }

  .nd-input-wrap{
    display:flex;
    gap:10px;
    padding:14px;
    background:#111827;
    border-top:1px solid #1f2937;
  }

  .nd-input{
    flex:1;
    border:none;
    outline:none;
    background:#1f2937;
    color:white;
    border-radius:12px;
    padding:11px 12px;
    font-size:13px;
  }

  .nd-send{
    width:42px;
    height:42px;
    border:none;
    border-radius:12px;
    background:#7c3aed;
    color:white;
    cursor:pointer;
    font-size:15px;
  }

  .nd-footer{
    text-align:center;
    padding:10px;
    font-size:11px;
    color:#94a3b8;
    background:#111827;
    border-top:1px solid #1f2937;
  }

  .nd-btn{
    position:fixed;
    bottom:24px;
    right:24px;
    width:64px;
    height:64px;
    border:none;
    border-radius:50%;
    cursor:pointer;
    background:linear-gradient(135deg,#7c3aed,#9333ea);
    display:flex;
    align-items:center;
    justify-content:center;
    z-index:999999;
    box-shadow:0 12px 40px rgba(124,58,237,.45);
  }

  .nd-btn svg{
    width:28px;
    height:28px;
    fill:white;
  }

  .typing-wrap{
    display:flex;
    gap:5px;
    align-items:center;
  }

  .typing-dot{
    width:7px;
    height:7px;
    border-radius:50%;
    background:#a855f7;
    animation:blink 1.4s infinite both;
  }

  .typing-dot:nth-child(2){
    animation-delay:.2s;
  }

  .typing-dot:nth-child(3){
    animation-delay:.4s;
  }

  @keyframes blink{
    0%{
      opacity:.2;
      transform:translateY(0px);
    }
    20%{
      opacity:1;
      transform:translateY(-3px);
    }
    100%{
      opacity:.2;
      transform:translateY(0px);
    }
  }

  `;

  document.head.appendChild(style);

  // =========================
  // HTML
  // =========================

  const wrapper = document.createElement('div');

  wrapper.innerHTML = `

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

      <button
        class="nd-send"
        id="nd-send"
      >
        ➤
      </button>

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

  document.body.appendChild(wrapper);

  // =========================
  // ELEMENTS
  // =========================

  const chat = document.getElementById('nd-chat');
  const btn = document.getElementById('nd-btn');
  const closeBtn = document.getElementById('nd-close');
  const input = document.getElementById('nd-input');
  const sendBtn = document.getElementById('nd-send');
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
    name:'',
    email:'',
    phone:'',
    preferred_contact:''
  };

  // =========================
  // HELPERS
  // =========================

  function addMsg(role,text){

    const div = document.createElement('div');

    div.className = `nd-msg ${role}`;

    div.textContent = text;

    messages.appendChild(div);

    messages.scrollTo({
      top:messages.scrollHeight,
      behavior:'smooth'
    });
  }

  async function addBotMsgAnimated(text){

    const typing = document.createElement('div');

    typing.className = 'nd-msg bot';

    typing.innerHTML = `
      <div class="typing-wrap">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>
    `;

    messages.appendChild(typing);

    messages.scrollTo({
      top:messages.scrollHeight,
      behavior:'smooth'
    });

    await new Promise(r =>
      setTimeout(r,500 + text.length * 8)
    );

    typing.remove();

    const msg = document.createElement('div');

    msg.className = 'nd-msg bot';

    messages.appendChild(msg);

    let current = '';

    for(const char of text){

      current += char;

      msg.textContent = current;

      messages.scrollTo({
        top:messages.scrollHeight,
        behavior:'smooth'
      });

      await new Promise(r => setTimeout(r,10));
    }
  }

  function resetLeadState(){

    leadMode = false;

    awaitingName = false;
    awaitingEmail = false;
    awaitingContactPreference = false;
    awaitingPhone = false;

    leadData = {
      name:'',
      email:'',
      phone:'',
      preferred_contact:''
    };
  }

  async function saveLead(){

    const response = await fetch(
      'https://nexadesk.co.uk/api/save-lead',
      {
        method:'POST',
        headers:{
          'Content-Type':'application/json'
        },
        body:JSON.stringify({
          name:leadData.name || '',
          email:leadData.email || '',
          phone:leadData.phone || '',
          preferred_contact:leadData.preferred_contact,
          message:history.map(m => m.content).join(' | '),
          client_id:clientId
        })
      }
    );

    if(!response.ok){
      throw new Error('Failed to save lead');
    }

    return await response.json();
  }

  async function saveConversation(leadId){

    await fetch(
      'https://nexadesk.co.uk/api/save-conversation',
      {
        method:'POST',
        headers:{
          'Content-Type':'application/json'
        },
        body:JSON.stringify({
          client_id:clientId,
          lead_id:leadId || null,
          messages:history
        })
      }
    );
  }

  // =========================
  // OPEN / CLOSE
  // =========================

  btn.addEventListener('click',()=>{

    if(chat.style.display === 'flex'){

      chat.classList.remove('open');

      setTimeout(()=>{
        chat.style.display = 'none';
      },250);

    }else{

      chat.style.display = 'flex';

      setTimeout(()=>{
        chat.classList.add('open');
      },10);

      input.focus();
    }
  });

  closeBtn.addEventListener('click',()=>{

    chat.classList.remove('open');

    setTimeout(()=>{
      chat.style.display = 'none';
    },250);
  });

  // =========================
  // SEND MESSAGE
  // =========================

  async function sendMessage(){

    const text = input.value.trim();

    if(!text) return;

    const lowerText = text.toLowerCase();

    addMsg('user',text);

    history.push({
      role:'user',
      content:text
    });

    input.value = '';

    // =========================
    // NAME
    // =========================

    if(awaitingName){

      leadData.name = text;

      awaitingName = false;
      awaitingEmail = true;

      await addBotMsgAnimated(
        'Perfect — what’s the best email to reach you on?'
      );

      return;
    }

    // =========================
    // EMAIL
    // =========================

    if(awaitingEmail){

      const validEmail =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);

      if(!validEmail){

        await addBotMsgAnimated(
          'That email doesn’t look valid — could you try again?'
        );

        return;
      }

      leadData.email = text;

      awaitingEmail = false;
      awaitingContactPreference = true;

      await addBotMsgAnimated(
        'Got it! Would you prefer we contact you by email or phone?'
      );

      return;
    }

    // =========================
    // CONTACT PREF
    // =========================

    if(awaitingContactPreference){

      leadData.preferred_contact =
        lowerText.includes('phone')
          ? 'phone'
          : 'email';

      awaitingContactPreference = false;

      if(leadData.preferred_contact === 'phone'){

        awaitingPhone = true;

        await addBotMsgAnimated(
          'Perfect — what’s the best number to reach you on?'
        );

        return;
      }

      try{

        const saved = await saveLead();

        await saveConversation(saved.id);

      }catch(err){
        console.error(err);
      }

      await addBotMsgAnimated(
        'Amazing — you’re all set! Someone from the team will contact you shortly.'
      );

      resetLeadState();

      return;
    }

    // =========================
    // PHONE
    // =========================

    if(awaitingPhone){

      leadData.phone = text;

      try{

        const saved = await saveLead();

        await saveConversation(saved.id);

      }catch(err){
        console.error(err);
      }

      await addBotMsgAnimated(
        'Perfect — someone from the team will call you very soon. 🎉'
      );

      resetLeadState();

      return;
    }

    // =========================
    // LEAD DETECTION
    // =========================

    const interested =
      lowerText.includes('price') ||
      lowerText.includes('pricing') ||
      lowerText.includes('interested') ||
      lowerText.includes('contact') ||
      lowerText.includes('call') ||
      lowerText.includes('demo') ||
      lowerText.includes('book');

    if(interested && !leadMode){

      leadMode = true;

      awaitingName = true;

      await addBotMsgAnimated(
        'Great! Before we continue, could I get your name?'
      );

      return;
    }

    // =========================
    // AI RESPONSE
    // =========================

    try{

      const response = await fetch(
        'https://nexadesk.co.uk/api/widget',
        {
          method:'POST',
          headers:{
            'Content-Type':'application/json'
          },
          body:JSON.stringify({
            clientId,
            messages:history
          })
        }
      );

      const data = await response.json();

      history.push({
        role:'assistant',
        content:data.reply
      });

      const parts = data.reply
        .split(/\n\s*\n/)
        .map(p => p.trim())
        .filter(Boolean);

      for(const part of parts){
        await addBotMsgAnimated(part);
      }

    }catch(err){

      console.error(err);

      await addBotMsgAnimated(
        'Something went wrong. Please try again.'
      );
    }
  }

  // =========================
  // EVENTS
  // =========================

  sendBtn.addEventListener('click',sendMessage);

  input.addEventListener('keypress',e=>{
    if(e.key === 'Enter'){
      sendMessage();
    }
  });

})();
