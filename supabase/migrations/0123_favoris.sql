-- ═══════════════════════════════════════════════════════════════════════════
-- LES PAGES FAVORITES D'UN CLIENT
--
-- Les lignes favorites n'ont pas de table : une ligne mise en favori est une
-- ligne suivie (table « watchlist »), l'étoile de la fiche est la même. Cette
-- table ne tient que les PAGES — un éclairage du guide, l'indice, un fonds —
-- que le client veut retrouver d'un geste, d'un appareil à l'autre.
--
-- Le titre est copié à la pose : la page peut changer de nom, le favori garde
-- ce que le client a vu. Le chemin est interne (jamais un domaine).
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists favoris (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  href        text not null check (href like '/%' and href not like '//%'),
  title       text not null,
  created_at  timestamptz not null default now(),
  unique (user_id, href)
);
create index if not exists favoris_par_client on favoris (user_id, created_at desc);

alter table favoris enable row level security;
create policy "favoris : les siens" on favoris for select using (user_id = auth.uid() or is_desk());
create policy "favoris : poser les siens" on favoris for insert with check (user_id = auth.uid());
create policy "favoris : retirer les siens" on favoris for delete using (user_id = auth.uid());
