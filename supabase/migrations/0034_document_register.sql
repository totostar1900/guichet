-- Deux références par document.
--
-- `number` reste ce que le document imprime et ce que le client cite. Pour un
-- document qu'un client détient il devient opaque (PC-BUL-260922-K7Q4) : le
-- jour d'émission et quatre caractères tirés au sort, qui ne disent rien du
-- nombre de documents émis. Les documents transmis aux contreparties gardent
-- leur suite, et les notes sur l'indice gardent la référence de leur période.
--
-- `register_no` est le registre de la maison (PC-BUL-2026-0018) : une suite
-- ininterrompue par modèle et par année, lue au desk et par un contrôleur,
-- jamais portée sur l'exemplaire d'un client.
--
-- Les documents déjà émis gardent leur référence : elle est entre les mains de
-- clients. Leur entrée de registre est cette référence, relue telle quelle.

alter table public.documents add column if not exists register_no text;

create unique index if not exists documents_register_no_key on public.documents (register_no) where register_no is not null;

comment on column public.documents.number is 'Référence imprimée, citée par le client. Opaque pour un document client.';
comment on column public.documents.register_no is 'Entrée du registre interne, suite par modèle et par année. Desk et audit seulement.';
