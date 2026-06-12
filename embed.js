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

/* =========================
BUTTON
========================= */

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

box-shadow:
0 10px 30px rgba(124,92,252,0.35),
0 4px 16px rgba(0,0,0,0.12);

transition: all 0.25s ease;
}

.nd-btn:hover {
transform: scale(1.08);
box-shadow:
0 14px 36px rgba(124,92,252,0.45),
0 8px 24px rgba(0,0,0,0.18);
}

.nd-btn svg {
width: 24px;
height: 24px;
fill: white;
}

/* =========================
CHAT WINDOW
========================= */

.nd-chat {
display: none;
width: 340px;
background: rgba(255,255,255,0.92);

backdrop-filter: blur(14px);
-webkit-backdrop-filter: blur(14px);

border-radius: 20px;

box-shadow:
0 10px 30px rgba(0,0,0,0.08),
0 20px 60px rgba(124,92,252,0.12);

overflow: hidden;
margin-bottom: 14px;

opacity: 0;
transform: translateY(14px) scale(0.96);

transition:
opacity 0.25s ease,
transform 0.25s ease;
}

.nd-chat.open {
opacity: 1;
transform: translateY(0) scale(1);
}

/* =========================
HEADER
========================= */

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

.nd-close:hover {
opacity: 1;
}

/* =========================
MESSAGES
========================= */

.nd-messages {
padding: 16px;
height: 320px;

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

/* =========================
INPUT
========================= */

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

box-shadow:
0 0 0 4px rgba(124,92,252,0.12);

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

.nd-send:hover {
transform: scale(1.08);
}

/* =========================
FOOTER
========================= */

.nd-footer {
text-align: center;

padding: 8px;

font-size: 0.68rem;

color: #aaa;

background: white;
}

/* =========================
TYPING DOTS
========================= */

.typing-dot {
width: 6px;
height: 6px;

background: #999;

border-radius: 50%;

display: inline-block;

margin: 0 2px;

opacity: 0.8;

animation: bounce 1.2s infinite;
}

.typing-dot:nth-child(2) {
animation-delay: 0.2s;
}

.typing-dot:nth-child(3) {
animation-delay: 0.4s;
}

/* =========================
ANIMATIONS
========================= */

@keyframes pulseDot {

0% {
transform: scale(1);
opacity: 1;
}

50% {
transform: scale(1.25);
opacity: 0.7;
}

100% {
transform: scale(1);
opacity: 1;
}

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

@keyframes fadeInMsg {

0% {
opacity: 0;
transform: translateY(8px);
}

100% {
opacity: 1;
transform: translateY(0);
}

}

/* =========================
MOBILE
========================= */

@media (max-width: 480px) {

.nd-widget-wrap {
right: 14px;
bottom: 14px;
}

.nd-chat {
width: calc(100vw - 28px);
max-width: 360px;
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

<div class="nd-msg bot">
Hi! How can I help you today?
</div>

</div>

<div class="nd-input-row">

<input
type="text"
class="nd-input"
id="nd-input"
placeholder="Type a message..."
/>

<button class="nd-send" id="nd-send">
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

  let history = [];
  let leadMode = false;
  let leadData = {
    name: '',
    email: '',
    phone: '',
    preferred_contact: ''
    };


let awaitingName = false;
let awaitingEmail = false;
let awaitingContactPreference = false;



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

      chat.style.display = 'block';

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

const lowerText = text.toLowerCase();

const interested =
lowerText.includes('price') ||
lowerText.includes('pricing') ||
lowerText.includes('interested') ||
lowerText.includes('contact') ||
lowerText.includes('call') ||
lowerText.includes('book') ||
lowerText.includes('demo') ||
lowerText.includes('get started');

    if (!text) return;


if (awaitingName) {

leadData.name = text;

const userMsg =
document.createElement('div');

userMsg.className = 'nd-msg user';

userMsg.textContent = text;

messages.appendChild(userMsg);

messages.scrollTo({
top: messages.scrollHeight,
behavior: 'smooth'
});

awaitingName = false;
awaitingEmail = true;

const emailMsg =
document.createElement('div');

emailMsg.className = 'nd-msg bot';

emailMsg.textContent =
'Perfect — what’s the best email to reach you on?';

messages.appendChild(emailMsg);

messages.scrollTo({
top: messages.scrollHeight,
behavior: 'smooth'
});

input.value = '';

return;

}

const validEmail =
/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);

if (awaitingEmail && validEmail) {


leadData.email = text;

const userMsg =
document.createElement('div');

userMsg.className = 'nd-msg user';

userMsg.textContent = text;

messages.appendChild(userMsg);

messages.scrollTo({
top: messages.scrollHeight,
behavior: 'smooth'
});

awaitingEmail = false;
awaitingContactPreference = true;

const contactMsg =
document.createElement('div');

contactMsg.className = 'nd-msg bot';

contactMsg.textContent =
'Would you prefer we contact you by email or phone?';

messages.appendChild(contactMsg);

messages.scrollTo({
top: messages.scrollHeight,
behavior: 'smooth'
});

input.value = '';

return;

}


if (awaitingEmail && !validEmail) {

const invalidMsg =
document.createElement('div');

invalidMsg.className = 'nd-msg bot';

invalidMsg.textContent =
'That email doesn’t look quite right — could you try again?';

messages.appendChild(invalidMsg);

messages.scrollTo({
top: messages.scrollHeight,
behavior: 'smooth'
});

return;

}


if (awaitingContactPreference) {

leadData.preferred_contact =
lowerText.includes('phone')
? 'phone'
: 'email';

const userMsg =
document.createElement('div');

userMsg.className = 'nd-msg user';

userMsg.textContent = text;

messages.appendChild(userMsg);
messages.scrollTo({
top: messages.scrollHeight,
behavior: 'smooth'
});


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

preferred_contact:
leadData.preferred_contact,

message: history
.map(m => m.content)
.join(' | '),

client_id: clientId

})
}
);

if (!response.ok) {

throw new Error(
'Failed to save lead'
);

}


const confirmMsg =
document.createElement('div');

confirmMsg.className = 'nd-msg bot';

confirmMsg.textContent =
'Perfect — thanks! Someone from the team will reach out shortly.';

messages.appendChild(confirmMsg);

messages.scrollTo({
top: messages.scrollHeight,
behavior: 'smooth'
});

awaitingContactPreference = false;

leadMode = false;

input.value = '';

return;

}
history.push({
role: 'user',
content: text
});

    
if (interested && !leadMode) {

leadMode = true;
awaitingName = true;


setTimeout(() => {

const leadMsg = document.createElement('div');

leadMsg.className = 'nd-msg bot';

leadMsg.textContent =
'Before we continue, may I get your name?';

messages.appendChild(leadMsg);

messages.scrollTo({
top: messages.scrollHeight,
behavior: 'smooth'
});

}, 1200);

}


    // USER MESSAGE

    const userMsg = document.createElement('div');

    userMsg.className = 'nd-msg user';
    userMsg.textContent = text;

    messages.appendChild(userMsg);

    input.value = '';

    messages.scrollTop = messages.scrollHeight;

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

      const raw = await response.text();

      console.log('RAW RESPONSE:', raw);

      const data = JSON.parse(raw);

      history.push({
        role: 'assistant',
        content: data.reply
      });

      const fullReply = data.reply || raw;

      const splitReply = fullReply
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 0);

      for (const paragraph of splitReply) {

        // TYPING INDICATOR

        const typing = document.createElement('div');

        typing.className = 'nd-msg bot';

        typing.style.width = 'fit-content';

        typing.innerHTML = `
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        `;

        messages.appendChild(typing);

        messages.scrollTop = messages.scrollHeight;

        // THINKING DELAY

        const thinkingTime = Math.min(
          1200 + paragraph.length * 10,
          2800
        );

        await new Promise(r =>
          setTimeout(r, thinkingTime)
        );

        typing.remove();

        // BOT MESSAGE

        const botMsg = document.createElement('div');

        botMsg.className = 'nd-msg bot';

        messages.appendChild(botMsg);

        // TYPEWRITER EFFECT

        let current = '';

        for (const char of paragraph) {

          current += char;

          botMsg.textContent = current;

          messages.scrollTo({
            top: messages.scrollHeight,
            behavior: 'smooth'
            });


          const typingSpeed =
          paragraph.length > 180 ? 8 :
          paragraph.length > 100 ? 14 :
          20;

          await new Promise(r =>
            setTimeout(r, typingSpeed)
          );

        }

        await new Promise(r =>
          setTimeout(r, 350)
        );

      }

    } catch (e) {

      const errMsg = document.createElement('div');

      errMsg.className = 'nd-msg bot';

      errMsg.textContent =
      'Sorry, something went wrong.';

      messages.appendChild(errMsg);

    }

  }

  // =========================
  // EVENTS
  // =========================

  send.addEventListener('click', sendMessage);

  input.addEventListener('keydown', e => {

    if (e.key === 'Enter') {
      sendMessage();
    }

  });

})();
