-- Locks down direct browser access to the client-facing tables.
--
-- Why this matters: client-dashboard.html, client-analytics.html,
-- client-conversations.html and client-account.html all query Supabase
-- directly from the browser using the public anon key + the logged-in
-- user's session. That is safe ONLY if Row Level Security (RLS) actually
-- restricts each query to that user's own client_id. Without it, any
-- logged-in client (even the cheapest Starter plan) could open devtools
-- and run `supabase.from('Leads').select('*')` with no filter and read
-- every other client's leads and conversations.
--
-- Safe to run more than once — policies are dropped and recreated.
-- All server-side API routes (api/*.js) use the service-role key, which
-- bypasses RLS entirely, so none of this affects them.

alter table "Clients" enable row level security;
alter table "Leads" enable row level security;
alter table "Conversations" enable row level security;
alter table "ClientUsers" enable row level security;

-- ── Clients: a logged-in user may read only their own row ──────────────
drop policy if exists "clients_select_own" on "Clients";
create policy "clients_select_own" on "Clients"
for select
using (
  contact_email = auth.jwt() ->> 'email'
  or id in (select client_id from "ClientUsers" where auth_user_id = auth.uid())
);
-- No insert/update/delete policy for anon/authenticated — every write to
-- Clients happens server-side (admin.js, client-settings.js, stripe-webhook.js)
-- via the service-role key, which isn't subject to RLS anyway.

-- ── Leads: a logged-in user may read only their own client's leads ─────
drop policy if exists "leads_select_own" on "Leads";
create policy "leads_select_own" on "Leads"
for select
using (
  client_id in (
    select id from "Clients" where contact_email = auth.jwt() ->> 'email'
    union
    select client_id from "ClientUsers" where auth_user_id = auth.uid()
  )
);
-- No insert/update/delete — all writes go through api/save-lead.js (service role).

-- ── Conversations: same pattern (client_id is stored as text here) ─────
drop policy if exists "conversations_select_own" on "Conversations";
create policy "conversations_select_own" on "Conversations"
for select
using (
  client_id in (
    select id::text from "Clients" where contact_email = auth.jwt() ->> 'email'
    union
    select client_id::text from "ClientUsers" where auth_user_id = auth.uid()
  )
);
-- No insert/update/delete — all writes go through api/save-conversation.js (service role).

-- ── ClientUsers: a user may read their own link row ─────────────────────
drop policy if exists "clientusers_select_own" on "ClientUsers";
create policy "clientusers_select_own" on "ClientUsers"
for select
using (auth_user_id = auth.uid());

-- create-password.html inserts this link row directly from the browser
-- after a new client sets their password, so it needs an insert policy —
-- but scoped so a user can only link themselves to a Clients row whose
-- contact_email matches their own authenticated email (otherwise anyone
-- could self-link to an arbitrary client_id and see that business's data).
drop policy if exists "clientusers_insert_self_matching_email" on "ClientUsers";
create policy "clientusers_insert_self_matching_email" on "ClientUsers"
for insert
with check (
  auth_user_id = auth.uid()
  and client_id in (select id from "Clients" where contact_email = auth.jwt() ->> 'email')
);
