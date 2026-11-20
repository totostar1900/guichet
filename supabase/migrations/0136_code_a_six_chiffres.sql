-- Le code du compte passe à six chiffres (19 novembre 2026, le client : « six chiffres »).
-- Un code à quatre chiffres posé avant ce changement ne peut plus être saisi sur le clavier à six ronds :
-- on l'oublie, et le verrou demande d'en choisir un nouveau à la prochaine ouverture.
-- Les clés d'accès (Face ID, empreinte) ne dépendent pas du code et restent.
delete from trusted_devices where kind in ('code', 'pin');
