"use client";

import { useT } from "@/i18n/client";
import { DefinitionsDeBrief, EnBref, TitreDeBrief } from "@/components/EnBref";

/**
 * CE QUE LA PAGE DISAIT EN HAUT, ET QU'ELLE DIT MAINTENANT SUR DEMANDE.
 *
 * Elle ouvrait sur deux phrases de chapô, relues à chaque visite par un
 * lecteur qui vient voir des séances. Ce qui est permanent passe derrière un
 * bouton, à côté du titre, et la liste commence tout de suite.
 *
 * ELLE A GRANDI DES ÉTAPES, le 26 octobre 2026, sur demande du dirigeant :
 * « la page des adjudications grandira des étapes décrites dans la page
 * intermédiaire ». Ces étapes ne sont pas recopiées ici — elles viennent du
 * catalogue des services, que la fiche de Trade rend déjà. Une page des
 * adjudications qui expliquerait une adjudication autrement que la fiche du
 * service serait la quatrième copie d'une même phrase dans cette
 * application.
 *
 * ET LA PAGE SERT TROIS SERVICES, pas un : les adjudications, le sondage et
 * les rachats du Trésor y vivent ensemble — `lieuDe` range les trois dans
 * « adjudications ». Le brief les nomme donc tous les trois. C'est le
 * « regrouper le contenu textuel avec le brief » demandé le même jour.
 *
 * LE DÉROULÉ D'UNE SÉANCE RESTE ICI, en revanche, et c'est la bonne
 * répartition : il parle du MARCHÉ — ce que publie un Trésor, quand la BEAC
 * dépouille, à quelle date le dépositaire inscrit — et non du geste du
 * client. Le catalogue, lui, ne porte que le geste. De même pour ce que le
 * prix affiché veut dire : c'est une règle de la maison sur une donnée de la
 * page, pas une étape.
 *
 * LE LIEN VERS LES ANNONCES DE LA BEAC EST PARTI le 26 octobre 2026, sur
 * demande du dirigeant. Il vivait au pied de cette feuille depuis que les
 * deux blocs qui citaient le communiqué de chaque séance ont été retirés.
 * La source ne disparaît pas pour autant : chaque séance porte son
 * communiqué sur sa propre fiche, qui est l'endroit où l'on en a besoin —
 * au moment de déposer, et non au moment de lire la liste.
 */
export function AdjudicationsEnBref() {
  const t = useT();
  return (
    <EnBref cles={["primaire", "sondage", "rachat"]} titre="Les adjudications en bref">
      <p>
        {t("Les six Trésors de la CEMAC empruntent par adjudication : ils annoncent une séance, les investisseurs y proposent un prix ou un taux, et le Trésor sert les meilleures offres jusqu'au montant qu'il recherche. Les annonces viennent de la BEAC, et c'est elle qui fait foi.")}
      </p>
      <section>
        <TitreDeBrief>{t("Comment une séance se déroule")}</TitreDeBrief>
        <DefinitionsDeBrief>
          {ETAPES.map(([quand, quoi]) => (
            <div key={quand}>
              <dt>{t(quand)}</dt>
              <dd>{t(quoi)}</dd>
            </div>
          ))}
        </DefinitionsDeBrief>
      </section>
      <section>
        <TitreDeBrief>{t("Le prix que vous voyez est une proposition")}</TitreDeBrief>
        <p>
          {t("Le prix, ou le taux, que porte une ligne est celui que Purpose Capital compte présenter à la séance : le desk l'établit au vu des séances précédentes du même Trésor. Ce n'est pas une condition.")}
        </p>
        <p>
          {t("Vous pouvez proposer le vôtre. Dites-le au desk avant la clôture et c'est celui-là qui part à la séance ; un prix plus bas rapporte davantage s'il est servi, et risque de ne pas l'être.")}
        </p>
      </section>
    </EnBref>
  );
}

/** Le déroulé d'une séance, dans l'ordre : quatre moments, une phrase chacun. */
const ETAPES: [string, string][] = [
  ["L'annonce", "Le Trésor publie son communiqué, en général une semaine avant la séance : montant recherché, durée, date de règlement."],
  ["La clôture", "Le desk doit avoir votre ordre avant elle. Elle précède la séance, parfois de la veille seulement."],
  ["La séance", "Les offres sont dépouillées le jour dit. Le Trésor retient les meilleures jusqu'au montant qu'il veut lever, et peut servir moins, ou rien."],
  ["Le règlement", "Les titres servis sont inscrits à votre nom chez le dépositaire central, et le montant est prélevé à la date de valeur annoncée."],
];
