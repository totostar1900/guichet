import Link from "next/link";
import type { FacingView } from "@/lib/domain/crossing";
import type { Offer } from "@/lib/domain/types";
import { fmt } from "@/lib/format";
import { getT } from "@/i18n/server";
import styles from "./CrossSignal.module.css";

/**
 * Qu'une contrepartie existe, et rien de plus.
 *
 * Une obligation de la zone s'échange rarement, parfois jamais. Un porteur qui
 * voulait sortir n'avait donc aucun moyen de savoir si sa sortie était
 * réaliste : la fiche lui montrait un dernier cours, qui est le prix d'une
 * séance et non la promesse d'un acheteur. Le renseignement qui change sa
 * décision est ailleurs, et la maison l'avait déjà : quelqu'un, en face, veut
 * cette ligne.
 *
 * Ce que ce bloc ne dit pas est aussi important que ce qu'il dit. Pas de nom,
 * pas de référence, pas de limite : la limite d'un client est sa position de
 * négociation, et la publier le désarmerait devant celui qui lui fait face. Le
 * compte arrive ici déjà agrégé, et la profondeur elle-même ne paraît que si la
 * maison l'a décidé.
 *
 * Il ne dit pas non plus le silence. Une ligne sans contrepartie n'affiche
 * rien, plutôt qu'un « personne aujourd'hui » qui découragerait un porteur
 * alors que le desk, lui, peut aller chercher le quatrième.
 *
 * Le lien propose le sens inverse de ce qui attend : un ordre d'achat en face
 * appelle une vente, et l'inverse. C'est le geste que le lecteur ferait, pas un
 * conseil sur l'opportunité de le faire.
 */
export async function CrossSignal({ o, facing }: { o: Offer; facing: FacingView[] }) {
  const t = await getT();
  if (!facing.length) return null;
  const unit = o.instrument === "action" ? "actions" : "titres";
  return (
    <div className={styles.wrap}>
      <ul className={styles.list}>
        {facing.map((f) => (
          <li key={f.side}>
            <b>
              {f.orders === 1
                ? t(f.side === "achat" ? "Un ordre d'achat attend sur cette ligne" : "Un ordre de vente attend sur cette ligne")
                : t(f.side === "achat" ? "{n} ordres d'achat attendent sur cette ligne" : "{n} ordres de vente attendent sur cette ligne", { n: String(f.orders) })}
            </b>
            {f.qty != null && (
              <span className="muted">
                {" · "}
                {unit === "actions" ? t("pour {q} actions en tout", { q: fmt(f.qty) }) : t("pour {q} titres en tout", { q: fmt(f.qty) })}
              </span>
            )}
            <Link className={styles.go} href={`/offres/${o.id}/intention?intent=${f.side === "achat" ? "vente" : "achat"}`}>
              {t(f.side === "achat" ? "Vendre" : "Acheter")}
            </Link>
          </li>
        ))}
      </ul>
      <p className={styles.note}>
        {t("Une ligne de la zone s'échange rarement : votre contrepartie est le plus souvent un autre client de la maison. Le desk vous met en rapport, et le prix se négocie.")}
      </p>
    </div>
  );
}
