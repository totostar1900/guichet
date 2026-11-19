-- Le code du compte : quatre chiffres, le même sur tout appareil, qui lève le verrou de l'application
-- (19 novembre 2026). Il vit dans la table des appareils de confiance, sous une troisième nature,
-- « code » : une ligne par compte, le condensé HMAC du code, le compte des essais ratés.
-- Il n'est jamais listé parmi « Mes appareils » et n'ouvre aucune session à lui seul.
alter table trusted_devices drop constraint if exists trusted_devices_kind_check;
alter table trusted_devices add constraint trusted_devices_kind_check check (kind in ('passkey','pin','code'));
