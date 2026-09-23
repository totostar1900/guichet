# Courrier à la BVMAC : méthodologie du BVMAC All Share Index

À adresser à la Direction générale de la Bourse des Valeurs Mobilières de l'Afrique Centrale (Douala), copie au service Marché. À envoyer sur papier à en-tête de Purpose Capital S.A., signé par la direction.

Version du 23 septembre 2026. Elle remplace la demande générale de note méthodologique : nos lectures ont depuis répondu à une partie des questions, et ce courrier ne demande plus que ce que nous ne pouvons pas établir seuls.

---

Objet : indice BVMAC All Share (BVMAC-AS), confirmation de méthodologie

Madame, Monsieur,

Purpose Capital S.A., société de bourse agréée par la COSUMAF, met à la disposition de ses clients un service d'information sur les valeurs cotées à la BVMAC, alimenté à chaque séance par le Bulletin Officiel de la Cote. Nous y reprenons le niveau et la variation du BVMAC All Share Index tels que votre bulletin les publie, sans retraitement, et nous souhaitons les expliquer à nos clients dans les termes exacts de la Bourse.

Depuis le 1er septembre 2025, nous avons lu 264 séances, des bulletins n° 2333 à n° 2600. Afin de vérifier ce que nous affichons, nous avons cherché à reconstituer la variation publiée de l'indice à partir des cours du même bulletin. Cet exercice nous conduit à une lecture que nous souhaitons vous soumettre, et à quelques séances que nous ne savons pas expliquer.

**Ce que nos lectures suggèrent.** La variation publiée se reconstitue sur cinquante séances mobiles testables sur cinquante-sept lorsque les cours sont pondérés par la **capitalisation flottante** de la séance, contre dix-huit sur cinquante-sept par la capitalisation globale. Les séances où une seule valeur a varié le montrent plus nettement encore : le poids qui s'en déduit se rapproche du poids de flottant de cette valeur, avant comme après l'admission de BGFI Holding, que nos lectures situent au 7 mai 2026.

Nous insistons sur le statut de cette lecture : il s'agit d'une inférence tirée de nos propres relevés, non d'une conclusion sur votre méthode. Elle demande votre confirmation, et c'est l'objet principal de ce courrier.

Nous vous serions reconnaissants de bien vouloir nous répondre sur les six points suivants, dont chacun peut l'être en une ligne.

1. **Pondération.** L'indice est-il pondéré par la capitalisation flottante ? Si tel est le cas, quelle définition du flottant est retenue ?

2. **Révision du flottant.** Le nombre de titres du flottant que publie la page des capitalisations n'a pas varié dans nos lectures depuis treize mois. À quelle fréquence est-il révisé, et une révision est-elle annoncée avant de prendre effet ?

3. **Diviseur.** Quelle règle d'ajustement s'applique à l'admission d'une valeur, à une augmentation de capital, à une division du nominal ou à une radiation ? L'admission de BGFI Holding en mai 2026 nous servirait de cas de référence.

4. **Dividendes.** L'indice est-il un indice de prix ? Une variante en rendement global, dividendes réinvestis, est-elle publiée ou envisagée ?

5. **Séances sans transaction.** En l'absence de transaction sur une valeur, le cours de référence est-il reconduit, et l'indice est-il alors recalculé ou reporté à l'identique ?

6. **Concordance des pages d'un bulletin.** Le bloc « indice » de la première page et la table des cours du même bulletin se rapportent-ils toujours à la même séance ? Nous relevons douze séances, regroupées en mars-avril et à la mi-juillet 2026, où la variation publiée ne se reconstitue pas, dont deux où l'indice varie en sens inverse du seul cours modifié dans nos lectures.

Sur ce dernier point, nous tenons à préciser que l'explication la plus probable reste une lecture incomplète de notre part : notre lecteur de bulletin a connu des défaillances que nous avons corrigées en septembre 2026, et nous poursuivons nos propres vérifications. Nous ne publions ni ces écarts ni cette analyse ; ils ne servent qu'à fiabiliser ce que nous montrons à nos clients.

Ces éléments serviront exclusivement à décrire l'indice dans nos pages d'information, notre guide pédagogique et nos notes de marché, en citant la BVMAC comme source. Nous ne calculons ni ne diffusons d'indice propre, et nous ne mesurons la performance d'aucun client contre le vôtre.

Nous restons à votre disposition pour vous présenter nos relevés séance par séance si cela pouvait vous être utile, et vous prions d'agréer, Madame, Monsieur, l'expression de notre considération distinguée.

Purpose Capital S.A.
La Direction

---

## Ce qu'il faut faire de la réponse

1. La verser au **Dépôt › Références**.
2. Reprendre ses termes dans **desk › Documentation › « L'indice BVMAC All Share »** et dans la leçon **« L'indice de la BVMAC »**.
3. Lever la mention « à confirmer » du pouls, des pages Sociétés et de la page de l'indice.
4. Retirer la ligne `methodOpen` du pied des notes trimestrielles (`src/lib/market/index-quarter.ts`) : la note dira alors la règle au lieu de dire qu'elle est en cours de confirmation.
5. Si la pondération par le flottant est confirmée, retirer de la vue Flottant de la page de l'indice l'étiquette « lecture Guichet, non publiée » : elle cesse d'être une lecture alternative pour devenir la reconstitution fidèle.
6. Si elle ne l'est pas, reprendre le test de `indexCheck` (`src/lib/market/index.ts`) sur la règle indiquée, et relire l'étude interne « L'indice au banc d'essai » de bout en bout.

## Les chiffres cités, et où les reprendre

| Ce que dit le courrier | Où le recalculer |
|---|---|
| 264 séances, bulletins 2333 à 2600 | `market_bulletins`, `indexSeries` |
| 50 / 57 au flottant, 18 / 57 à la capitalisation | reconstitution séance par séance, avec les poids de la séance |
| Poids impliqué des séances à valeur unique | variation de l'indice ÷ variation du cours |
| Admission de BGFI Holding au 7 mai 2026 | première séance où `GA0000010074` est lue |
| Flottant inchangé sur treize mois | `quotes.shares_float`, 215 à 217 séances par valeur |
| Douze séances qui résistent, dont deux de sens contraire | mars-avril et mi-juillet 2026 |

Ces chiffres bougent à chaque bulletin lu et à chaque correction du lecteur. Les vérifier avant signature.
