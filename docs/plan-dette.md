# Plan dette CEMAC : où nous en sommes

Document de travail interne. Il dit **l'état**, pas le raisonnement : le plan complet, avec ses sept constats fondateurs, sa règle d'architecture et ses cinq gardes, vit dans le document Claude Docs « Plan d'attaque, données de dette CEMAC », établi le 13 octobre 2026.

Ce fichier existe parce que l'état vivait dans la conversation. À chaque compaction il fallait le reconstituer en fouillant le transcript, et le 13 octobre deux affirmations fausses en sont sorties le même jour : un commit étiqueté « lot 4 » qui n'en faisait aucun des quatre points, et une horloge annoncée arrêtée qui était simplement quotidienne.

**Le tableau ci-dessous ne s'écrit pas à la main.** Une page de doctrine vieillit et ment sans bruit, et celle-ci serait la première à le faire puisqu'elle change à chaque lot. Elle se regénère :

```bash
cd /c/dev/guichet && npx tsx --conditions=react-server scripts/plan-etat.mjs --ecrire
```

## L'état mesuré

<!-- etat:debut -->

*Mesuré le 2026-10-16 par `scripts/plan-etat.mjs`, lecteur v18. Ne pas modifier à la main.*

| | lot | point | mesure | attendu |
|---|---|---|---|---|
| oui | 0 | Cotations d'action sans capitalisation | 248 sur 5002 | au plus 300 |
| oui | 1 | Observations du calendrier BEAC | 2311 lignes | la table est alimentée |
| oui | 1 | Fraîcheur du balayage BEAC | vu il y a 0 jour(s), le 2026-10-16 | au plus 2 jours (cadence quotidienne, 9 h UTC) |
| oui | 2 | Encours de la dette écrits | 17775 lignes | plus de 16 000 lignes |
| **non** | 2 | Encours relus par le lecteur courant | 6826 ligne(s) à relire pour l'encours | aucune ligne qu'une relecture de l'encours ferait gagner |
| **non** | 2 | Complétude de la série d'encours | 784 sur 18559 (4.2 %) · 518 séance(s) trouée(s) | aucune ligne attendue et absente |
| **non** | 3 | Séances de résultats déposées | 183 sur 183 annoncée(s) · 8 pièce(s) sans pays ni date | aucune séance annoncée par le journal qui ne soit déposée |
| oui | 4 | Cliquet d'échelle sur les adjudications | écrit | le test existe |
| oui | 4 | Ligne tchadienne du 24 janvier 2024 | traitée | corrigée ou écartée avec son motif |
| oui | 4 | Point de Santé sur l'échéance manquante | posé | le point existe et dit où agir |
| oui | 3 | Échéance d'une adjudication, récupérable | 44 déduite(s) de la durée annoncée sur 260, aucune perdue | aucune ligne dont l'échéance ne puisse être ni lue ni déduite |
| oui | 4 | Libellé du bloc Programme du desk | renommé | ne dit plus « Exécution » pour servi sur annoncé |
| **non** | rapport | Relecture qui rendrait quelque chose | 264 cotations, 264 vl | aucune séance dont les cotations ou les VL auraient à gagner |

**9 contrôles tenus sur 13.**

<!-- etat:fin -->

## Les neuf lots, et ce que chacun doit rendre

| # | lot | ce qu'il rend | critère d'acceptation |
|---|---|---|---|
| 0 | Clore la capitalisation | flottant, capitalisation, dividende et bénéfice par action pour les cotations qui n'en avaient aucun | le cours fois le flottant égale la capitalisation flottante, au franc près |
| 1 | Persister le flux BEAC | taux d'annulation, amplitude de révision, délai d'annonce, prévisibilité de l'émetteur | la table est en ajout seul, et un point de fraîcheur dit si le flux a été lu |
| 2 | Table d'encours du BOC | encours par pays et par maturité, maturité moyenne, profil d'amortissement, échéancier de service | l'encours reconstruit retrouve l'encours publié |
| 4 | Cliquets de qualité | quatre gardes, à poser **avant** le lot 3 | les quatre points ci-dessous, aucun partiel |
| 5 | Indicateurs sans collecte | écart marginal moins moyen pondéré, étendue des taux, prime de nouvelle émission | jointures sur l'existant, aucune collecte |
| 3 | Les adjudications que le journal annonce | débloque tous les ratios de flux, aujourd'hui faussement précis | toute séance portée par un communiqué de résultats est déposée, échelle sous 15 fois la médiane du pays |
| 6 | Rapprochement BEAC | notre somme contre « encours des titres publics » de la BEAC, donc notre taux de collecte | chaque chiffre porte sa définition et son millésime |
| 7 | Livrables visibles | fiche pays, mur des échéances régional, trois alertes desk, table de rapprochement | maquette avant code |
| 8 | L'ancre visuelle | les 69 remarques des familles H, I, E, F et J | proposeur jamais écrivain : elle ne touche que les rangées refusées, passe le contrôle arithmétique, et c'est une personne qui signe |

L'ordre est 0, 1, 2, 4, 5, 3, 6, 7, 8. Le lot 4 précède le lot 3 parce que le cliquet d'échelle doit exister avant qu'on ramasse de nouvelles pièces.

### Le lot 3 ne vaut plus 750 pièces, et il faut le dire

Il a été écrit en croyant que la BEAC publiait environ mille communiqués de résultats. **Mille est le journal entier**, annonces, résultats, calendriers et tableaux de bord confondus. Mesuré le 16 octobre 2026 en faisant relire tous les titres par le lecteur courant : 579 pièces sont des communiqués de résultats, elles retombent sur **183 séances distinctes**, et **182 sont déposées**.

**Ce que cela ne dit pas**, et la distinction est le cœur du sujet : 183 est ce que *le journal annonce*, pas ce que les six Trésors ont *tenu*. Six Trésors à cadence hebdomadaire donneraient beaucoup plus de séances sur 2019-2026. Soit la BEAC ne publie qu'une partie des communiqués, soit des pièces nous échappent encore. **Tant que cette question n'est pas tranchée, aucun taux de couverture calculé sur 183 ne vaut d'être publié.** C'est la leçon des portes de la source : un robot qui ramasse tout ce qu'il voit annonce toujours un succès.

### Le détail du lot 4

1. **Cliquet d'échelle** : aucune adjudication au-delà de 15 fois la médiane de son pays. La ligne tchadienne est à 2 000 fois, tout le reste tient sous 15, aucun cas limite.
2. **La ligne du 24 janvier 2024** corrigée ou écartée avec son motif, selon ce que dit le communiqué d'origine.
3. **Complétude de la date d'échéance** : un point de Santé, pas une tolérance. Sans elle, aucun calcul de tombées.
4. **Le libellé du bloc Programme** du desk, qui dit « Exécution » pour un rapport servi sur annoncé. Une séance annulée n'entre ni au numérateur ni au dénominateur.

## Hors plan, et déjà construit : le rapport au fournisseur

Écrit le 13 octobre 2026 en dehors du plan, parce qu'une rangée l'a imposé : cinq fonds d'Africa Bright au 10 juillet 2026, une date imprimée en nombre et un montant imprimé en date, et une performance de 362,06 % publiée par la BVMAC sur la cellule corrompue. Irréparable chez nous, donc à dire à celui qui publie.

Les pièces : [rapport-fournisseur.ts](../src/lib/market/rapport-fournisseur.ts), le gabarit PDF, l'export classeur, la route `/desk/bulletins/fournisseur`.

**Condition avant tout envoi** : les 813 bulletins doivent être relus par le lecteur courant. Les relevés actuels datent d'une version antérieure, et la v14 a corrigé trois défauts qui étaient les nôtres. Envoyer en l'état, c'est risquer de reprocher au fournisseur nos propres fautes de lecture. Le contrôle est dans le tableau.

**Et l'envoi n'est jamais un geste du robot.** Écrire à la BVMAC est un acte extérieur, qui porte la signature de la direction.

## Ce qui attend une décision humaine

| ce qui attend | ce que ça bloque |
|---|---|
| accord sur 10 à 20 dollars d'appels modèle | lot 3 |
| maquette, deux ou trois passages | lot 7 |
| recourir à un modèle pour **proposer** des valeurs, et son coût | lot 8 |
| signature de la direction | rapport fournisseur |
| Supabase au gratuit, donc aucune sauvegarde restaurable, alors que la donnée se multiplie | permanent |

Les lots 4, 5 et 6 ne demandent rien : c'est du travail, pas de l'arbitrage.

## Ce que nous ne ferons pas

Pas de jugement de solvabilité : « le mur du Tchad est de X milliards au deuxième trimestre » est une donnée, « le Tchad pourrait avoir du mal à rembourser » n'en est pas une. Pas de valeur devinée à partir des voisines. Pas de chiffre sans source ni date. Pas d'approximation silencieuse : ce qui demande le PIB ou les recettes se marque « source externe requise » plutôt que de s'estimer en douce.
