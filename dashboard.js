const SUPABASE_URL = "https://exqdmvloldvshzpxevht.supabase.co";
const SUPABASE_KEY = "sb_publishable__bJTNHHD95Uop41LMarPsQ_zjZzk4af";

// =========================
// MODAL
// =========================

const modalOverlay = document.getElementById('modalOverlay');
const modalClose   = document.getElementById('modalClose');
const modalBody    = document.getElementById('modalBody');
const modalTitle   = document.getElementById('modalTitle');

modalClose.addEventListener('click', () => modalOverlay.classList.remove('open'));
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) modalOverlay.classList.remove('open');
});

async function openConversation(leadId, leadName) {
  modalBody.innerHTML = `<div class="conv-empty">Loading...</div>`;
  modalTitle.textContent = `${leadName}'s Conversation`;
  modalOverlay.classList.add('open');

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/Conversations?lead_id=eq.${leadId}&order=created_at.asc`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`
        }
      }
    );

    const convos = await res.json();

    if (!convos || convos.length === 0) {
      modalBody.innerHTML = `<div class="conv-empty">No conversation stored for this lead.</div>`;
      return;
    }

    // Use the most recent conversation
    const messages = convos[convos.length - 1].messages;

    if (!messages || messages.length === 0) {
      modalBody.innerHTML = `<div class="conv-empty">Conversation is empty.</div>`;
      return;
    }

    modalBody.innerHTML = '';
    messages.forEach(msg => {
      const div = document.createElement('div');
      div.className = `conv-msg ${msg.role === 'user' ? 'user' : 'assistant'}`;
      div.textContent = msg.content;
      modalBody.appendChild(div);
    });

    // Scroll to bottom
    modalBody.scrollTop = modalBody.scrollHeight;

  } catch (err) {
    modalBody.innerHTML = `<div class="conv-empty">Error loading conversation.</div>`;
  }
}

// =========================
// LOAD DASHBOARD DATA
// =========================

async function loadLeads() {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/Leads?select=*&order=created_at.desc`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`
        }
      }
    );

    const leads = await response.json();

    // Stat cards
    const now      = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const weekAgo  = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

    const todayCount = leads.filter(l => l.created_at && l.created_at.startsWith(todayStr)).length;
    const weekCount  = leads.filter(l => l.created_at && l.created_at >= weekAgo).length;

    document.getElementById('statLeads').textContent = leads.length;
    document.getElementById('statToday').textContent = todayCount;
    document.getElementById('statWeek').textContent  = weekCount;

    // Active clients
    try {
      const clientRes = await fetch(
        `${SUPABASE_URL}/rest/v1/Clients?select=id&is_active=eq.true`,
        {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`
          }
        }
      );
      const clients = await clientRes.json();
      document.getElementById('statClients').textContent = Array.isArray(clients) ? clients.length : 0;
    } catch {
      document.getElementById('statClients').textContent = '—';
    }

    // Leads table
    const table = document.getElementById('leadsTable');
    table.innerHTML = '';

    if (leads.length === 0) {
      table.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#9da8d6;padding:32px">No leads yet</td></tr>`;
    } else {
      leads.forEach(lead => {
        const date = lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-GB') : '—';
        const row  = document.createElement('tr');
        row.innerHTML = `
          <td>${lead.name || 'Unknown'}</td>
          <td>${lead.email || '—'}</td>
          <td>${lead.phone || '—'}</td>
          <td>${lead.preferred_contact || '—'}</td>
          <td>${date}</td>
          <td><span class="status">New Lead</span></td>
          <td>
            ${lead.id
              ? `<button class="view-btn" onclick="openConversation('${lead.id}', '${(lead.name || 'Lead').replace(/'/g, "\\'")}')">View Chat</button>`
              : '—'
            }
          </td>
        `;
        table.appendChild(row);
      });
    }

  } catch (error) {
    document.getElementById('leadsTable').innerHTML = `<tr><td colspan="7" style="text-align:center;color:#ff6b6b;padding:32px">Error loading data</td></tr>`;
  }

  document.body.style.visibility = 'visible';
}

// =========================
// AUTH CHECK
// =========================

const enteredPassword = sessionStorage.getItem('nd_auth');
if (enteredPassword === "YourPasswordHere") {
  loadLeads();
} else {
  document.body.style.visibility = 'visible';
  document.body.innerHTML = "<h1 style='color:white;text-align:center;margin-top:40vh;font-family:sans-serif'>Access Denied</h1>";
}