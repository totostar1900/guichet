# Guichet — notes pour Claude Code

- Lire README.md pour l'architecture. Langue de l'UI : français ; code et commentaires : anglais court, français pour les libellés métier.
- `src/lib/finance.ts` est la référence pour tout calcul ; ne pas recalculer ailleurs. Tests : `npm test`.
- Les offres sont en lecture seule côté client ; seul le desk fixe prix / commission / ticket minimum (voir `publishOffer`).
- Le modèle de données vit dans `src/lib/domain/types.ts` ET `supabase/migrations/*.sql` — modifier les deux ensemble, régénérer `supabase/seed.sql` avec `npm run seed:sql`.
- Sans `.env.local`, le repository mémoire est utilisé (données de `src/data/seed.ts`).
- Avant de conclure : `npm run typecheck && npm run lint && npm test`.
