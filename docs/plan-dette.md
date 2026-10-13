# Plan dette CEMAC : où nous en sommes

Document de travail interne. Il dit **l'état**, pas le raisonnement : le plan complet, avec ses sept constats fondateurs, sa règle d'architecture et ses cinq gardes, vit dans le document Claude Docs « Plan d'attaque, données de dette CEMAC », établi le 13 octobre 2026.

Ce fichier existe parce que l'état vivait dans la conversation. À chaque compaction il fallait le reconstituer en fouillant le transcript, et le 13 octobre deux affirmations fausses en sont sorties le même jour : un commit étiqueté « lot 4 » qui n'en faisait aucun des quatre points, et une horloge annoncée arrêtée qui était simplement quotidienne.

**Le tableau ci-dessous ne s'écrit pas à la main.** Une page de doctrine vieillit et ment sans bruit, et celle-ci serait la première à le faire puisqu'elle change à chaque lot. Elle se regénère :

```bash
cd /c/dev/guichet && npx tsx --conditions=react-server scripts/plan-etat.mjs --ecrire
```

## L'état mesuré

<!-- etat:debut -->

*Mesuré le 2026-10-13 par `scripts/plan-etat.mjs`, lecteur v17. Ne pas modifier à la main.*

| | lot | point | mesure | attendu |
|---|---|---|---|---|
| oui | 0 | Cotations d'action sans capitalisation | 248 sur 4988 | au plus 300 |
| oui | 1 | Observations du calendrier BEAC | 987 lignes | la table est alimentée |
| oui | 1 | Fraîcheur du balayage BEAC | vu il y a 0 jour(s), le 2026-10-13 | au plus 2 jours (cadence quotidienne, 9 h UTC) |
| oui | 2 | Encours de la dette écrits | 16946 lignes | plus de 16 000 lignes |
| oui | 2 | Encours relus par le lecteur courant | toutes à jour (plus ancienne : v14) | aucune ligne qu'une relecture de l'encours ferait gagner |
| **non** | 2 | Complétude de la série d'encours | 1547 sur 18493 (8.4 %) · 547 séance(s) trouée(s) | aucune ligne attendue et absente |
| **non** | 3 | Adjudications ramassées | 249 | au moins 950 (la liste BEAC en annonce environ 1 000) |
| oui | 4 | Cliquet d'échelle sur les adjudications | écrit | le test existe |
| **non** | 4 | Ligne tchadienne du 24 janvier 2024 | 1 ligne(s) à 30 000 Mds, non écartée(s) | corrigée ou écartée avec son motif |
| oui | 4 | Point de Santé sur l'échéance manquante | posé | le point existe et dit où agir |
| **non** | 3 | Date d'échéance des adjudications | 54 manquante(s) sur 249 | aucune manquante |
| oui | 4 | Libellé du bloc Programme du desk | renommé | ne dit plus « Exécution » pour servi sur annoncé |
| **non** | rapport | Relecture qui rendrait quelque chose | 806 cotations, 803 vl | aucune séance dont les cotations ou les VL auraient à gagner |

**8 contrôles tenus sur 13.**

<!-- etat:fin -->

## Les neuf lots, et ce que chacun doit rendre

| # | lot | ce qu'il rend | critère d'acceptation |
|---|---|---|---|
| 0 | Clore la capitalisation | flottant, capitalisation, dividende et bénéfice par action pour les cotations qui n'en avaient aucun | le cours fois le flottant égale la capitalisation flottante, au franc près |
| 1 | Persister le flux BEAC | taux d'annulation, amplitude de révision, délai d'annonce, prévisibilité de l'émetteur | la table est en ajout seul, et un point de fraîcheur dit si le flux a été lu |
| 2 | Table d'encours du BOC | encours par pays et par maturité, maturité moyenne, profil d'amortissement, échéancier de service | l'encours reconstruit retrouve l'encours publié |
| 4 | Cliquets de qualité | quatre gardes, à poser **avant** le lot 3 | les quatre points ci-dessous, aucun partiel |
| 5 | Indicateurs sans collecte | écart marginal moins moyen pondéré, étendue des taux, prime de nouvelle émission | jointures sur l'existant, aucune collecte |
| 3 | Les 750 adjudications | débloque tous les ratios de flux, aujourd'hui faussement précis | `maturity_on` présent, échelle sous 15 fois la médiane du pays |
| 6 | Rapprochement BEAC | notre somme contre « encours des titres publics » de la BEAC, donc notre taux de collecte | chaque chiffre porte sa définition et son millésime |
| 7 | Livrables visibles | fiche pays, mur des échéances régional, trois alertes desk, table de rapprochement | maquette avant code |
| 8 | L'ancre visuelle | les 69 remarques des familles H, I, E, F et J | proposeur jamais écrivain : elle ne touche que les rangées refusées, passe le contrôle arithmétique, et c'est une personne qui signe |

L'ordre est 0, 1, 2, 4, 5, 3, 6, 7, 8. Le lot 4 précède le lot 3 parce que le cliquet d'échelle doit exister avant qu'on ramasse 750 pièces de plus.

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
