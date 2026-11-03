"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useT } from "@/i18n/client";
import { Select } from "@/components/ui/Select";
import styles from "./ComparatifDesSeances.module.css";

export interface OptionsSerialisables {
  pays: { valeur: string; n: number }[];
  /** `valeur` est la clef de l'adresse : « 5 ans » ou « panier:4-5 ans ». */
  exactes: { valeur: string; libelle: string; n: number }[];
  paniers: { valeur: string; libelle: string; n: number }[];
}

/**
 * LES DEUX LISTES EN TÊTE DU COMPARATIF : PAYS, DURÉE (3 novembre 2026).
 *
 * « Des sélecteurs tout en haut qui dirigent la page entière de comparaison. » Le choix vit dans
 * l'ADRESSE (« ?pays=…&duree=… ») : le lien se partage, le retour du navigateur le rend, et la page
 * se rend côté serveur sans état caché. Changer une liste remplace l'adresse sans empiler
 * d'historique et sans remonter la page.
 *
 * UNE DURÉE SANS SÉANCE EST GRISÉE, JAMAIS CACHÉE : on sait pourquoi elle manque. Et « revenir à ma
 * ligne » n'apparaît que lorsqu'on s'en est éloigné.
 */
export function SelecteursDeComparaison({ base, pays, duree, parDefaut, options, trouvees }: { base: string; pays: string; duree: string; parDefaut: { pays: string; duree: string }; options: OptionsSerialisables; trouvees: number }) {
  const t = useT();
  const router = useRouter();
  const [, demarrer] = useTransition();

  const adresse = (p: string, d: string) => `${base}${p !== parDefaut.pays ? `&pays=${encodeURIComponent(p)}` : ""}${d !== parDefaut.duree ? `&duree=${encodeURIComponent(d)}` : ""}`;
  const aller = (p: string, d: string) => demarrer(() => router.replace(adresse(p, d), { scroll: false }));
  const loin = pays !== parDefaut.pays || duree !== parDefaut.duree;
  const n = (k: number) => (k === 0 ? t("aucune") : k === 1 ? t("1 séance") : t("{n} séances", { n: String(k) }));

  return (
    <div className={styles.selecteurs}>
      <div className={styles.deuxListes}>
        <div className={styles.champ}>
          <span className={styles.etiquette}>{t("Pays")}</span>
          <Select block cherchable={false} value={pays} onChange={(v) => aller(v, duree)} options={options.pays.map((o) => ({ value: o.valeur, label: o.valeur, hint: n(o.n) }))} />
        </div>
        <div className={styles.champ}>
          <span className={styles.etiquette}>{t("Durée")}</span>
          <Select
            block
            cherchable={false}
            value={duree}
            onChange={(v) => aller(pays, v)}
            options={[
              { value: "", label: t("Durée exacte"), group: true },
              ...options.exactes.map((o) => ({ value: o.valeur, label: o.libelle, hint: n(o.n) })),
              ...(options.paniers.length ? [{ value: "", label: t("Panier de durées"), group: true }, ...options.paniers.map((o) => ({ value: o.valeur, label: o.libelle, hint: n(o.n) }))] : []),
            ]}
          />
        </div>
      </div>
      <p className={styles.etat}>
        <span>{trouvees === 0 ? t("Aucune séance pour ce choix.") : trouvees === 1 ? t("1 séance comparable · abondements écartés") : t("{n} séances comparables · abondements écartés", { n: String(trouvees) })}</span>
        {loin && (
          <Link href={base} scroll={false} className={styles.revenir}>
            {t("Revenir à ma ligne")}
          </Link>
        )}
      </p>
    </div>
  );
}
