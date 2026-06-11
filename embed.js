(function() {
  const clientId = document.currentScript.getAttribute('data-client-id');
  
  if (!clientId) return;

  // Create widget styles
  const style = document.createElement('style');

style.innerHTML = `
.nd-widget-wrap {
position: fixed;
bottom: 24px;
right: 24px;
z-index: 9999;
font-family: sans-serif;
}

.nd-btn {
width: 56px;
height: 56px;
background: #7c5cfc;
border: none;
border-radius: 50%;
cursor: pointer;
display: flex;
align-items: center;
justify-content: center;
box-shadow: 0 4px 20px rgba(124,92,252,0.45);
}

.nd-btn svg {
width: 24px;
height: 24px;
fill: white;
}

.nd-chat {
display: none;
width: 320px;
background: white;
border-radius: 16px;
box-shadow: 0 20px 60px rgba(0,0,0,0.2);
overflow: hidden;
margin-bottom: 12px;
}

.nd-header {
background: #7c5cfc;
padding: 16px;
color: white;
display: flex;
justify-content: space-between;
align-items: center;
}

.nd-header span {
font-weight: 600;
}

.nd-close {
background: none;
border: none;
color: white;
cursor: pointer;
font-size: 1.2rem;
}

.nd-messages {
padding: 16px;
height: 260px;
overflow-y: auto;
display: flex;
flex-direction: column;
gap: 10px;
background: #f9f9fb;
}

.nd-msg {
max-width: 80%;
padding: 8px 12px;
border-radius: 12px;
font-size: 0.85rem;
line-height: 1.5;
}

.nd-msg.bot {
background: white;
border: 1px solid #e8e8ee;
color: #111;
align-self: flex-start;
}

.nd-msg.user {
background: #7c5cfc;
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
border-radius: 8px;
padding: 8px 12px;
font-size: 0.85rem;
outline: none;
}

.nd-send {
width: 34px;
height: 34px;
background: #7c5cfc;
border: none;
border-radius: 8px;
cursor: pointer;
color: white;
font-size: 1rem;
}

.nd-footer {
text-align: center;
padding: 6px;
font-size: 0.65rem;
color: #aaa;
background: white;
}

.typing-dot {
width: 6px;
height: 6px;
background: #999;
border-radius: 50%;
display: inline-block;
animation: bounce 1.2s infinite;
margin: 0 2px;
}

.typing-dot:nth-child(2) {
animation-delay: 0.2s;
}

.typing-dot:nth-child(3) {
animation-delay: 0.4s;
}

@keyframes bounce {
0%,80%,100% {
transform: scale(0.8);
opacity: 0.5;
}

40% {
transform: scale(1);
opacity: 1;
}
}
`;

document.head.appendChild(style);


  // Create widget HTML
  const wrap = document.createElement('div');
  wrap.className = 'nd-widget-wrap';
  wrap.innerHTML = `
    <div class="nd-chat" id="nd-chat">
      <div class="nd-header">
        <span>Chat with us</span>
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
      <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    </button>
  `;
  document.body.appendChild(wrap);

  const chat = document.getElementById('nd-chat');
  const btn = document.getElementById('nd-btn');
  const closeBtn = document.getElementById('nd-close');
  const input = document.getElementById('nd-input');
  const send = document.getElementById('nd-send');
  const messages = document.getElementById('nd-messages');
  let history = [];

  btn.addEventListener('click', () => {
    chat.style.display = chat.style.display === 'block' ? 'none' : 'block';
  });

  closeBtn.addEventListener('click', () => {
    chat.style.display = 'none';
  });

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    history.push({ role: 'user', content: text });

    const userMsg = document.createElement('div');
    userMsg.className = 'nd-msg user';
    userMsg.textContent = text;
    messages.appendChild(userMsg);
    input.value = '';
    messages.scrollTop = messages.scrollHeight;

    try {
      const response = await fetch('https://nexadesk.co.uk/api/widget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, messages: history })
      });

      const raw = await response.text();

console.log("RAW RESPONSE:", raw);

const data = JSON.parse(raw);

history.push({ role: 'assistant', content: data.reply });

const fullReply = data.reply || raw;

const splitReply = fullReply
.split('\n\n')
.filter(p => p.trim());

for (const paragraph of splitReply) {

// Typing indicator
const typing = document.createElement('div');

typing.className = 'nd-msg bot';

typing.innerHTML = `     <span class="typing-dot"></span>     <span class="typing-dot"></span>     <span class="typing-dot"></span>
  `;

messages.appendChild(typing);

messages.scrollTop = messages.scrollHeight;

// Fake thinking delay
await new Promise(r => setTimeout(r, 2200));

typing.remove();

// Real message bubble
const botMsg = document.createElement('div');

botMsg.className = 'nd-msg bot';

messages.appendChild(botMsg);

// Slow typing effect
let current = '';

for (const char of paragraph) {


current += char;

botMsg.textContent = current;

messages.scrollTop = messages.scrollHeight;

await new Promise(r => setTimeout(r, 22));


}

await new Promise(r => setTimeout(r, 900));
}

    } catch (e) {
      const errMsg = document.createElement('div');
      errMsg.className = 'nd-msg bot';
      errMsg.textContent = 'Sorry, something went wrong.';
      messages.appendChild(errMsg);
    }
  }

  send.addEventListener('click', sendMessage);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });
})();
