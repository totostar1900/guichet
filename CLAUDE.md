# Guichet — notes pour Claude Code

- Lire README.md pour l'architecture. Langue de l'UI : français ; code et commentaires : anglais court, français pour les libellés métier.
- `src/lib/finance.ts` est la référence pour tout calcul ; ne pas recalculer ailleurs. Tests : `npm test`.
- Les offres sont en lecture seule côté client ; seul le desk fixe prix / ticket minimum (voir `publishOffer`). Aucune commission n’est affichée au client.
- Types de produits, échéanciers, glossaire, sociétés, émetteurs : valeurs par défaut en code, surchargées par la table `reference` (desk › Référentiel). Le domaine lit `src/lib/registry.ts` (synchrone) ; toute entrée serveur hors rendu de page appelle `await loadRegistry()` d’abord.
- Le modèle de données vit dans `src/lib/domain/types.ts` ET `supabase/migrations/*.sql` — modifier les deux ensemble, régénérer `supabase/seed.sql` avec `npm run seed:sql`.
- Sans `.env.local`, le repository mémoire est utilisé (données de `src/data/seed.ts`).
- Avant de conclure : `npm run typecheck && npm run lint && npm test`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
