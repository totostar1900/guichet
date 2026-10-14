-- OÙ CHAQUE PIÈCE VIT DANS LA BIBLIOTHÈQUE PARTAGÉE.
--
-- Règle arrêtée le 14 octobre 2026 : les documents physiques sont conservés
-- dans la bibliothèque SharePoint, et le desk n'en garde que le lien. Le dépôt
-- Supabase était devenu une seconde copie que personne ne regardait, et il
-- coûtait son plafond : 1 589 Mo pour un plan à 1 Go, dont 1 099 pour les
-- seuls bulletins.
--
-- UNE TABLE PLUTÔT QU'UNE COLONNE PAR TABLE, et c'est une décision. Quatre
-- tables désignent une pièce (bulletins, adjudications, avis d'émission,
-- documents d'émetteurs) et il en viendra d'autres. Une colonne ajoutée
-- partout serait quatre endroits à tenir d'accord ; ici la clef de dépôt reste
-- la clef, et la bibliothèque est une vue de plus sur elle.
--
-- ON GARDE LE CHEMIN RELATIF, JAMAIS L'ADRESSE ENTIÈRE. Une adresse entière
-- écrite dans mille huit cents lignes fige le nom du locataire, du site et de
-- la bibliothèque : le jour où l'un des trois change, tout casse d'un coup et
-- sans bruit. Le chemin, lui, est ce que la maison voit dans son explorateur.
create table if not exists public.library_items (
  -- La clef de l'objet dans le dépôt, « boc/BOC-20250930.pdf ». Elle reste la
  -- clef même quand les octets ont quitté le dépôt : c'est elle que les
  -- quatre tables portent déjà.
  file_key text primary key,
  -- Le chemin dans la bibliothèque, depuis sa racine, sans barre initiale.
  library_path text not null,
  -- Ce que la pièce pèse et son empreinte : sans eux, on ne peut pas dire
  -- qu'un fichier de la bibliothèque est bien celui qui a été lu.
  bytes bigint,
  sha256 text,
  -- Les octets sont-ils encore au dépôt ? Faux après le ménage, et c'est
  -- alors le lien qui fait foi.
  au_depot boolean not null default true,
  range_le timestamptz not null default now()
);

create index if not exists library_items_path_idx on public.library_items (library_path);
create index if not exists library_items_depot_idx on public.library_items (au_depot) where au_depot;

alter table public.library_items enable row level security;

comment on table public.library_items is
  'La place de chaque piece dans la bibliotheque partagee. Le desk y renvoie, il ne recopie plus.';
comment on column public.library_items.au_depot is
  'Faux quand les octets ont quitte Supabase : le lien fait alors foi, et une relecture passe par le dossier synchronise.';
