"use client";

import { useT } from "@/i18n/client";
import { Select, type SelectOption } from "./ui/Select";

export interface OptionDePeriode {
  valeur: string;
  /** Déjà traduit. */
  libelle: string;
  /** La raison, déjà traduite, quand les données ne servent pas cette période : l'option reste, éteinte, et la dit. */
  indisponible?: string;
}

/**
 * LA PÉRIODE, SUR LA LIGNE DE LA RECHERCHE (28 novembre 2026). Un seul sélecteur pour Titres et Fonds : « Période · 3 mois », la liste de la maison (jamais la liste native du navigateur).
 *
 * Une période que les données ne servent pas reste dans la liste, éteinte, avec sa raison : on ne la retire pas, le lecteur ne saurait pas pourquoi elle manque. La liste s'ouvre sur
 * la mention « Performances passées » : les chiffres qu'elle choisit sont des rendements passés, qui ne préjugent pas des suivants.
 */
export function ChoixPeriode({ valeur, options, onChange }: { valeur: string; options: OptionDePeriode[]; onChange: (v: string) => void }) {
  const t = useT();
  const liste: SelectOption[] = [
    { value: "", label: t("Performances passées"), group: true },
    ...options.map((o) => ({ value: o.valeur, label: o.libelle, disabled: Boolean(o.indisponible), hint: o.indisponible })),
  ];
  return <Select compact cherchable={false} label={t("Période")} value={valeur} options={liste} onChange={onChange} />;
}
