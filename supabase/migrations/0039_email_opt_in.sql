-- Le consentement par courrier, qui manquait.
--
-- WhatsApp avait le sien depuis 0002 : « whatsapp_opt_in », respecté à l'envoi.
-- L'e-mail n'en avait aucun, et la diffusion partait à toute adresse connue,
-- consentie ou non. Un message de service (accusé, avis, relevé) découle de la
-- relation et n'a pas besoin de cette case ; une information ou une
-- opportunité, si.
alter table profiles add column if not exists email_opt_in boolean not null default false;
alter table profiles add column if not exists email_opt_in_at timestamptz;

-- Les clients qui ont déjà un dossier approuvé ont accepté de recevoir nos
-- informations par écrit en signant la convention : leur case part à vrai, avec
-- la date de la convention pour trace. Les autres partent à faux, et le diront
-- eux-mêmes depuis Mon espace.
update profiles set email_opt_in = true, email_opt_in_at = now()
where role = 'client' and tier = 2 and email is not null;
