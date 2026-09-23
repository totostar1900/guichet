-- Pourquoi un ordre a été clos sans suite.
--
-- « Annuler » était un bouton sans question et sans motif : un clic, l'ordre
-- terminé, le client prévenu par « Votre intention a été annulée. Contactez-nous
-- si ce n'est pas attendu. » Rien ne disait pourquoi, ni au client, ni au
-- contrôleur six mois plus tard. Le champ `reason` du journal d'audit portait la
-- référence et le nom du client, c'est-à-dire une identité, pas une raison.
--
-- `closed_reason` garde le motif choisi dans une liste fermée (demande du
-- client, échéance dépassée, documents non reçus, ligne clôturée, position
-- insuffisante, hors capacité, doublon, autre), suivi le cas échéant de la
-- précision écrite par l'opérateur. C'est ce motif que le client lit dans son
-- message, et que le journal des ordres garde.
--
-- Les ordres annulés avant cette colonne n'en ont pas : leur motif n'a jamais
-- été demandé, et rien ne serait plus faux que de leur en inventer un.

alter table public.intents add column if not exists closed_reason text;

comment on column public.intents.closed_reason is 'Motif de clôture sans suite : la clé de la liste, puis la précision libre. Lu par le client dans son message.';
