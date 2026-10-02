"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useT } from "@/i18n/client";

/**
 * Les colonnes du rail, que chacun règle pour son écran.
 *
 * POURQUOI. Une ligne d'échange porte six choses : le nom ou l'objet, la date,
 * le canal, les étiquettes, l'aperçu du dernier message, le compte de non-lus,
 * et les gestes. Toutes utiles à quelqu'un, aucune utile à tout le monde en même
 * temps. Sur un rail étroit elles se bousculent ; sur un large, l'aperçu est ce
 * qui fait gagner du temps. Imposer un jeu, c'est choisir à la place de qui
 * regarde l'écran.
 *
 * COMMENT, ET POURQUOI AINSI. Le serveur rend TOUT, et le navigateur cache ce
 * qu'on ne veut pas, par un attribut sur le rail et des règles CSS. Rien ne se
 * recalcule, rien ne se redemande, et la liste ne clignote pas au changement.
 * Une colonne retirée reste dans le document : elle revient d'un clic, sans
 * aller rechercher quoi que ce soit.
 *
 * OÙ VIT LE RÉGLAGE. Dans le navigateur, comme la taille des panneaux : il
 * appartient à qui regarde, pas au desk. Tout est en try/catch, et sans
 * stockage la page montre simplement tout.
 */
const CLE = "guichet.desk.messages.colonnes";
const RAIL = "desk-messages-liste";

/** L'ordre est celui de la ligne, pour que la liste de réglages la relise. */
export const COLONNES = ["date", "canal", "etiquettes", "apercu", "nonlus", "gestes"] as const;
export type Colonne = (typeof COLONNES)[number];

const TOUTES = COLONNES.join(" ");

const lire = (): string => {
  try {
    const brut = window.localStorage.getItem(CLE);
    if (brut === null) return TOUTES;
    /* On ne garde que des noms connus : un stockage modifié à la main ne doit
       pas pouvoir inventer une colonne, ni en faire disparaître le nom. */
    return brut
      .split(" ")
      .filter((x) => (COLONNES as readonly string[]).includes(x))
      .join(" ");
  } catch {
    return TOUTES;
  }
};

export function Colonnes() {
  const t = useT();
  /* Le réglage se lit après le montage : localStorage n'existe pas au rendu
     serveur, et deux arbres différents feraient se plaindre React. Le contrôle
     ne paraît donc qu'une fois monté, ce qui est sans conséquence : la liste,
     elle, est entière dès le premier rendu. */
  const monte = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  return monte ? <Reglage t={t} /> : null;
}

function Reglage({ t }: { t: (s: string) => string }) {
  const [vues, setVues] = useState<string>(() => lire());

  /* L'attribut porte le réglage, et la CSS fait le reste. Écrire ici plutôt que
     de conditionner le rendu garde la liste intacte dans le document. */
  useEffect(() => {
    const el = document.getElementById(RAIL);
    if (el) el.dataset.colonnes = vues;
  }, [vues]);

  const basculer = (c: Colonne) => {
    const liste = vues.split(" ").filter(Boolean);
    const neuf = liste.includes(c) ? liste.filter((x) => x !== c) : COLONNES.filter((x) => x === c || liste.includes(x));
    const texte = neuf.join(" ");
    setVues(texte);
    try {
      window.localStorage.setItem(CLE, texte);
    } catch {
      /* Pas de stockage : le réglage vaut pour cette visite. */
    }
  };

  const mot: Record<Colonne, string> = {
    date: t("Date"),
    canal: t("Canal"),
    etiquettes: t("Étiquettes"),
    apercu: t("Aperçu"),
    nonlus: t("Non lus"),
    gestes: t("Gestes"),
  };

  return (
    <details className="colonnes">
      <summary className="btn sm ghost">{t("Colonnes")}</summary>
      <div className="colonnes-liste">
        {COLONNES.map((c) => (
          <label key={c}>
            <input type="checkbox" checked={vues.split(" ").includes(c)} onChange={() => basculer(c)} />
            <span>{mot[c]}</span>
          </label>
        ))}
      </div>
    </details>
  );
}
