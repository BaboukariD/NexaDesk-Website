-- Adds AI-computed buying-intent score to captured leads.
-- score: 0-100, set by api/widget.js when a Growth/Pro client's assistant
-- decides a visitor is ready to be asked for their details.
-- score_reason: short human-readable justification, shown as a tooltip
-- on the score badge in the client and admin dashboards.

alter table "Leads"
  add column if not exists score integer,
  add column if not exists score_reason text;

alter table "Leads"
  add constraint leads_score_range check (score is null or (score >= 0 and score <= 100));
