-- Le journal des ordres, derrière la référence que le client cite.
--
-- `intents.ref` reste ce que le client voit partout : l'accusé de réception,
-- le bulletin d'ordre, le motif de son virement, Mon espace. Il devient opaque
-- (PF-0914-K7Q4) : l'opération, le jour, quatre caractères tirés au sort. Il ne
-- dit plus le rang de l'ordre, qui disait à un client combien d'ordres la
-- maison avait pris avant le sien, et à deux ordres d'écart, le rythme.
--
-- `register_no` (PC-ORD-000018) est ce rang, gardé au desk : une suite
-- ininterrompue, celle que la séquence `intent_seq` donnait déjà, et celle
-- qu'un contrôleur attend d'un journal des ordres.
--
-- Les ordres passés gardent leur référence : elle est entre les mains de
-- clients, et sert d'entrée de journal tant qu'ils n'en ont pas d'autre.

alter table public.intents add column if not exists register_no text;

create unique index if not exists intents_register_no_key on public.intents (register_no) where register_no is not null;

comment on column public.intents.ref is 'Référence citée par le client, sans rang. Sert aussi de motif de virement.';
comment on column public.intents.register_no is 'Entrée du journal des ordres, suite ininterrompue. Desk et audit seulement.';
