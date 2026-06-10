const SUPABASE_URL = "https://exqdmvloldvshzpxevht.supabase.co";

const SUPABASE_KEY = "sb_publishable__bJTNHHD95Uop41LMarPsQ_zjZzk4af";

async function loadLeads() {
    console.log("Loading leads...");

try {

const response = await fetch(
  `${SUPABASE_URL}/rest/v1/Leads?select=*`,
  {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`
    }
  }
);

const leads = await response.json();
console.log(leads);

const table = document.getElementById("leadsTable");

table.innerHTML = "";

leads.reverse().forEach(lead => {

  table.innerHTML += `
    <tr>
      <td>${lead.name || "Unknown"}</td>
      <td>${lead.email || "No Email"}</td>
      <td>${lead.business_type || "Unknown"}</td>
      <td><span class="status">New Lead</span></td>
    </tr>
  `;

});

} catch (error) {


console.error("Error loading leads:", error);

}
document.body.style.visibility = 'visible';

}

loadLeads();
