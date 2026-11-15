"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useDates, useT } from "@/i18n/client";
import { fmt } from "@/lib/format";
import { PREAVIS_JOURS } from "@/lib/domain/prelevement";
import { deposerCopieMandatAction, envoyerCodeMandatAction, revoquerMandatAction, signerMandatAction, type MandatResult } from "./actions";
import type { EtapeDuMandat } from "@/lib/domain/mandat";
import { hrefDeLecture } from "@/lib/lecture";
import styles from "./page.module.css";
import { BarreDEtape } from "@/components/mobile/BarreDEtape";
import barre from "@/components/mobile/BarreDEtape.module.css";

export interface Vu {
  id: string;
  standingId?: string;
  /** Le fonds de l'épargne que ce mandat paie. */
  fonds?: string;
  ref: string;
  objet: "provision" | "instruction";
  titulaire: string;
  banque: string;
  compte: string;
  /** Le montant signé : celui qui est présenté, et le seul qu'il y ait. */
  montant: number;
  jour?: number;
  etat: "actif" | "suspendu" | "revoque";
  /** Où en est le mandat : signé par code, copie signée à la main attendue, en vérification, refusée, actif. */
  etape: EtapeDuMandat;
  /** Le motif du dernier refus de la copie, déjà traduit. */
  refus?: string;
  signeLe?: string;
  /** L'exemplaire produit à la signature, s'il existe : la pièce que la banque réclame. */
  piece?: string;
  codeEnvoyeA?: string;
  codeEnvoyeLe?: string;
  revoqueLe?: string;
  /** Le prochain tirage (ISO), pour un mandat actif. */
  prochain?: string;
  /** Le premier prélèvement (ISO), pour un mandat qui n'a pas encore prélevé. */
  premier?: string;
}

function Msg({ state }: { state: MandatResult | null }) {
  const t = useT();
  if (!state) return null;
  return <p className={state.ok ? styles.ok : styles.erreur}>{state.ok ? (state.message ? t(state.message) : null) : t(state.error)}</p>;
}

/**
 * LA PAGE D'UN MANDAT (15 novembre 2026, maquette « Page du mandat » : 1C · 2 masquer · 3 OK · 4 OK · 5 OK).
 *
 * UN MANDAT SE LIT AVANT DE SE SIGNER, ET SE SIGNE À PART : la page l'affiche avec ses chiffres, puis demande le code. C'est la même séquence que la convention et que l'ordre.
 *
 * Un récapitulatif en tableau resserré (le montant, le jour, le fonds, le compte, le premier prélèvement), sans la référence du mandat — elle reste sur le document, dans le titre de
 * la lecture et dans l'historique — et le compte à ses quatre derniers chiffres. Les gestes vivent dans une barre collée au bas de l'écran, toujours visible : le geste qui attend, et
 * « Supprimer » (un mandat à signer) ou « Révoquer » (un mandat signé), côte à côte. Le retrait se confirme sur place, dans la barre.
 */
export function MesMandats({
  mandats,
  canal,
  dossier,
  injoignable,
}: {
  /** Le mandat montré : la page d'un mandat n'en porte qu'un (« /moi/prelevements/[id] »). */
  mandats: Vu[];
  canal?: { to: string; parMail: boolean };
  /** Le dossier existe-t-il ? Sans lui, aucun code ne peut partir. */
  dossier: boolean;
  /** Aucune adresse où faire parvenir le code, ni plus tard les préavis. */
  injoignable: boolean;
}) {
  const { fmtDate, fmtDateTime } = useDates();
  const t = useT();
  const [envoi, envoiAct, envoyant] = useActionState<MandatResult | null, FormData>(envoyerCodeMandatAction, null);
  const [sign, signAct, signant] = useActionState<MandatResult | null, FormData>(signerMandatAction, null);
  const [revoc, revocAct, revoquant] = useActionState<MandatResult | null, FormData>(revoquerMandatAction, null);
  const [copie, copieAct, deposant] = useActionState<MandatResult | null, FormData>(deposerCopieMandatAction, null);
  const [fichier, setFichier] = useState("");
  const [code, setCode] = useState("");
  const [confirme, setConfirme] = useState(false);
  /* Un mandat révoqué ne se montre plus ici : sa référence se retrouve dans l'historique. */
  const m = mandats.find((x) => x.etat !== "revoque");
  if (!m) return null;

  const signe = Boolean(m.signeLe);
  const codeParti = Boolean(m.codeEnvoyeLe || envoi?.ok);
  const compteMasque = `${m.banque} ···${m.compte.replace(/\s/g, "").slice(-4)}`;
  const retire = signe ? t("Révoquer") : t("Supprimer");
  const pieceHref = m.piece ? `/moi/documents/${m.piece}?de=${encodeURIComponent("/moi/prelevements")}` : "/moi/documents/signes";
  const imprimerHref = m.piece ? hrefDeLecture(`/api/documents/${m.piece}`, { titre: `${t("Mandat")} ${m.ref}`, de: `/moi/prelevements/${m.id}` }) : "/moi/documents/signes";
  const puceClasse = m.etape === "actif" || (signe && m.etape === "a_signer") ? styles.actif : styles.attente;
  const puce = m.etape === "a_signer" ? t("à signer") : m.etat === "suspendu" ? t("arrêté") : m.etape === "copie_attendue" ? t("copie attendue") : m.etape === "en_verification" ? t("en vérification") : m.etape === "copie_refusee" ? t("copie refusée") : t("actif");
  const attendCopie = m.etape === "copie_attendue" || m.etape === "copie_refusee";

  return (
    <>
      {/* L'ANCRE DU RAPPEL : son lien renvoie ici, sur le mandat qui attend sa signature. */}
      <section className={styles.carte} id={signe ? undefined : "mandat"}>
        <span className={puceClasse}>{puce}</span>
        {/* LE RÉCAPITULATIF EN TABLEAU RESSERRÉ : tout ce que le mandat présente, et rien d'autre. Un seul nombre : celui qui est présenté à la banque, ni plus ni moins. */}
        <dl className={styles.recapTab}>
          <div>
            <dt>{t("Montant")}</dt>
            <dd>{fmt(m.montant)} FCFA</dd>
          </div>
          {m.jour != null && (
            <div>
              <dt>{t("Le")}</dt>
              <dd>{t("{j} de chaque mois", { j: String(m.jour) })}</dd>
            </div>
          )}
          {m.objet === "instruction" && m.fonds && (
            <div>
              <dt>{t("Vers")}</dt>
              <dd>{m.fonds}</dd>
            </div>
          )}
          <div>
            <dt>{t("Compte débité")}</dt>
            <dd>
              {compteMasque}
              <small>{m.titulaire}</small>
            </dd>
          </div>
          {(m.prochain ?? m.premier) && (
            <div>
              <dt>{m.prochain ? t("Prochain prélèvement") : t("Premier prélèvement")}</dt>
              <dd>{fmtDate((m.prochain ?? m.premier) as string, false)}</dd>
            </div>
          )}
        </dl>

        {!signe ? (
          <div className={styles.signer}>
            {/* LIRE LE PAPIER AVANT DE L'AUTORISER (audit des pièces signées, 27 octobre 2026) : le lien vient avant le code, parce que c'est l'ordre dans lequel on fait les choses. */}
            <p className={styles.note}>
              <Link href={hrefDeLecture(`/api/documents/mandat-apercu/${m.id}`, { titre: `${t("Mandat")} ${m.ref}`, note: t("Le mandat tel que vous le signerez. Rien n'est engagé tant que vous n'avez pas saisi le code."), de: `/moi/prelevements/${m.id}` })}>
                {t("Lire le mandat avant de le signer")} →
              </Link>
            </p>
            {/* LA PAGE ET L'ACTION DOIVENT DIRE LA MÊME CHOSE. Sans dossier, la page annonçait « le code s'affichera à l'écran » et le bouton répondait « Dossier introuvable ». */}
            <p className={styles.note}>
              {!dossier
                ? t("Votre dossier doit être ouvert avant de signer un mandat : c'est lui qui porte le canal par lequel le code vous parvient.")
                : injoignable
                  ? t("Il nous faut une adresse e-mail avant de signer : c'est là que part le code, puis l'annonce de chaque prélèvement.")
                  : canal
                    ? t(canal.parMail ? "Le code part par e-mail, à {o}" : "Le code part par WhatsApp, au {o}", { o: canal.to })
                    : t("Aucun canal d'envoi n'est configuré : le code s'affichera à l'écran.")}
            </p>
            {codeParti && (
              <>
                <Msg state={envoi} />
                {envoi?.ok && envoi.code && (
                  <div className={styles.demo}>
                    {t("Code de démonstration :")} <b className="mono">{envoi.code}</b>
                  </div>
                )}
                <form id="f-sign" action={signAct}>
                  <input type="hidden" name="id" value={m.id} />
                  <label className="field">
                    {t("Code reçu")}
                    <input name="code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" maxLength={6} placeholder={t("6 chiffres")} autoComplete="one-time-code" />
                  </label>
                </form>
                <form action={envoiAct}>
                  <input type="hidden" name="id" value={m.id} />
                  <button className="btn sm ghost" type="submit" disabled={envoyant || !dossier || injoignable}>
                    {envoyant ? "…" : t("Renvoyer un code")}
                  </button>
                </form>
              </>
            )}
            <Msg state={sign} />
          </div>
        ) : (
          <>
            {/* LA CONFIRMATION DE LA SIGNATURE SURVIT AU FORMULAIRE QU'ELLE CONFIRME (25 octobre 2026) : sans elle, la carte change d'état sans qu'une ligne le dise. */}
            {sign?.ok && sign.message ? <p className={styles.ok}>{t(sign.message)}</p> : null}
            {sign?.ok ? <Link href="/moi/regles">{t("Ce qui part tout seul")} →</Link> : null}
            {/* LA COPIE SIGNÉE À LA MAIN (15 novembre 2026) : un seul geste à la fois, et rien n'est prélevé avant la vérification. */}
            {attendCopie && (
              <form id="f-copie" action={copieAct} className={styles.signer}>
                <p className={styles.note}>
                  {m.etape === "copie_refusee"
                    ? `${t("La copie signée a été refusée.")} ${m.refus ?? ""} ${t("Renvoyez une copie signée.")}`
                    : t("Il reste à signer le document à la main, à le déposer à votre banque et à nous en envoyer une copie. Rien n'est prélevé avant sa vérification.")}{" "}
                  <Link href={imprimerHref}>{t("Lire le mandat à imprimer")} →</Link>
                </p>
                <input type="hidden" name="id" value={m.id} />
                <label className="field">
                  {t("Copie signée (PDF, photo ou scan, 10 Mo au plus)")}
                  <input type="file" name="file" accept="application/pdf,image/jpeg,image/png" onChange={(e) => setFichier(e.target.files?.[0]?.name ?? "")} />
                </label>
                <Msg state={copie} />
              </form>
            )}
            {m.etape === "en_verification" && <p className={styles.note}>{t("Copie reçue : nous la vérifions. Le prélèvement part dès qu'elle est validée.")}</p>}
            {m.prochain && <p className={styles.note}>{t("prochain prélèvement le {d}, annoncé {n} jours avant", { d: fmtDate(m.prochain, false), n: String(PREAVIS_JOURS) })}</p>}
            <p className={styles.note}>{t("Signé le {d}. Votre banque peut vous demander cet exemplaire.", { d: fmtDateTime(m.signeLe as string) })}</p>
          </>
        )}
        <Msg state={revoc} />
      </section>

      {/* LA BARRE DU BAS, TOUJOURS VISIBLE : le geste qui attend, et « Supprimer » ou « Révoquer » à côté. La suppression se confirme sur place, dans la barre. */}
      <form id="f-revoc" action={revocAct}>
        <input type="hidden" name="id" value={m.id} />
      </form>
      <form id="f-envoi" action={envoiAct}>
        <input type="hidden" name="id" value={m.id} />
      </form>
      <BarreDEtape indice={confirme ? (signe ? t("Révoquer ce mandat ? Rien ne sera plus prélevé.") : t("Supprimer ce mandat ? Il ne sera jamais prélevé.")) : undefined}>
        {confirme ? (
          <>
            <button className={`btn primary ${barre.suivant}`} type="submit" form="f-revoc" disabled={revoquant}>
              {revoquant ? "…" : signe ? t("Oui, révoquer") : t("Oui, supprimer")}
            </button>
            <button className={`btn ${barre.retour}`} type="button" onClick={() => setConfirme(false)}>
              {t("Annuler")}
            </button>
          </>
        ) : (
          <>
            {!signe && !codeParti && (
              <button className={`btn primary ${barre.suivant}`} type="submit" form="f-envoi" disabled={envoyant || !dossier || injoignable}>
                {envoyant ? "…" : t("Recevoir mon code")}
              </button>
            )}
            {!signe && codeParti && (
              <button className={`btn primary ${barre.suivant}`} type="submit" form="f-sign" disabled={signant || code.length < 6}>
                {signant ? "…" : t("Je signe ce mandat")}
              </button>
            )}
            {attendCopie && (
              <button className={`btn primary ${barre.suivant}`} type="submit" form="f-copie" disabled={deposant || !fichier}>
                {deposant ? "…" : t("Envoyer ma copie signée")}
              </button>
            )}
            {m.etape === "actif" && (
              <Link className={`btn primary ${barre.suivant}`} href={pieceHref}>
                {t("Lire mon exemplaire")}
              </Link>
            )}
            <button className={`btn ${m.etape === "en_verification" ? barre.suivant : barre.retour}`} type="button" onClick={() => setConfirme(true)}>
              {retire}
            </button>
          </>
        )}
      </BarreDEtape>
    </>
  );
}
