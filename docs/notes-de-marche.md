# Les notes de marché : comment elles sont faites, relues, publiées et partagées

Document de maintenance, pour le desk et la technique. Il décrit les deux notes
que le Guichet produit sur l'indice BVMAC All Share : d'où viennent les chiffres,
qui écrit quoi, quand cela se déclenche, qui relit, où cela part, et quoi faire
quand quelque chose ne tourne pas.

Sa version lisible dans l'application est `Desk › Documentation › Les notes de
marché` (`/desk/docs/publications`). Les deux se tiennent à jour ensemble.

Dernière vérification : 2026-09-22 · responsable : Georges.

---

## 1. Ce qui existe

| | Note trimestrielle | Note mensuelle |
| --- | --- | --- |
| Pour qui | tout le monde : clients, presse, partenaires, visiteurs | le desk seul |
| Où elle se lit | page publique `/indice/note/<trimestre>` + PDF | `/desk/indice`, et le PDF dans Documents |
| Ce qu'elle dit | ce que le trimestre a fait, les sept sociétés derrière le chiffre, ce qui s'est échangé, ce que l'indice mesure et ne mesure pas | les chiffres du mois, la contribution de chaque société, les séances qui ne se reconstituent pas |
| Numéro | `PC-IDX-2026T2` | `PC-IDX-202608` |
| Rythme | 4 par an, le 5 du mois qui ouvre le trimestre suivant | 12 par an, le 3 de chaque mois |
| Envoi automatique | aucun | aucun |
| Type de document | `note_indice` (les deux) | `note_indice` |

Les deux notes lisent exactement les mêmes données et se recoupent : la mensuelle
sert au contrôle, la trimestrielle sort. L'activité de la cote est lente (sept
sociétés, beaucoup de séances sans transaction) : un client n'a rien à lire tous
les mois, un trimestre lui donne une histoire.

**Règle de fond :** rien ne part à un client sans qu'une personne l'ait lu. Le
robot prépare, il ne diffuse pas.

---

## 2. D'où viennent les chiffres

Une seule chaîne, du PDF de la BVMAC à la phrase de la note. Aucun chiffre n'est
saisi à la main dans la note.

```
Bulletin Officiel de la Cote (PDF, BVMAC)
   ↓  lecteur de bulletin  ·  /api/cron/boc, 18 h 30 du lundi au vendredi
market_bulletins   index_value, index_variation_pct, une ligne par séance
quotes             cours de clôture, titres du flottant et du capital global,
                   capitalisations, dernier dividende, liquidité 3 mois
   ↓  src/lib/market/index.ts        séries, poids, rotation, contrôles
   ↓  src/lib/market/index-data.ts   indexPageData() : le jeu commun à tout l'indice
   ↓  src/lib/market/index-quarter.ts   quarterNote()  → la note trimestrielle
      src/lib/market/index-note.ts      indexNote()    → la note mensuelle
   ↓  page publique + PDF (@react-pdf/renderer)
```

Les trois phrases que chaque note porte en tête (`headline`, `reading`,
`caution`) sont écrites par le code à partir de ces chiffres : niveau, variation,
séance qui a le plus pesé, part échangée, séances sans mouvement. Elles ne sont
pas un modèle de texte à trous choisi au hasard, elles changent de forme selon ce
que le trimestre a fait.

Le passage réglementaire de fin de note (`portee`) vient du **Référentiel ›
Modèles** (`note_indice`), comme pour tous les autres documents : il est relu et
versionné là-bas, et la version utilisée est enregistrée avec le document publié.

**Une note ne change plus une fois le trimestre clos.** Elle est calculée à
partir des seules séances du trimestre, jamais à partir de l'état du jour : la
note du T2 lue dans un an donne les mêmes chiffres qu'aujourd'hui.

---

## 3. Le calendrier

Déclaré dans `vercel.json`, exécuté par les crons Vercel, en UTC.

| Route | Horaire | Ce qu'elle fait |
| --- | --- | --- |
| `/api/cron/boc` | `30 18 * * 1-5` | lit le bulletin de la séance : c'est lui qui alimente tout le reste |
| `/api/cron/note-indice` | `40 6 3 * *` | prépare la note du mois clos, la range dans Documents, écrit une ligne au journal du desk |
| `/api/cron/note-trimestre` | `0 7 5 1,4,7,10 *` | prépare la note du trimestre clos, idem |

Les deux routes de note sont **idempotentes** : elles regardent d'abord si un
document porte déjà le numéro du mois ou du trimestre, et si oui elles ne font
rien. On peut donc les rejouer sans risque de doublon.

Les deux sont protégées par `Authorization: Bearer $CRON_SECRET`. Vercel ajoute
l'en-tête tout seul ; pour un appel manuel il faut le poser à la main (§ 7).

Si le trimestre n'a aucune séance lue, la route répond `ok: true, skipped` et ne
crée rien. C'est le cas normal d'un trimestre antérieur au premier bulletin lu.

---

## 4. Relire, avant de publier

Tout se passe sur **`/desk/indice`**. La page montre, dans cet ordre :

1. **La note trimestrielle, publique.** Les six derniers trimestres en pastilles,
   un ✓ sur ceux déjà publiés ; la phrase d'attaque ; un lien vers la page
   publique telle qu'un client la verra ; un lien vers le PDF ; le bouton
   **Publier**.
2. **La note mensuelle, pour le desk.** Les quatorze derniers mois, les chiffres
   du mois, la contribution de chaque société (poids × variation, en points
   d'indice), et **les séances à éclaircir**.

### Ce qu'il faut regarder avant de publier

- **Les séances à éclaircir.** Une séance y figure quand la variation publiée par
  la BVMAC ne se reconstitue pas avec les cours et les poids du même bulletin.
  Aujourd'hui cela concerne une part importante des séances : soit notre lecture
  du bulletin est incomplète, soit la méthode de l'indice diffère de celle que
  nous supposons. Tant que la note méthodologique de la BVMAC n'est pas reçue
  (`docs/courrier-bvmac-indice.md`), la note publique le dit en **une ligne**, en
  bas de page, sans conclure : le détail reste au desk.
- **Les jours sans bulletin.** Un trou de plusieurs jours veut souvent dire que
  le lecteur a échoué, pas que le marché a fermé. Vérifier au Dépôt.
- **Les sociétés à zéro.** Une société dont le cours n'a pas bougé du trimestre
  est normale ici. Une société dont le cours manque ne l'est pas.
- **Le ton.** La note dit ce que l'indice fait et ce qu'il ne dit pas. Elle ne
  recommande rien, ne compare aucun client à l'indice, et ne tire pas de la cote
  une lecture de l'économie régionale qu'elle ne peut pas porter.

### Publier

Le bouton **Publier** :

- rend le PDF et le range dans **Documents** avec son numéro et la version de
  chaque passage de modèle utilisé ;
- écrit une ligne au journal du desk (qui a publié, quand) ;
- rafraîchit la page publique.

La page publique, elle, **existe déjà avant la publication** : elle se calcule à
la demande. Publier ne l'ouvre pas, publier **fige le PDF** : c'est l'exemplaire
de référence, celui qu'on envoie et qu'on archive. Un trimestre en cours est
lisible sur la page ; il n'est pas publié tant qu'il n'est pas clos.

---

## 5. Où elles vont

| Destination | Trimestrielle | Mensuelle |
| --- | --- | --- |
| Page publique `/indice/note/<trimestre>` | oui, sans compte | non |
| Panneau « Les notes de marché » sur `/indice` | oui, six derniers trimestres | non |
| PDF public `/indice/note/<trimestre>/pdf` | oui | non |
| Documents (`/desk/documents?type=note_indice`) | oui, à la publication | oui, à la publication |
| Envoi à un client | à la main, comme tout document | à la main, rare |
| Réseaux, presse, partenaires | le lien de la page, jamais un PDF détaché | non |

**Partager :** toujours le lien de la page, pas le fichier. La page porte le
numéro, les dates de séance, la source et l'avertissement réglementaire ; elle
reste à jour si un correctif est apporté, et elle mène au reste du Guichet. Le
PDF sert à ce qui doit voyager hors ligne : un dossier, une pièce jointe
demandée, une impression.

**Ce qui n'est jamais partagé hors du desk :** la table des séances à éclaircir,
les écarts de reconstitution, et toute formulation qui conclurait sur la méthode
de la BVMAC avant sa réponse.

---

## 6. Ce que la note publique contient, section par section

| Section | Contenu | Source |
| --- | --- | --- |
| Fiche d'en-tête | niveau, variation du trimestre, douze mois, séances | `quarterNote()` |
| 01 · Ce que le trimestre a fait | les trois fins de mois en barres, les séances qui ont bougé | `monthly`, `movedSessions` |
| 02 · Les sept sociétés | activité, pays, cours, rendement, poids, flottant, variation ; répartition par secteur et par pays | `lines`, `bySector`, `byCountry` |
| 03 · Ce qui s'est échangé | montants, transactions, rotation du flottant sur douze mois | `lines`, `rotation` |
| 04 · Ce que l'indice mesure, et ne mesure pas | indice de prix, pas une mesure d'activité, pas un portefeuille, pas un baromètre de l'économie | texte + chiffres du trimestre |
| Pied de page | source, ligne sur la méthodologie si `methodOpen`, avertissement réglementaire | `portee` (Référentiel › Modèles) |

Le PDF reprend les mêmes sections, dans le même ordre, avec la mise en page
maison (`src/lib/documents/pdf/quarter-templates.tsx`).

---

## 7. Quand quelque chose ne tourne pas

**La note manque un trimestre.** Ouvrir `/desk/indice`, choisir le trimestre,
lire, publier à la main. Le cron n'est qu'une commodité ; le bouton fait la même
chose.

**Rejouer un cron à la main** (jamais nécessaire en temps normal) :

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://guichet.purposecapital.africa/api/cron/note-trimestre
```

La route est idempotente : si le document existe déjà, elle répond `already` avec
son numéro et ne crée rien.

**Les chiffres paraissent faux.** Remonter la chaîne du § 2, dans cet ordre :
le bulletin au Dépôt, puis `market_bulletins` pour la séance, puis `quotes` pour
la société en cause. Une note fausse vient presque toujours d'une lecture de
bulletin incomplète, pas du calcul.

**La note dit « Aucune séance lue sur ce trimestre ».** Il n'y a pas de bulletin
lu sur la période. Normal avant le premier bulletin capté ; anormal sinon, et
c'est alors le lecteur (`/api/cron/boc`) qu'il faut regarder.

**Republier après un correctif.** Corriger la donnée en amont, vérifier sur
`/desk/indice`, puis republier : un nouveau document est créé avec le même
numéro seulement si l'ancien a été retiré. En pratique, on laisse l'ancien et on
publie une édition corrigée, visible dans « autres éditions » comme pour les
autres modèles.

---

## 8. Les fichiers

| Fichier | Rôle |
| --- | --- |
| `src/lib/market/index.ts` | séries, poids, rotation du flottant, contrôles de cohérence |
| `src/lib/market/index-data.ts` | `indexPageData()` : le jeu de données commun |
| `src/lib/market/index-quarter.ts` | `quarters()`, `quarterNote()` : la note trimestrielle |
| `src/lib/market/index-note.ts` | `noteMonths()`, `indexNote()` : la note mensuelle |
| `src/app/indice/note/[trimestre]/page.tsx` | la page publique |
| `src/app/indice/note/[trimestre]/pdf/route.ts` | le PDF public |
| `src/lib/documents/pdf/quarter-templates.tsx` | la mise en page du PDF trimestriel |
| `src/lib/documents/pdf/index-templates.tsx` | la mise en page du PDF mensuel |
| `src/lib/documents/generate.ts` | `indexQuarters`, `indexQuarterFor`, `renderQuarterNote`, `publishQuarterNote` et leurs équivalents mensuels |
| `src/app/desk/indice/` | la page de relecture et les actions de publication |
| `src/app/api/cron/note-trimestre/route.ts` | le cron trimestriel |
| `src/app/api/cron/note-indice/route.ts` | le cron mensuel |
| `src/lib/documents/registry.ts` | le type `note_indice` : libellé, préfixe `IDX`, rôles, moment |
| `src/lib/documents/passages-catalog.ts` | le passage `portee`, relu au Référentiel |
| `supabase/migrations/0033_note_indice.sql` | l'ajout du type `note_indice` |
| `src/data/docs/publications.ts` | la version de ce document lisible dans l'application |
| `docs/courrier-bvmac-indice.md` | le courrier de demande de la note méthodologique |

---

## 9. Ce qui reste à faire

- Envoyer le courrier à la BVMAC sur la méthodologie de l'indice. Sa réponse
  retire la ligne `methodOpen` de la note et clôt les séances à éclaircir.
- Décider, quand le nombre de lecteurs le justifiera, si la parution
  trimestrielle est annoncée (inbox client, lettre) ou reste consultable sans
  annonce. Aujourd'hui : consultable, sans annonce.
