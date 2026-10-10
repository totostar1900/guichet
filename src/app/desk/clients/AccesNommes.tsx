"use client";

import { useActionState } from "react";
import { useT } from "@/i18n/client";
import { Select } from "@/components/ui/Select";
import { fmtDateTime } from "@/lib/format";
import { accesVivant, ROLE_ACCES_LABEL, type AccesCompte, type RoleQuiAgit } from "@/lib/domain/acces-nomme";
import { accorderAccesAction, fixerPlafondAction, revoquerAccesAction, type AccesResult } from "./acces-actions";

/**
 * QUI PEUT SE CONNECTER SUR CE COMPTE.
 *
 * L'écran n'existe que pour les comptes qui ne sont pas une personne
 * physique : une personne physique n'a qu'un donneur d'ordres, et proposer
 * d'en nommer d'autres rouvrirait la procuration par la porte de service.
 *
 * On choisit DANS les personnes du dossier, jamais en tapant un nom : ce qui
 * n'est pas déclaré n'existe pas.
 */
export function AccesNommes({ fileId, candidats, acces, plafondDuCompte }: { fileId: string; candidats: { nom: string; role: RoleQuiAgit }[]; acces: AccesCompte[]; plafondDuCompte?: number }) {
  const t = useT();
  const [pose, accorder, enCours] = useActionState<AccesResult | null, FormData>(accorderAccesAction, null);
  const [retrait, revoquer] = useActionState<AccesResult | null, FormData>(revoquerAccesAction, null);
  const [plaf, fixerPlafond] = useActionState<AccesResult | null, FormData>(fixerPlafondAction, null);
  const vivants = acces.filter(accesVivant);
  const anciens = acces.filter((a) => !accesVivant(a));
  const libres = candidats.filter((c) => !vivants.some((a) => a.nom === c.nom));

  return (
    <div style={{ marginTop: "var(--s-5)" }}>
      <span className="eyebrow">{t("Qui peut se connecter sur ce compte")}</span>{" "}
      <span className="st">{t("{n} accès", { n: String(vivants.length) })}</span>
      <p className="muted" style={{ fontSize: ".82rem", margin: "var(--s-3) 0" }}>
        {t(
          "Le compte garde son identifiant ; chaque personne nommée se connecte avec le sien, et ses gestes portent son nom. Donner un accès demande une seconde personne ; le retirer, non : fermer une porte dans l'urgence doit se faire d'une main.",
        )}
      </p>

      {/* LE PLAFOND DU PV, ENFIN APPLIQUÉ. Il vivait dans un champ libre que
          le client tapait et que personne ne vérifiait : une règle affichée
          et non tenue est pire qu'une règle absente. */}
      <form action={fixerPlafond} style={{ display: "flex", gap: "var(--s-4)", alignItems: "flex-end", flexWrap: "wrap", marginBottom: "var(--s-4)" }}>
        <input type="hidden" name="fileId" value={fileId} />
        <label className="field">
          {t("Plafond par ordre du compte, en francs")}
          <input name="plafond" inputMode="numeric" autoComplete="off" defaultValue={plafondDuCompte ?? ""} placeholder={t("vide : aucun plafond")} style={{ width: "10rem" }} />
        </label>
        <button className="btn sm" type="submit">
          {t("Fixer")}
        </button>
        <span className="muted" style={{ fontSize: ".82rem", flex: "1 1 24ch" }}>
          {t("Au-delà, l'ordre ne se passe pas tout seul : il passe par un conseiller, qui parle au groupe. C'est l'intention du PV, tenue par les moyens que nous avons. Relever demande une seconde personne ; abaisser, non.")}
        </span>
      </form>
      {plaf && <p className={plaf.ok ? "good-ink" : "crit-ink"}>{plaf.ok ? plaf.message : plaf.error}</p>}

      {vivants.length > 0 && (
        <div className="scroll-x">
          <table className="tbl">
            <thead>
              <tr>
                <th>{t("Personne")}</th>
                <th>{t("Se connecte avec")}</th>
                <th>{t("Plafond propre")}</th>
                <th>{t("Accordé")}</th>
                <th>{t("Retirer")}</th>
              </tr>
            </thead>
            <tbody>
              {vivants.map((a) => (
                <tr key={a.id}>
                  <td>
                    <b>{a.nom}</b>
                    <small className="muted"> · {t(ROLE_ACCES_LABEL[a.role])}</small>
                  </td>
                  <td>
                    <span className="mono">{a.canalValeur}</span>
                    <br />
                    <small className="muted">{a.premiereConnexionLe ? t("lié le {d}", { d: fmtDateTime(a.premiereConnexionLe) }) : t("jamais connecté : le premier code reçu liera l'accès")}</small>
                  </td>
                  <td>
                    <form action={fixerPlafond} style={{ display: "flex", gap: "var(--s-3)", alignItems: "flex-end" }}>
                      <input type="hidden" name="fileId" value={fileId} />
                      <input type="hidden" name="accesId" value={a.id} />
                      <label className="field">
                        <input name="plafond" inputMode="numeric" autoComplete="off" defaultValue={a.plafondParOrdre ?? ""} placeholder={plafondDuCompte ? t("celui du compte") : t("aucun")} style={{ width: "7rem" }} />
                      </label>
                      <button className="btn sm ghost" type="submit">
                        {t("Fixer")}
                      </button>
                    </form>
                  </td>
                  <td>
                    <small className="muted">
                      {fmtDateTime(a.accordeLe)} · {a.accordePar}
                    </small>
                  </td>
                  <td>
                    <form action={revoquer} style={{ display: "flex", gap: "var(--s-3)", alignItems: "flex-end", flexWrap: "wrap" }}>
                      <input type="hidden" name="accesId" value={a.id} />
                      <input type="hidden" name="fileId" value={fileId} />
                      <label className="field" style={{ minWidth: "11rem" }}>
                        <input name="motif" maxLength={300} autoComplete="off" placeholder={t("a quitté le conseil")} />
                      </label>
                      <button className="btn sm ghost" type="submit">
                        {t("Retirer")}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {retrait && <p className={retrait.ok ? "good-ink" : "crit-ink"}>{retrait.ok ? retrait.message : retrait.error}</p>}

      {libres.length > 0 ? (
        <form action={accorder} style={{ display: "flex", gap: "var(--s-4)", alignItems: "flex-end", flexWrap: "wrap", marginTop: "var(--s-4)" }}>
          <input type="hidden" name="fileId" value={fileId} />
          <label className="field">
            {t("Personne déclarée")}
            {/* LA CLEF SUIT LA LISTE, et c'est le piège des choix périmés :
                le Select garde son choix dans son propre état, et après un
                accès accordé ce choix a quitté la liste. La boîte affichait
                alors un trait, et le formulaire ne désignait plus personne. */}
            <Select key={libres.map((c) => c.nom).join("|")} block name="nom" value={libres[0].nom} options={libres.map((c) => ({ value: c.nom, label: `${c.nom} · ${t(ROLE_ACCES_LABEL[c.role])}` }))} />
          </label>
          <label className="field">
            {t("Canal")}
            <Select block name="canal" value="phone" options={[{ value: "phone", label: t("Numéro WhatsApp") }, { value: "email", label: t("Adresse e-mail") }]} />
          </label>
          <label className="field">
            {t("Où le code partira")}
            <input name="valeur" autoComplete="off" placeholder="+237 6 00 00 00 00" />
          </label>
          <button className="btn sm primary" type="submit" disabled={enCours}>
            {enCours ? "…" : t("Accorder l'accès")}
          </button>
        </form>
      ) : (
        <p className="muted" style={{ fontSize: ".82rem" }}>
          {candidats.length === 0
            ? t("Aucune personne du dossier ne peut agir : déclarez un représentant légal ou un cotitulaire désigné. Un bénéficiaire effectif ne passe pas d'ordre.")
            : t("Toutes les personnes qui peuvent agir ont leur accès.")}
        </p>
      )}
      {pose && <p className={pose.ok ? "good-ink" : "crit-ink"}>{pose.ok ? pose.message : pose.error}</p>}

      {anciens.length > 0 && (
        <ul style={{ margin: "var(--s-4) 0 0", paddingLeft: "var(--s-7)", fontSize: ".8rem", color: "var(--ink-2)", lineHeight: 1.6 }}>
          {anciens.map((a) => (
            <li key={a.id}>
              {a.nom} <span className="muted">· {t("retiré le {d} par {q}", { d: fmtDateTime(a.revoqueLe!), q: a.revoquePar ?? "—" })}</span>
              {a.revoqueMotif ? <span className="muted"> · {a.revoqueMotif}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
