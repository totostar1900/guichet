"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useT } from "@/i18n/client";
import { DefinitionsDeBrief, TitreDeBrief } from "./parties";
import { GESTES } from "@/lib/domain/arbitrage";
import { FUND_CATEGORY_LABEL } from "@/lib/domain/market";
import styles from "./prose.module.css";

/**
 * CE QUE CHAQUE BRIEF A EN PROPRE, RASSEMBLÉ ET INDEXÉ.
 *
 * ─── Pourquoi cette prose a déménagé, le 31 octobre 2026 ────────────────────
 *
 * Elle vivait DANS les pages : « app/calendrier/EnBref.tsx »,
 * « app/fonds/FondsEnBref.tsx », et directement dans le corps de
 * « app/sondage/page.tsx ». Tant que le brief ne s'ouvrait que depuis sa
 * page, c'était la bonne place.
 *
 * Depuis que le « i » d'une tuile de Trade ouvre LA MÊME FEUILLE — demande du
 * dirigeant : « c'est pas deux pages distinctes mais bien la même page » —
 * une page ne peut plus garder son brief pour elle. Trade n'a aucun moyen
 * d'atteindre du JSX écrit dans le corps d'une page qu'il n'ouvre pas.
 *
 * Elle est donc indexée par l'identifiant du brief, celui que
 * « domain/briefs » déclare, et le composant la retrouve d'où qu'on l'ouvre.
 *
 * ─── Ce que ce fichier ne porte pas ─────────────────────────────────────────
 *
 * Ni raison d'être, ni étapes : elles vivent dans le catalogue des services,
 * et le brief les lit là-bas. Ce qui est ici parle du MARCHÉ — ce qu'est un
 * OPCVM, comment une séance se déroule, ce que le prix affiché veut dire — et
 * non du geste du client. Un cliquet refuse qu'une de ces deux moitiés passe
 * dans l'autre.
 */
export interface ProseDeBrief {
  /** Avant les services : le contexte, qui précède ce qu'on va faire. */
  Avant?: () => ReactNode;
  /** Après : ce qui suppose les étapes lues. */
  Apres?: () => ReactNode;
}

/** Le déroulé d'une séance, dans l'ordre : quatre moments, une phrase chacun. */
const SEANCE: [string, string][] = [
  ["L'annonce", "Le Trésor publie son communiqué, en général une semaine avant la séance : montant recherché, durée, date de règlement."],
  ["La clôture", "Le desk doit avoir votre ordre avant elle. Elle précède la séance, parfois de la veille seulement."],
  ["La séance", "Les offres sont dépouillées le jour dit. Le Trésor retient les meilleures jusqu'au montant qu'il veut lever, et peut servir moins, ou rien."],
  ["Le règlement", "Les titres servis sont inscrits à votre nom chez le dépositaire central, et le montant est prélevé à la date de valeur annoncée."],
];

/**
 * LES ADJUDICATIONS. Le déroulé parle du marché et non du geste ; ce que le
 * prix affiché veut dire est une règle de la maison sur une donnée de la page,
 * pas une étape. Ni l'un ni l'autre n'a sa place au catalogue.
 */
function Adjudications() {
  const t = useT();
  return (
    <>
      <p>
        {t("Les six Trésors de la CEMAC empruntent par adjudication : ils annoncent une séance, les investisseurs y proposent un prix ou un taux, et le Trésor sert les meilleures offres jusqu'au montant qu'il recherche. Les annonces viennent de la BEAC, et c'est elle qui fait foi.")}
      </p>
      <section>
        <TitreDeBrief>{t("Comment une séance se déroule")}</TitreDeBrief>
        <DefinitionsDeBrief>
          {SEANCE.map(([quand, quoi]) => (
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
    </>
  );
}

/** LE SONDAGE : pourquoi la maison sonde, et ce qu'un Trésor en fait. */
function Sondage() {
  const t = useT();
  return (
    <>
      <p>
        {t(
          "Les six Trésors de la CEMAC décident seuls de ce qu'ils émettent, et quand. Ce qu'ils achètent à une société de bourse, c'est le renseignement : à quel niveau la demande tient encore, et pour combien. Une ligne sondée ici n'annonce donc aucune séance : c'est la maison qui réunit les appétits, avant qu'il y ait quoi que ce soit à annoncer.",
        )}
      </p>
      <p>{t("Votre réponse y entre sans rien engager : il n'y a rien à signer et rien à provisionner.")}</p>
    </>
  );
}

/** Et comment se lit une ligne sondée : les trois marques de la liste. */
function LireUneLigne() {
  const t = useT();
  return (
    <section>
      <TitreDeBrief>{t("Lire une ligne")}</TitreDeBrief>
      <p>
        {t(
          "Sur chaque ligne, « ~ » précède la date à partir de laquelle elle serait prête — ce n'est pas une séance, et ce n'est pas une promesse. « ind. » est le niveau que la maison indique ; « min. » celui que vous posez comme plancher.",
        )}
      </p>
    </section>
  );
}

/** Une phrase par catégorie : ce qu'elle contient, et ce qu'elle fait au risque. */
const CATEGORIES: Record<"M" | "O" | "D" | "A", string> = {
  M: "Placement de trésorerie : titres courts, valeur liquidative très régulière, argent disponible sous quelques jours.",
  O: "Investis en obligations d'États et d'entreprises de la zone ; rendement porté par les coupons, sensibilité aux taux.",
  D: "Un panachage d'obligations, d'actions et de trésorerie, arbitré par la société de gestion.",
  A: "Exposés aux actions cotées à la BVMAC et à la région : le potentiel et la volatilité les plus élevés.",
};

/** LES FONDS : ce qu'est un OPCVM agréé, et les quatre catégories. */
function Fonds() {
  const t = useT();
  const cats = ["M", "O", "D", "A"] as const;
  return (
    <>
      <p>
        {t("Un OPCVM met en commun l'argent de plusieurs porteurs et le place selon une règle écrite. Ceux-ci sont agréés par la COSUMAF ; leur valeur liquidative est publiée régulièrement, avec leur société de gestion et leur dépositaire.")}
      </p>
      <p>
        {t("Certains sont ouverts à la souscription chez Purpose Capital ; pour les autres, dites-nous votre intérêt : nous organisons la relation avec la société de gestion.")}{" "}
        {t("Les parts sont toujours inscrites à votre nom chez le dépositaire.")}
      </p>
      <section>
        <TitreDeBrief>{t("Quatre catégories, du plus calme au plus mobile")}</TitreDeBrief>
        <DefinitionsDeBrief>
          {cats.map((c) => (
            <div key={c}>
              <dt>
                <i className={styles.pastille} data-cat={c} aria-hidden="true" />
                {t(FUND_CATEGORY_LABEL[c])}
              </dt>
              <dd>{t(CATEGORIES[c])}</dd>
            </div>
          ))}
        </DefinitionsDeBrief>
      </section>
      <p className={styles.sortie}>
        <Link href="/info/fonds-vl">{t("Éclairage : la VL et les frais")} →</Link>
      </p>
    </>
  );
}

/**
 * LES TROIS GESTES, CÔTE À CÔTE, ET APRÈS LES ÉTAPES.
 *
 * La protection de l'arbitrage est un CHOIX par opération, pas un régime. Deux
 * des trois gestes existaient déjà et n'étaient pas nommés — vendre seul,
 * acheter seul — et un client qui prend la voie non protégée doit savoir qu'il
 * la prend : c'est la seule façon pour que la voie protégée veuille dire
 * quelque chose. La table vit dans le domaine, avec le reste de la doctrine.
 */
function TroisGestes() {
  const t = useT();
  return (
    <section>
      <TitreDeBrief>{t("Trois façons de déplacer votre argent")}</TitreDeBrief>
      <DefinitionsDeBrief>
        {GESTES.map((g) => (
          <div key={g.cle}>
            <dt>{t(g.nom)}</dt>
            <dd>
              {t(g.garanti)} <em className={styles.risque}>{t(g.risque)}</em>
            </dd>
          </div>
        ))}
      </DefinitionsDeBrief>
    </section>
  );
}

/**
 * LA CONSERVATION, QUI N'EST PLUS UN SERVICE ET RESTE UNE PROMESSE.
 *
 * Elle a quitté le catalogue le 31 octobre 2026 : on ne la prend pas, elle
 * commence avec la première ligne, et sa fiche l'avouait — « rien à activer ».
 * Mais la ségrégation des avoirs n'est pas un argument de vente : c'est ce que
 * la maison doit au client, et c'est la seule page qui le lui dise. Les trois
 * moments que portaient ses étapes sont ici, en entier.
 */
function Conservation() {
  const t = useT();
  return (
    <>
      <p>{t("Vos titres sont inscrits à votre nom au dépositaire, jamais dans un compte collectif, et tout mouvement vous est prouvé.")}</p>
      <section>
        <TitreDeBrief>{t("Ce qui se passe, et quand")}</TitreDeBrief>
        <DefinitionsDeBrief>
          <div>
            <dt>{t("Dès la première ligne")}</dt>
            <dd>{t("Rien à activer : la conservation commence avec votre première ligne.")}</dd>
          </div>
          <div>
            <dt>{t("À chaque règlement")}</dt>
            <dd>{t("Chaque ligne servie est inscrite au dépositaire central, sous votre identifiant, à la date de règlement.")}</dd>
          </div>
          <div>
            <dt>{t("Ensuite, par période")}</dt>
            <dd>{t("Le relevé et les avis d'opéré suivent chaque mouvement ; les droits de garde sont appelés par période.")}</dd>
          </div>
        </DefinitionsDeBrief>
      </section>
    </>
  );
}

/**
 * LA PROSE, PAR IDENTIFIANT DE BRIEF.
 *
 * Les briefs absents de cette table n'ont rien en propre, et c'est le cas le
 * plus fréquent : la cote, l'épargne, le réinvestissement, le prélèvement et
 * la provision se racontent entièrement par leur raison d'être et leurs
 * étapes. Une entrée vide écrite « pour la symétrie » serait un endroit de
 * plus où quelqu'un irait poser une copie.
 */
export const PROSE: Record<string, ProseDeBrief> = {
  adjudications: { Avant: Adjudications },
  sondage: { Avant: Sondage, Apres: LireUneLigne },
  fonds: { Avant: Fonds, Apres: TroisGestes },
  conservation: { Avant: Conservation },
};
