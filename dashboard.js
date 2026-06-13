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

    modalBody.scrollTop = modalBody.scrollHeight;

  } catch (err) {
    modalBody.innerHTML = `<div class="conv-empty">Error loading conversation.</div>`;
  }
}

// =========================
// CHART HELPERS
// =========================

function drawBarChart(canvasId, labels, values, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const max = Math.max(...values, 1);
  const padLeft = 28;
  const padBottom = 32;
  const padTop = 16;
  const padRight = 16;
  const chartW = W - padLeft - padRight;
  const chartH = H - padBottom - padTop;
  const barW = (chartW / labels.length) * 0.5;
  const gap  = chartW / labels.length;

  ctx.clearRect(0, 0, W, H);

  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padTop + (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(W - padRight, y);
    ctx.stroke();
  }

  // Bars
  values.forEach((val, i) => {
    const x = padLeft + gap * i + (gap - barW) / 2;
    const barH = (val / max) * chartH;
    const y = padTop + chartH - barH;

    const grad = ctx.createLinearGradient(0, y, 0, y + barH);
    grad.addColorStop(0, color);
    grad.addColorStop(1, color + '44');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, barW, barH, 4);
    ctx.fill();

    // Value label
    if (val > 0) {
      ctx.fillStyle = 'white';
      ctx.font = '600 11px DM Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(val, x + barW / 2, y - 5);
    }

    // Day label
    ctx.fillStyle = '#9da8d6';
    ctx.font = '11px DM Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(labels[i], x + barW / 2, H - 8);
  });
}

function drawDonutChart(canvasId, values, colors, labels) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const cx = W / 2;
  const cy = H / 2;
  const radius = Math.min(W, H) / 2 - 20;
  const total = values.reduce((a, b) => a + b, 0);

  ctx.clearRect(0, 0, W, H);

  if (total === 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#9da8d6';
    ctx.font = '12px DM Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No data', cx, cy + 4);
    return;
  }

  let startAngle = -Math.PI / 2;
  values.forEach((val, i) => {
    const slice = (val / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, startAngle + slice);
    ctx.closePath();
    ctx.fillStyle = colors[i];
    ctx.fill();
    startAngle += slice;
  });

  // Donut hole
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.58, 0, Math.PI * 2);
  ctx.fillStyle = '#151d3b';
  ctx.fill();

  // Centre text
  ctx.fillStyle = 'white';
  ctx.font = 'bold 20px DM Sans, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(total, cx, cy + 4);
  ctx.fillStyle = '#9da8d6';
  ctx.font = '11px DM Sans, sans-serif';
  ctx.fillText('total', cx, cy + 18);
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

    // =========================
    // ANALYTICS CHARTS
    // =========================

    // Last 7 days bar chart
    const days = [];
    const dayCounts = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const str = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-GB', { weekday: 'short' });
      days.push(label);
      dayCounts.push(leads.filter(l => l.created_at && l.created_at.startsWith(str)).length);
    }
    drawBarChart('leadsChart', days, dayCounts, '#7c5cff');

    // Contact preference donut
    const emailCount = leads.filter(l => l.preferred_contact === 'email').length;
    const phoneCount = leads.filter(l => l.preferred_contact === 'phone').length;
    const otherCount = leads.length - emailCount - phoneCount;
    drawDonutChart('contactChart', [emailCount, phoneCount, otherCount], ['#7c5cff', '#5ce1e6', '#ff6b9d'], ['Email', 'Phone', 'Other']);

    // Legend
    const legend = document.getElementById('contactLegend');
    if (legend) {
      legend.innerHTML = `
        <div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap;margin-top:12px">
          <span style="font-size:12px;color:#9da8d6"><span style="color:#7c5cff">●</span> Email (${emailCount})</span>
          <span style="font-size:12px;color:#9da8d6"><span style="color:#5ce1e6">●</span> Phone (${phoneCount})</span>
          ${otherCount > 0 ? `<span style="font-size:12px;color:#9da8d6"><span style="color:#ff6b9d">●</span> Other (${otherCount})</span>` : ''}
        </div>
      `;
    }

    // =========================
    // LEADS TABLE
    // =========================

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