-- ═══════════════════════════════════════════════════════════════════════════
-- LES PIÈCES CONSERVÉES : UNE COPIE DE CHAQUE SOURCE PUBLIQUE QUE LES FICHES CITENT
--
-- Un lien se périme. La copie garde ce que le Desk a lu, tel qu'il l'a lu : son
-- empreinte SHA-256, le jour de la prise, qui l'a prise. Le fichier vit dans le
-- dépôt privé « sources » (clef `cle`) ; cette table dit à quoi il sert.
-- Lue par le client à travers une route qui sert le fichier ; écrite par le
-- rôle de service seulement.
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.pieces_archivees (
  id          uuid primary key default gen_random_uuid(),
  entite      text not null,
  objet       text not null check (objet in ('budget', 'notation', 'autre')),
  titre       text not null,
  editeur     text not null,
  url_origine text,
  cle         text not null unique,
  sha256      text not null,
  taille      bigint not null,
  type_mime   text not null,
  archive_le  timestamptz not null default now(),
  archive_par text not null
);
create index if not exists pieces_archivees_par_entite on public.pieces_archivees (entite, archive_le desc);
alter table public.pieces_archivees enable row level security;
