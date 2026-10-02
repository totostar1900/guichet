-- Guichet · une réponse appartient à l'échange où elle a été écrite
--
-- ─── Le trou laissé par 0057 ───────────────────────────────────────────────
--
-- La migration précédente donne une clef d'échange aux messages ENTRANTS. Les
-- sortants n'en ont pas : ce sont les réponses du desk, rangées dans
-- `notifications`. Sans clef, un fil montrerait ce que le client a écrit et pas
-- ce qu'on lui a répondu, ce qui est pire que l'ancien regroupement.
--
-- ─── Pourquoi la clef est écrite, et pas devinée ───────────────────────────
--
-- On pourrait la retrouver à la lecture par l'objet de la réponse. Ça marche
-- tant que l'opérateur garde l'objet, et ça casse le jour où il l'ajuste, ce
-- qui est précisément ce qu'on lui demande de faire. Or il écrit sa réponse
-- DANS un échange : l'appartenance est connue au moment de l'envoi, il suffit
-- de ne pas la perdre.
--
-- ─── Ce qui reste deviné, et pour les anciens seulement ────────────────────
--
-- Les réponses d'avant cette migration n'ont pas de clef. À la lecture, elles
-- rejoignent l'échange du correspondant qui était le plus récemment actif quand
-- elles sont parties. C'est une estimation, elle ne concerne que le passé, et
-- elle vaut mieux que de laisser les réponses hors de tout échange.

alter table notifications add column if not exists conv_key text;

create index if not exists notifications_conv on notifications (conv_key, created_at desc) where conv_key is not null;

comment on column notifications.conv_key is
  'L''échange dans lequel cette réponse a été écrite. Écrite à l''envoi, jamais devinée : l''opérateur ajuste souvent l''objet, et le retrouver par l''objet casserait ce jour-là.';
