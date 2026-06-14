(async function () {

  // =========================
  // SCRIPT + CLIENT
  // =========================

  const script =
  document.currentScript;

  const clientId =
  script.getAttribute(
    'data-client-id'
  );

  // =========================
  // SUPABASE
  // =========================

  const SUPABASE_URL =
  'https://exqdmvloldvshzpxevht.supabase.co';

  const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4cWRtdmxvbGR2c2h6cHhldmh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMzc5NDQsImV4cCI6MjA5NjYxMzk0NH0.nI_pnnKo236Bd6whjvfvZMGnStJz8q4y6ttENmiNgxg';

  // =========================
  // STYLES
  // =========================

  const style =
  document.createElement('style');

  style.textContent = `

  *{
    box-sizing:border-box;
    font-family:Inter,sans-serif;
  }

  .nd-chat{
    position:fixed;
    bottom:90px;
    right:24px;
    width:380px;
    height:640px;
    background:#f5f5f5;
    border-radius:30px;
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

    background:
    linear-gradient(
      135deg,
      #0b1020,
      #111827
    );

    color:white;

    padding:18px;

    display:flex;
    align-items:center;
    justify-content:space-between;

    border-bottom:
    1px solid rgba(255,255,255,.06);

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
    object-fit:cover;
  }

  .nd-header-info{
    display:flex;
    flex-direction:column;
  }

  .nd-title{
    font-size:15px;
    font-weight:700;
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
    background:#f5f5f5;
  }

  .nd-msg{
    max-width:82%;
    padding:14px 16px;
    border-radius:20px;
    line-height:1.65;
    font-size:13px;
    white-space:pre-wrap;
    animation:fadeIn .18s ease;
  }

  @keyframes fadeIn{
    from{
      opacity:0;
      transform:translateY(6px);
    }
    to{
      opacity:1;
      transform:translateY(0);
    }
  }

  .nd-msg.user{
    align-self:flex-end;
    background:
    linear-gradient(
      135deg,
      #8b5cf6,
      #7c3aed
    );
    color:white;
    border-bottom-right-radius:6px;
  }

  .nd-msg.bot{
    align-self:flex-start;
    background:white;
    color:#111827;
    border:1px solid #ececec;
    border-bottom-left-radius:6px;
  }

  .nd-input-wrap{
    display:flex;
    gap:10px;
    padding:14px;
    background:#ffffff;
    border-top:1px solid #ececec;
  }

  .nd-input{
    flex:1;
    border:none;
    outline:none;
    background:#f3f4f6;
    border-radius:16px;
    padding:14px;
    font-size:13px;
  }

  .nd-send{
    width:50px;
    height:50px;
    border:none;
    border-radius:16px;
    background:
    linear-gradient(
      135deg,
      #8b5cf6,
      #7c3aed
    );
    color:white;
    cursor:pointer;
    font-size:16px;
    flex-shrink:0;
    transition:.2s;
  }

  .nd-send:hover{
    transform:translateY(-1px);
  }

  .nd-footer{
    text-align:center;
    padding:8px;
    font-size:10px;
    color:#6b7280;
    background:white;
    border-top:1px solid #ececec;
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

    background:
    linear-gradient(
      135deg,
      #8b5cf6,
      #7c3aed
    );

    display:flex;
    align-items:center;
    justify-content:center;

    z-index:999999;

    box-shadow:
    0 16px 45px rgba(139,92,246,.45);

  }

  .nd-btn img{
    width:34px;
    height:34px;
    object-fit:contain;
  }

  ::-webkit-scrollbar{
    width:8px;
  }

  ::-webkit-scrollbar-thumb{
    background:#d1d5db;
    border-radius:20px;
  }

  @media(max-width:480px){

    .nd-chat{
      width:calc(100vw - 24px);
      right:12px;
      left:12px;
      bottom:82px;
      height:74vh;
    }

  }

  `;

  document.head.appendChild(style);

  // =========================
  // HTML
  // =========================

  const wrapper =
  document.createElement('div');

  wrapper.innerHTML = `

  <div class="nd-chat" id="nd-chat">

    <div class="nd-header">

      <div class="nd-header-left">

        <img
          src="/nexadesk-logo.png"
          class="nd-logo"
        />

        <div class="nd-header-info">

          <div class="nd-title">
            NexaDesk AI
          </div>

          <div class="nd-status">
            Online now
          </div>

        </div>

      </div>

      <div
        class="nd-close"
        id="nd-close"
      >
        ✕
      </div>

    </div>

    <div
      class="nd-messages"
      id="nd-messages"
    ></div>

    <div class="nd-input-wrap">

      <input
        id="nd-input"
        class="nd-input"
        placeholder="Type your message..."
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

  <button
    class="nd-btn"
    id="nd-btn"
  >

    <img src="/nexadesk-logo.png" />

  </button>

  `;

  document.body.appendChild(wrapper);

  // =========================
  // ELEMENTS
  // =========================

  const chat =
  document.getElementById('nd-chat');

  const btn =
  document.getElementById('nd-btn');

  const closeBtn =
  document.getElementById('nd-close');

  const input =
  document.getElementById('nd-input');

  const sendBtn =
  document.getElementById('nd-send');

  const messagesEl =
  document.getElementById('nd-messages');

  // =========================
  // STATE
  // =========================

  let history = [];

  let conversationId = null;

  // =========================
  // HELPERS
  // =========================

  function scrollBottom(){

    messagesEl.scrollTo({
      top:messagesEl.scrollHeight,
      behavior:'smooth'
    });

  }

  function addMessage(role,text){

    history.push({
      role,
      content:text
    });

    const div =
    document.createElement('div');

    div.className =
    `nd-msg ${
      role === 'assistant'
      ? 'bot'
      : 'user'
    }`;

    div.textContent =
    text;

    messagesEl.appendChild(div);

    scrollBottom();

  }

  // =========================
  // SAVE CONVERSATION
  // =========================

  async function saveConversation(){

    try{

      if(!conversationId){

        const response =
        await fetch(

          `${SUPABASE_URL}/rest/v1/Conversations`,

          {
            method:'POST',

            headers:{
              apikey:SUPABASE_KEY,

              Authorization:
              `Bearer ${SUPABASE_KEY}`,

              'Content-Type':
              'application/json',

              Prefer:
              'return=representation'
            },

            body:JSON.stringify({

              client_id:
              String(clientId),

              messages:history

            })

          }

        );

        const data =
        await response.json();

        if(data && data[0]){

          conversationId =
          data[0].id;

        }

      }

      else{

        await fetch(

          `${SUPABASE_URL}/rest/v1/Conversations?id=eq.${conversationId}`,

          {
            method:'PATCH',

            headers:{
              apikey:SUPABASE_KEY,

              Authorization:
              `Bearer ${SUPABASE_KEY}`,

              'Content-Type':
              'application/json'
            },

            body:JSON.stringify({
              messages:history
            })

          }

        );

      }

    }

    catch(err){

      console.error(err);

    }

  }

  // =========================
  // AI RESPONSE
  // =========================

  async function realAIReply(){

    try{

      const typing =
      document.createElement('div');

      typing.className =
      'nd-msg bot';

      typing.textContent =
      'Typing...';

      messagesEl.appendChild(
        typing
      );

      scrollBottom();

      const response =
      await fetch(
        '/api/chat',
        {
          method:'POST',

          headers:{
            'Content-Type':
            'application/json'
          },

          body:JSON.stringify({

            businessName:
            'NexaDesk',

            messages:history

          })

        }
      );

      const data =
      await response.json();

      typing.remove();

      const aiReply =
      data.reply ||
      'Sorry, something went wrong.';

      addMessage(
        'assistant',
        aiReply
      );

      await saveConversation();

    }

    catch(err){

      console.error(err);

      addMessage(
        'assistant',
        'AI is temporarily unavailable.'
      );

    }

  }

  // =========================
  // SEND
  // =========================

  async function sendMessage(){

    const text =
    input.value.trim();

    if(!text) return;

    addMessage(
      'user',
      text
    );

    input.value = '';

    await saveConversation();

    await realAIReply();

  }

  // =========================
  // EVENTS
  // =========================

  btn.addEventListener(
    'click',
    ()=>{

      if(
        chat.style.display ===
        'flex'
      ){

        chat.classList.remove(
          'open'
        );

        setTimeout(()=>{

          chat.style.display =
          'none';

        },200);

      }

      else{

        chat.style.display =
        'flex';

        setTimeout(()=>{

          chat.classList.add(
            'open'
          );

        },10);

      }

    }
  );

  closeBtn.addEventListener(
    'click',
    ()=>{

      chat.classList.remove(
        'open'
      );

      setTimeout(()=>{

        chat.style.display =
        'none';

      },200);

    }
  );

  sendBtn.addEventListener(
    'click',
    sendMessage
  );

  input.addEventListener(
    'keydown',
    (e)=>{

      if(e.key === 'Enter'){

        sendMessage();

      }

    }
  );

  // =========================
  // WELCOME
  // =========================

  addMessage(
    'assistant',
    '👋 Hey! Welcome to NexaDesk — how can I help you today?'
  );

  await saveConversation();

})();