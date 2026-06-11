const SUPABASE_URL = "https://exqdmvloldvshzpxevht.supabase.co";
const SUPABASE_KEY = "sb_publishable__bJTNHHD95Uop41LMarPsQ_zjZzk4af";

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
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

    const todayCount = leads.filter(l => l.created_at && l.created_at.startsWith(todayStr)).length;
    const weekCount = leads.filter(l => l.created_at && l.created_at >= weekAgo).length;

    document.getElementById('statLeads').textContent = leads.length;
    document.getElementById('statToday').textContent = todayCount;
    document.getElementById('statWeek').textContent = weekCount;

    // Active clients count
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
    const table = document.getElementById("leadsTable");
    table.innerHTML = "";

    if (leads.length === 0) {
      table.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#9da8d6;padding:32px">No leads yet</td></tr>`;
    } else {
      leads.forEach(lead => {
        const date = lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-GB') : '—';
        table.innerHTML += `
          <tr>
            <td>${lead.name || "Unknown"}</td>
            <td>${lead.email || "—"}</td>
            <td>${lead.business_type || "—"}</td>
            <td>${date}</td>
            <td><span class="status">New Lead</span></td>
          </tr>
        `;
      });
    }

  } catch (error) {
    document.getElementById('leadsTable').innerHTML = `<tr><td colspan="5" style="text-align:center;color:#ff6b6b;padding:32px">Error loading data</td></tr>`;
  }

  document.body.style.visibility = 'visible';
}

const enteredPassword = sessionStorage.getItem('nd_auth');
if (enteredPassword === "YourPasswordHere") {
  loadLeads();
} else {
  document.body.style.visibility = 'visible';
  document.body.innerHTML = "<h1 style='color:white;text-align:center;margin-top:40vh;font-family:sans-serif'>Access Denied</h1>";
}
