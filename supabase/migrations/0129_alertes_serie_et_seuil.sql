-- DEUX ALERTES QUE LE SUIVI D'UNE LIGNE NE SAVAIT PAS FAIRE (11 novembre 2026, planche « Alertes de séance et de seuil », 1B et 2A).
--
-- « serie_follows » : suivre une SÉRIE, non une offre. Ce qu'on attend n'existe pas encore : la prochaine séance d'un même Trésor et d'un même instrument (toutes durées : 1B).
-- « notified » garde les séances déjà annoncées au client : un seul message par séance, même si le robot repasse.
--
-- « threshold_alerts » : un chiffre qui franchit un niveau (le cours d'une action, le rendement d'une obligation cotée, la valeur liquidative d'un fonds).
-- Elle sonne UNE FOIS puis s'éteint (« declenchee ») ; le client la remet d'un geste. Le plafond (dix alertes actives par client) se tient dans l'action serveur.
create table if not exists serie_follows (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  country     text not null,
  kind        text not null,
  label       text not null,
  notified    text[] not null default '{}',
  created_at  timestamptz not null default now(),
  unique (user_id, country, kind)
);
create index if not exists serie_follows_user on serie_follows (user_id);
alter table serie_follows enable row level security;
-- Atteinte par le rôle de service seulement : les actions serveur de Mon espace et le robot « suivi ».

create table if not exists threshold_alerts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  offer_id     text not null references offers(id) on delete cascade,
  metric       text not null check (metric in ('cours', 'rendement', 'vl')),
  sens         text not null check (sens in ('au_dessus', 'en_dessous')),
  value        numeric(18, 4) not null,
  state        text not null default 'active' check (state in ('active', 'declenchee', 'annulee')),
  fired_at     timestamptz,
  fired_value  numeric(18, 4),
  created_at   timestamptz not null default now()
);
create index if not exists threshold_alerts_user on threshold_alerts (user_id, created_at desc);
create index if not exists threshold_alerts_active on threshold_alerts (offer_id) where state = 'active';
alter table threshold_alerts enable row level security;

comment on column threshold_alerts.metric is
  'Le chiffre surveillé : le cours (action), le rendement (obligation cotée) ou la valeur liquidative (fonds).';
comment on column threshold_alerts.state is
  'Active jusqu''au franchissement ; « declenchee » ensuite (elle ne sonne qu''une fois) ; « annulee » par le client.';
