"use client";

import { useActionState, useState } from "react";
import { jugerAction, retirerJugementAction, type JugementResult } from "../actions";
import { MOTIFS, MOTIFS_DE_JUGEMENT, motifExigeLaPage, motifFerme, motifSurUnePeriode, type MotifDeJugement } from "@/lib/domain/jugement-bulletin";
import { useT } from "@/i18n/client";
import styles from "./page.module.css";

/**
 * LE GESTE QUI RÉPOND À UNE REMARQUE.
 *
 * Il tient à côté de la remarque et non dans une page à part : on juge ce
 * qu'on a sous les yeux. La feuille s'ouvre du bord de son déclencheur, comme
 * toutes les feuilles de la maison.
 *
 * DEUX PORTÉES, ET LA SECONDE EST CE QUI REND LE GESTE PRATICABLE. « Indice
 * BVMAC introuvable » est identique sur cent douze séances ; demander cent
 * douze gestes aurait garanti que personne n'en fasse aucun. Seul le motif
 * « pas encore publié » y a droit, parce qu'il affirme quelque chose sur
 * l'histoire de la place et non sur un document.
 */
export function Juger({
  seance,
  code,
  texte,
  jugement,
  bornes,
  pageProposee,
}: {
  seance: string;
  code: string;
  texte: string;
  jugement?: { id: string; motif: MotifDeJugement; portee: string; page?: number; note?: string; at: string };
  /** La date depuis laquelle la bourse publie ce que cette famille réclame, quand on la connaît. */
  bornes?: { jusquau: string };
  /** La page que le lecteur a lui-même retrouvée : elle évite au desk de la chercher. */
  pageProposee?: number;
}) {
  const t = useT();
  const [ouvert, setOuvert] = useState(false);
  const [motif, setMotif] = useState<MotifDeJugement>(bornes ? "pas_encore_publie" : "absent_du_document");
  const [portee, setPortee] = useState<"seance" | "periode">(bornes ? "periode" : "seance");
  const [res, action, enCours] = useActionState<JugementResult | null, FormData>(jugerAction, null);
  const [resRetrait, retrait, retraitEnCours] = useActionState<JugementResult | null, FormData>(retirerJugementAction, null);

  if (jugement) {
    return (
      <div className={styles.juge}>
        <small className={motifFerme(jugement.motif) ? undefined : styles.moins}>
          {motifFerme(jugement.motif) ? t("Jugé") : t("Indiqué au lecteur")} : {t(MOTIFS_DE_JUGEMENT[jugement.motif].libelle)}
          {jugement.page != null ? ` · ${t("page {n}", { n: jugement.page })}` : ""}
          {jugement.portee === "periode" ? ` · ${t("sur une période")}` : ""}
          {jugement.note ? ` · ${jugement.note}` : ""}
        </small>
        <form action={retrait}>
          <input type="hidden" name="id" value={jugement.id} />
          <input type="hidden" name="seance" value={seance} />
          <button type="submit" className="btn sm ghost" disabled={retraitEnCours}>
            {retraitEnCours ? t("Retrait…") : t("Retirer ce jugement")}
          </button>
        </form>
        {resRetrait?.error && <small className={styles.moins}>{resRetrait.error}</small>}
      </div>
    );
  }

  /* PAS DE MESSAGE DE SUCCÈS GARDÉ EN ÉTAT. Il en gardait un, et il a mal
     tourné à l'écran : après un retrait, le serveur ne passait plus de
     jugement, mais « Noté, cette remarque ne demande plus rien à personne »
     restait affiché depuis l'enregistrement d'avant. L'écran affirmait le
     contraire du fait. La seule vérité est celle que le serveur rend, donc
     c'est le bloc « Jugé » ci-dessus qui dit le succès, et l'attente se voit
     au bouton pendant ce temps. */
  if (!ouvert)
    return (
      <button type="button" className="btn sm ghost" onClick={() => setOuvert(true)}>
        {t("Répondre")}
      </button>
    );

  return (
    <form action={action} className={styles.jugerForm}>
      <input type="hidden" name="seance" value={seance} />
      <input type="hidden" name="cible" value={texte} />
      <input type="hidden" name="famille" value={code} />
      <input type="hidden" name="portee" value={portee} />

      <label>
        <span>{t("Ce que vous avez constaté")}</span>
        <select name="motif" value={motif} onChange={(e) => { const m = e.target.value as MotifDeJugement; setMotif(m); if (!motifSurUnePeriode(m)) setPortee("seance"); }}>
          {MOTIFS.map((m) => (
            <option key={m} value={m}>
              {t(MOTIFS_DE_JUGEMENT[m].libelle)}
            </option>
          ))}
        </select>
      </label>
      <small className={styles.conseil}>{t(MOTIFS_DE_JUGEMENT[motif].dit)}</small>

      {/* LA PORTÉE SE CHOISIT, ET SON EFFET S'ANNONCE AVANT D'ÊTRE PRIS. */}
      {motifSurUnePeriode(motif) && bornes && (
        <div className={styles.portee}>
          <label>
            <input type="radio" name="_portee" checked={portee === "seance"} onChange={() => setPortee("seance")} />
            <span>{t("cette séance seulement")}</span>
          </label>
          <label>
            <input type="radio" name="_portee" checked={portee === "periode"} onChange={() => setPortee("periode")} />
            <span>{t("toutes les séances jusqu'au {d}, pour la famille {c}", { d: bornes.jusquau, c: code })}</span>
          </label>
          {portee === "periode" && <input type="hidden" name="jusquau" value={bornes.jusquau} />}
        </div>
      )}

      {/* LA PAGE, EXIGÉE PAR LES MOTIFS QUI PARLENT D'UN ENDROIT. Le lecteur
          propose la sienne quand il a su retrouver son texte dans le document :
          le desk n'a alors rien à chercher, il confirme ou il corrige. */}
      {motifExigeLaPage(motif) && (
        <label>
          <span>{t("La page du document où vous avez regardé")}</span>
          <input name="page" type="number" min={1} max={999} defaultValue={pageProposee ?? ""} required />
        </label>
      )}

      <label>
        <span>{t("Ce que vous ajoutez (facultatif)")}</span>
        <input name="note" maxLength={300} placeholder={t("ce que vous avez vu, en une phrase")} />
      </label>

      <div className={styles.jugerPied}>
        <button type="submit" className="btn sm" disabled={enCours}>
          {enCours ? t("Enregistrement…") : t("Enregistrer")}
        </button>
        <button type="button" className="btn sm ghost" onClick={() => setOuvert(false)}>
          {t("Annuler")}
        </button>
      </div>
      {res?.error && <small className={styles.moins}>{res.error}</small>}
    </form>
  );
}
