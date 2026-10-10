"use client";

import { useActionState } from "react";
import { useT } from "@/i18n/client";
import { Select } from "@/components/ui/Select";
import { ajouterSignataireAction, retirerSignataireAction, type AccesResult } from "./acces-actions";

/**
 * LA LISTE DES PERSONNES D'UN DOSSIER APPROUVÉ.
 *
 * Le client la déclare à l'ouverture et n'y touche plus ensuite ; mais un
 * conseil change, et le dossier ne doit pas geler avec lui. Ajouter demande
 * deux regards et s'appuie sur un acte ; retirer se fait d'une main, et
 * ferme l'accès de la personne dans le même geste.
 */
export function Signataires({ fileId, personnes }: { fileId: string; personnes: { nom: string; role: string; aUnAcces: boolean }[] }) {
  const t = useT();
  const [ajout, ajouter, enCours] = useActionState<AccesResult | null, FormData>(ajouterSignataireAction, null);
  const [retrait, retirer] = useActionState<AccesResult | null, FormData>(retirerSignataireAction, null);

  return (
    <div style={{ marginTop: "var(--s-5)" }}>
      <span className="eyebrow">{t("Les personnes déclarées")}</span>
      <p className="muted" style={{ fontSize: ".82rem", margin: "var(--s-3) 0" }}>
        {t(
          "Qui écrit cette liste commande qui peut recevoir un accès : l'ajout demande une seconde personne et s'appuie sur un acte. Retirer quelqu'un ferme son accès dans le même geste, pour qu'un ancien administrateur ne reste pas connectable.",
        )}
      </p>

      {personnes.length > 0 && (
        <ul style={{ margin: 0, padding: "0 0 var(--s-4) var(--s-7)", fontSize: ".86rem", lineHeight: 1.7 }}>
          {personnes.map((p) => (
            <li key={p.nom}>
              <b>{p.nom}</b> <span className="muted">· {t(p.role)}</span>
              {p.aUnAcces && <span className="st transmise" style={{ marginLeft: "var(--s-3)" }}>{t("a un accès")}</span>}
              <form action={retirer} style={{ display: "inline-flex", gap: "var(--s-3)", alignItems: "flex-end", marginLeft: "var(--s-4)" }}>
                <input type="hidden" name="fileId" value={fileId} />
                <input type="hidden" name="nom" value={p.nom} />
                <label className="field" style={{ minWidth: "11rem" }}>
                  <input name="motif" maxLength={300} autoComplete="off" placeholder={t("a quitté le conseil le 3 octobre")} />
                </label>
                <button className="btn sm ghost" type="submit">
                  {t("Retirer")}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
      {retrait && <p className={retrait.ok ? "good-ink" : "crit-ink"}>{retrait.ok ? retrait.message : retrait.error}</p>}

      <form action={ajouter} style={{ display: "flex", gap: "var(--s-4)", alignItems: "flex-end", flexWrap: "wrap" }}>
        <input type="hidden" name="fileId" value={fileId} />
        <label className="field">
          {t("Nom, tel qu'il figure sur la pièce")}
          <input name="nom" maxLength={120} autoComplete="off" />
        </label>
        <label className="field">
          {t("Rôle")}
          <Select
            block
            name="role"
            value="representant"
            options={[
              { value: "representant", label: t("Représentant légal") },
              { value: "cotitulaire", label: t("Cotitulaire désigné") },
              { value: "beneficiaire_effectif", label: t("Bénéficiaire effectif (> 25 %)") },
            ]}
          />
        </label>
        <label className="field">
          {t("Date de naissance")}
          <input type="date" name="birthDate" />
        </label>
        <label className="field">
          {t("N° de pièce")}
          <input name="idNumber" maxLength={60} autoComplete="off" />
        </label>
        <label className="field" style={{ minWidth: "16rem", flexGrow: 1 }}>
          {t("L'acte qui le désigne")}
          <input name="acte" maxLength={300} autoComplete="off" placeholder={t("PV du conseil du 3 octobre 2026")} />
        </label>
        <button className="btn sm primary" type="submit" disabled={enCours}>
          {enCours ? "…" : t("Ajouter")}
        </button>
      </form>
      {ajout && <p className={ajout.ok ? "good-ink" : "crit-ink"}>{ajout.ok ? ajout.message : ajout.error}</p>}
    </div>
  );
}
