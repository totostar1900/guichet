---
name: guichet-referentiel-drafts
description: Référentiel drafts → Publier / Abandonner (2026-09-21), Santé cards as links with the « Depuis Santé » strip, health-how table; migration 0031
metadata:
  type: project
---

Since 2026-09-21 every référentiel save is a draft on the `reference` row (`draft` jsonb = `{op:"set",data}` or `{op:"reset"}`, `draft_by`, `draft_at`; `data` nullable for never-published entries). Loaders in `src/lib/reference.ts` read only `data != null`. Repo methods: `saveReferenceDraft`, `publishReference(kind, keys?)`, `discardReference(kind, keys?)`; `upsertReference` stays for the approval policy. Page `src/app/desk/referentiel/page.tsx` overlays drafts (`seen()`), shows the draft bar, flashes `?ok=` / `?publie=`; `RowActions.tsx` (reset with confirm, publish, discard), `Origin.tsx`, `TermsTable.tsx` (client filter/sort + "sans échéancier" strip with `?nouveau=ISIN`). Server actions redirect to the list after a save (`done()`); « Importer les valeurs par défaut » was removed (it only seeded missing keys, never reset).

Santé: `src/lib/health-how.ts` (client-safe) maps each check key to href + one-line how + docs anchor; orange/red cards are links carrying `?depuis=sante&point=<key>` (query before the #anchor); target pages render `<FromSante point=…/>` (`src/components/desk/FromSante.tsx`). Filters added: `/desk/marche?filtre=sans-cours`, `/desk?filtre=sans-prix#offres`, `/desk/reporting?vue=fermes|executes#journal`.

**Why:** the user wanted "publish / cancel all" on the référentiel and actionable Santé cards; a permanent "how-to" badge on every page was rejected in favour of the contextual strip.

**How to apply:** a new Santé check needs an entry in HEALTH_HOW and, if its target page lacks it, the FromSante strip + a filter. Migration 0031 must be applied before the desk saves anything (see [[guichet-supabase-migrations]]). Related: [[guichet-templates]].

## Les quatre étages de la confirmation (23 septembre 2026)

Le chemin de l'argent était déjà tenu : publier une ligne passe la liste de
contrôle du type, les champs requis, le verrou de version, et hors fenêtre
déléguée l'accord d'un responsable. Le chemin des mots ne l'était pas :
`publishQuarterAction` écrivait un document numéroté et mettait une page en ligne
sur un seul clic.

Le piège d'un « êtes-vous sûr » posé partout : il entre dans le rythme du clic en
une semaine. Le desk portait deux `window.confirm` dont personne ne savait dire
le texte. Une confirmation ne vaut que si elle est assez rare pour être lue.

| Étage | Ce que c'est | Où |
|---|---|---|
| 0 | rien : réversible, pas visible du client | brouillons du référentiel, « Enregistrer » |
| 1 | retour arrière de 60 s, pas de boîte | actualités (`UndoStrip`) |
| 2 | relecture des conséquences, avec les chiffres | notes mensuelle et trimestrielle, publication au référentiel (`ConfirmPublish`) |
| 3 | recopier un mot, ou quatre yeux | diffusion d'opportunité, lignes hors fenêtre déléguée |

Ce qui fait le travail à l'étage 1, c'est que le retour arrière ne taxe que celui
qui s'est trompé, quand une boîte taxe les cent publications correctes pour
attraper la centième. Il s'arrête à l'étage 2 parce qu'il cesse d'être vrai : un
WhatsApp parti ne revient pas.

`ConfirmPublish` ne demande jamais si l'on est sûr : elle redit ce qui va se
passer, avec les chiffres de la chose, et propose « voir exactement ce que le
client verra ». **La règle qui l'empêche de se répandre** : une boîte doit nommer
la chose par son titre et son public par un nombre. Si le code ne sait pas
produire ces deux faits, elle est du théâtre et ne s'ajoute pas.

La diffusion est passée en deux temps. Elle rend maintenant un `BroadcastPlan`
(destinataires, appareils, déjà alertés, heures calmes) sans rien envoyer, et
l'écran fait **recopier le nombre de destinataires**. La case à cocher d'avant
pouvait être cochée avant d'avoir vu le moindre chiffre.

Le référentiel reste à l'étage 2 et non 1 : `publishReference` consomme le
brouillon, et un retour arrière honnête demanderait de restaurer depuis le
journal d'audit. Tant que ce n'est pas écrit, la relecture avant est le seul
garde-fou vrai.
