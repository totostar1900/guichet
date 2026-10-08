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
 */
export async function CeQuiVousAttend({ userId }: { userId: string }) {
  const t = await getT();
  const ctx = await contexteDuClient(userId);
  const attentes = attentesDuClient(ctx, fmt);
  if (!attentes.length) return null;
  return (
    <section className={styles.bande} id="a-decider" aria-label={t("Ce qui vous attend")}>
      <h2 className={styles.titre}>{t("Ce qui vous attend")} · {attentes.length}</h2>
      <ul className={styles.liste}>
        {attentes.map((a) => (
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
    </section>
  );
}
