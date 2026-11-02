-- Reference data
insert into categories (slug, label, sort) values
  ('environment', 'Environment and wildlife', 1),
  ('events', 'Events and festivals', 2),
  ('sport', 'Sport and clubs', 3),
  ('emergency', 'Emergency services', 4),
  ('aged-care', 'Aged care and social support', 5),
  ('arts', 'Arts and culture', 6),
  ('op-shops', 'Op shops and retail', 7),
  ('food', 'Food and hospitality', 8),
  ('admin', 'Admin and committee', 9),
  ('youth', 'Youth and education', 10),
  ('animals', 'Animals', 11),
  ('trades', 'Trades and maintenance', 12)
on conflict do nothing;

insert into suburbs (name) values
  ('Cowes'), ('Rhyll'), ('Newhaven'), ('Cape Woolamai'), ('Ventnor'), ('Smiths Beach'),
  ('Surf Beach'), ('San Remo'), ('Silverleaves'), ('Wimbledon Heights'), ('Summerlands')
on conflict do nothing;

-- Launch organisations. Details marked TODO must be confirmed with each organisation before go-live.
-- Inserted as approved by the seed (runs as superuser, so the status trigger's admin check is bypassed via session_replication_role).
set session_replication_role = replica;
insert into organisations (slug, name, type, about, contact_name, contact_email, status, approved_at, created_by) values
  ('island-voice', 'Island Voice', 'incorporated_association', 'TODO: one-line description from Island Voice.', 'TODO', 'todo@example.org', 'approved', now(), null),
  ('carols-by-the-bay', 'Carols by the Bay', 'informal_group', 'TODO: one-line description from Carols by the Bay.', 'TODO', 'todo@example.org', 'approved', now(), null)
on conflict (slug) do nothing;
set session_replication_role = origin;
