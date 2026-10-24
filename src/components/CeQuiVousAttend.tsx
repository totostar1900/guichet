import Link from "next/link";
import { getT } from "@/i18n/server";
import { fmt } from "@/lib/format";
import { attentesDuClient } from "@/lib/domain/services";
import { contexteDuClient } from "@/lib/domain/contexte-client";
import styles from "./CeQuiVousAttend.module.css";

/**
 * Ce qui attend le lecteur, en tête du portefeuille.
 *
 * POURQUOI ELLE PASSE DEVANT LES CHIFFRES. C'est la seule bande de la page qui
 * demande une action de celui qui lit. Tout le reste est un constat : combien
 * je détiens, ce que ça a rapporté, ce qui arrive. Un constat attend d'être lu,
 * une action attend d'être faite, et les deux ne se rangent pas au même endroit.
 *
 * VIDE, ELLE N'EST PAS LÀ. Pas de « rien à décider », pas de coche verte. Une
 * bande qui dit « rien » occupe la place de ce qui compte, et elle apprend à
 * l'oeil à sauter cet endroit, y compris le jour où elle dit quelque chose.
 * C'est la même règle que le compteur de la barre, qui disparaît à zéro.
 *
 * ELLE REMPLACE UN ONGLET. « À décider » tenait un siège du dock du téléphone,
 * vide neuf jours sur dix : un onglet vide neuf jours sur dix est un onglet
 * qu'on cesse d'ouvrir. Ici le nombre se lit au passage, sans y aller.
 *
 * LA LISTE VIENT D'UN SEUL ENDROIT, `attentesDuClient`, partagée avec le
 * compteur de la barre. Deux listes auraient divergé, et le compteur aurait
 * annoncé un chiffre que la page ne montre pas.
 *
 * ELLE SE BORNE À DEUX, SAUF LÀ OÙ ELLE EST LE SUJET DE LA PAGE.
 *
 * Mesuré le 24 octobre 2026 à 390 px, avec les deux attentes du compte de
 * démonstration : la bande fait 239 px sur un écran de 844, et l'en-tête du
 * siège avec elle en fait 425 — la moitié de l'écran avant la première ligne
 * de ce qu'on était venu chercher. À deux, le sommaire reste visible ; la
 * liste peut en porter NEUF — convention, pièces, bulletin, contre-
 * proposition, mandat, liquidités, séance annoncée, flux en retard — et à
 * cinq la page du siège commence sous la ligne de flottaison.
 *
 * Deux, donc, puis une ligne qui dit le reste et mène là où la liste est
 * entière : la page d'arrivée, dont c'est le travail. Un siège n'a pas à
 * porter la file d'attente complète, il a à ne rien cacher — et « et trois
 * autres » ne cache rien, il nomme.
 *
 * `tout` : la page d'arrivée les montre toutes. C'est la page où l'on
 * atterrit, celle que la barre de l'application pointe, et la seule dont la
 * liste des devoirs est le sujet plutôt qu'un préalable.
 */
export async function CeQuiVousAttend({
  userId,
  tout = false,
  sauf,
}: {
  userId: string;
  /** La page d'arrivée porte la liste entière : voir la note ci-dessus. */
  tout?: boolean;
  /**
   * Les attentes qu'une page dit déjà autrement, par leur clef.
   *
   * UNE SEULE PAGE S'EN SERT, ET POUR UNE SEULE RAISON. Trade porte en tête
   * le disponible de la provision, parce que c'est la condition de tout
   * geste qu'on y pose. L'attente « disponible » nomme le même franc à cent
   * pixels de là, avec un autre verbe : « Replacer » là où la bande dit
   * « Alimenter ». Deux fois le même nombre sur un écran, et le lecteur
   * cherche lequel des deux est le vrai.
   *
   * Ce n'est pas un réglage d'apparence : la bande dit un ÉTAT — voici ce
   * que vous pouvez engager — et l'attente dit un REPROCHE — cet argent
   * dort. Sur la page qui sert à agir, l'état suffit ; le reproche reste là
   * où il porte, sur la page d'arrivée, qui a la liste entière.
   *
   * Il reste une liste de clefs et non un booléen : le jour où une autre
   * page redira une autre attente, elle le dira de la même façon, au lieu
   * d'inventer son propre drapeau.
   */
  sauf?: string[];
}) {
  const t = await getT();
  const ctx = await contexteDuClient(userId);
  const toutes = attentesDuClient(ctx, fmt);
  const attentes = sauf?.length ? toutes.filter((a) => !sauf.includes(a.cle)) : toutes;
  if (!attentes.length) return null;
  /* L'ordre vient du domaine, et il va du plus bloquant au moins : couper à
     deux garde donc les deux qui bloquent le plus, et jamais deux au hasard. */
  const montrees = tout ? attentes : attentes.slice(0, 2);
  const reste = attentes.length - montrees.length;
  return (
    <section className={styles.bande} id="a-decider" aria-label={t("Ce qui vous attend")}>
      <h2 className={styles.titre}>{t("Ce qui vous attend")} · {attentes.length}</h2>
      <ul className={styles.liste}>
        {montrees.map((a) => (
          <li key={a.cle} className={styles.ligne} data-ton={a.ton}>
            <span className={styles.quoi}>
              {/* Un mot passe par le dictionnaire, une donnée sort telle quelle :
                  voir la note sur `chiffre` dans domain/services. */}
              <b>{typeof a.chiffre === "string" ? a.chiffre : t(a.chiffre.key, a.chiffre.params)}</b> · {t(a.quoi.key, a.quoi.params)}
            </span>
            <small className={styles.quand}>{t(a.quand.key, a.quand.params)}</small>
            <Link className="btn sm primary" href={a.href}>
              {t(a.geste)}
            </Link>
          </li>
        ))}
      </ul>
      {/* LE RESTE SE NOMME ET MÈNE QUELQUE PART. « et 3 autres » sans lien
          serait pire que de les montrer : on saurait qu'il y a quelque chose
          sans savoir où. Il mène à la page d'arrivée, à l'ancre de la bande,
          où la liste est entière. */}
      {reste > 0 && (
        <Link className={styles.reste} href="/#a-decider">
          {t(reste > 1 ? "et {n} autres" : "et une autre", { n: String(reste) })}
        </Link>
      )}
    </section>
  );
}
