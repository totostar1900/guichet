"use client";

import { useActionState, useState } from "react";
import { useT } from "@/i18n/client";
import { Select } from "@/components/ui/Select";
import type { Closure, Mandate } from "@/lib/domain/kyc";
import { fmt, fmtDate, fmtDateTime } from "@/lib/format";
import { closureStepAction, complaintDeskAction, couponNoticeAction, mandateAction, mandateStatusAction, transferAction, type ActResult } from "./acts-actions";
import styles from "./page.module.css";

/** A position of the client, as the panel needs it: the line and its flows already due. */
export interface ActPosition {
  isin: string;
  title: string;
  units: number;
  unitWord: string;
  nominalAmount: number;
  paid: { date: string; amount: number; label: string; docNumber?: string; docId?: string }[];
}

/** An intention of the client the complaint form can point at. */
export interface ActOperation {
  ref: string;
  label: string;
}

type Open = "" | "mandat" | "coupon" | "transfert" | "recl";

function Msg({ state }: { state: ActResult | null }) {
  if (!state) return null;
  return (
    <p className={state.ok ? styles.okMsg : styles.errMsg}>
      {state.ok ? state.message : state.error}
      {state.ok && state.docId && (
        <>
          {" "}
          <a href={`/desk/documents/pdf/${state.docId}`} target="_blank" rel="noreferrer">
            PDF
          </a>
        </>
      )}
    </p>
  );
}

/**
 * « Actes et avis » on a client file: the mandate given to a third party, the
 * coupon / redemption notices, the transfer or closure order, a complaint
 * the desk received. Every act opens its own small form; each produces a
 * numbered document listed under « Documents émis ».
 */
export function ClientActs({ fileId, clientId, status, mandataires, mandates, closure, positions, operations, custodianAccount }: { fileId: string; clientId: string; status: string; mandataires: { name: string; idNumber?: string }[]; mandates: Mandate[]; closure?: Closure; positions: ActPosition[]; operations: ActOperation[]; custodianAccount?: string }) {
  const t = useT();
  const [open, setOpen] = useState<Open>("");
  const [flow, setFlow] = useState<{ isin: string; date: string } | null>(null);
  const [mState, mAction, mPending] = useActionState<ActResult | null, FormData>(mandateAction, null);
  const [msState, msAction] = useActionState<ActResult | null, FormData>(mandateStatusAction, null);
  const [cState, cAction, cPending] = useActionState<ActResult | null, FormData>(couponNoticeAction, null);
  const [tState, tAction, tPending] = useActionState<ActResult | null, FormData>(transferAction, null);
  const [csState, csAction, csPending] = useActionState<ActResult | null, FormData>(closureStepAction, null);
  const [rState, rAction, rPending] = useActionState<ActResult | null, FormData>(complaintDeskAction, null);
  const active = status === "approuve";
  const pendingFlows = positions.flatMap((p) => p.paid.filter((f) => !f.docNumber).map((f) => ({ ...f, isin: p.isin, title: p.title })));
  const unsignedMandate = mandataires.filter((m) => !mandates.some((x) => x.personName === m.name && x.status !== "revoque"));
  const toggle = (k: Open) => setOpen((o) => (o === k ? "" : k));
  const chosen = flow ? pendingFlows.find((f) => f.isin === flow.isin && f.date === flow.date) : undefined;
  return (
    <div className={styles.acts}>
      <h3>{t("Actes et avis")}</h3>
      <div className={styles.actGrid}>
        <div className={styles.act}>
          <b>{t("Mandat")}</b>
          <p>
            {mandates.filter((m) => m.status === "signe").length > 0 ? t("{n} mandat(s) signé(s)", { n: String(mandates.filter((m) => m.status === "signe").length) }) : unsignedMandate.length > 0 ? t("{n} mandataire(s) déclaré(s) sans mandat signé : leurs ordres seraient refusés.", { n: String(unsignedMandate.length) }) : t("Un tiers qui passe les ordres du client doit tenir un mandat signé des deux.")}
          </p>
          <button type="button" className="btn sm primary" onClick={() => toggle("mandat")} disabled={!active}>
            {t("Établir un mandat")}
          </button>
        </div>
        <div className={styles.act}>
          <b>{t("Avis de coupon · remboursement")}</b>
          <p>{pendingFlows.length ? t("{n} flux payé(s) sans avis.", { n: String(pendingFlows.length) }) : t("Tous les flux payés ont leur avis.")}</p>
          <button type="button" className={`btn sm ${pendingFlows.length ? "primary" : ""}`} onClick={() => toggle("coupon")} disabled={!pendingFlows.length}>
            {t("Émettre un avis")}
          </button>
        </div>
        <div className={styles.act}>
          <b>{t("Transfert · clôture")}</b>
          <p>{closure ? `${closure.docNumber ?? ""} · ${closure.confirmedAt ? t("confirmé le {d}", { d: fmtDate(closure.confirmedAt) }) : closure.signedAt ? t("signé le {d}, en attente du dépositaire", { d: fmtDate(closure.signedAt) }) : t("préparé, en attente de signature")}` : t("Prépare l'ordre que le client signe ; le dossier passe en clôture jusqu'à la confirmation du dépositaire.")}</p>
          <button type="button" className="btn sm" onClick={() => toggle("transfert")} disabled={!active && !closure}>
            {closure ? t("Suivre") : t("Transférer ou clôturer")}
          </button>
        </div>
        <div className={styles.act}>
          <b>{t("Réclamation")}</b>
          <p>{t("Le client dépose la sienne depuis Mon espace ; ici, celles reçues par appel, WhatsApp, e-mail ou courrier.")}</p>
          <button type="button" className="btn sm ghost" onClick={() => toggle("recl")}>
            {t("Enregistrer une réclamation")}
          </button>
        </div>
      </div>

      {mandates.length > 0 && (
        <ul className={styles.actList}>
          {mandates.map((m) => (
            <li key={m.id}>
              <span>
                <b>{m.personName}</b> · {m.docNumber} · {m.scope.orders ? (m.scope.fundsOnly ? t("ordres sur les fonds") : t("ordres")) : ""}
                {m.scope.orders && m.scope.notices ? " · " : ""}
                {m.scope.notices ? t("avis") : ""}
                {m.until ? ` · ${t("jusqu'au")} ${fmtDate(m.until)}` : ""} · <span className={`st ${m.status === "signe" ? "reglee" : m.status === "revoque" ? "annulee" : "recue"}`}>{t(m.status === "signe" ? "signé" : m.status === "revoque" ? "révoqué" : "à signer")}</span>
              </span>
              {m.status !== "revoque" && (
                <form action={msAction} className={styles.inline}>
                  <input type="hidden" name="fileId" value={fileId} />
                  <input type="hidden" name="mandateId" value={m.id} />
                  {m.status === "prepare" && (
                    <button type="submit" name="status" value="signe" className="btn sm">
                      {t("Signé des deux parties")}
                    </button>
                  )}
                  <button type="submit" name="status" value="revoque" className="btn sm ghost">
                    {t("Révoquer")}
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
      <Msg state={msState} />

      {open === "mandat" && (
        <form action={mAction} className={styles.actForm}>
          <input type="hidden" name="fileId" value={fileId} />
          <div className={styles.row3}>
            <label>
              <span>{t("Mandataire")}</span>
              <input name="personName" list={`mand-${fileId}`} defaultValue={unsignedMandate[0]?.name ?? ""} required minLength={3} />
              <datalist id={`mand-${fileId}`}>
                {mandataires.map((m) => (
                  <option key={m.name} value={m.name} />
                ))}
              </datalist>
            </label>
            <label>
              <span>{t("Pièce d'identité (n°)")}</span>
              <input name="idNumber" defaultValue={unsignedMandate[0]?.idNumber ?? ""} />
            </label>
            <label>
              <span>{t("Lien avec le client")}</span>
              <input name="relation" placeholder={t("frère, associé, gérant…")} />
            </label>
          </div>
          <div className={styles.row3}>
            <label className={styles.actCheck}>
              <input type="checkbox" name="orders" defaultChecked /> {t("passer des ordres")}
            </label>
            <label className={styles.actCheck}>
              <input type="checkbox" name="notices" defaultChecked /> {t("recevoir les avis et relevés")}
            </label>
            <label className={styles.actCheck}>
              <input type="checkbox" name="fundsOnly" /> {t("limiter aux fonds OPCVM")}
            </label>
          </div>
          <label>
            <span>{t("Jusqu'au (vide : jusqu'à révocation)")}</span>
            <input type="date" name="until" />
          </label>
          <p className="muted">{t("Les fonds ne sortent jamais vers le mandataire : produits et coupons vont au compte de règlement du client. Le mandat part au client par son canal ; marquez « signé » à réception des deux signatures.")}</p>
          <div className={styles.actFoot}>
            <button type="button" className="btn sm ghost" onClick={() => setOpen("")}>
              {t("Annuler")}
            </button>
            <button type="submit" className="btn sm primary" disabled={mPending}>
              {mPending ? "…" : t("Établir le mandat")}
            </button>
          </div>
          <Msg state={mState} />
        </form>
      )}

      {open === "coupon" && (
        <form action={cAction} className={styles.actForm}>
          <input type="hidden" name="clientId" value={clientId} />
          <label>
            <span>{t("Flux payé sans avis")}</span>
            <Select
              block
              name="flowPick"
              required
              placeholder={t("Choisir…")}
              value={flow ? `${flow.isin}|${flow.date}` : ""}
              onChange={(v) => {
                const [isin, date] = v.split("|");
                setFlow(isin ? { isin, date } : null);
              }}
              options={pendingFlows.map((f) => ({ value: `${f.isin}|${f.date}`, label: `${f.title} · ${f.label} ${fmtDate(f.date)}`, hint: `${fmt(f.amount)} FCFA` }))}
            />
          </label>
          <input type="hidden" name="isin" value={flow?.isin ?? ""} />
          <input type="hidden" name="date" value={flow?.date ?? ""} />
          <div className={styles.row3}>
            <label>
              <span>{t("Payé le (relevé bancaire, facultatif)")}</span>
              <input type="date" name="paidOn" />
            </label>
            <label>
              <span>{t("Envoyer par")}</span>
              <Select block name="send" value="auto" options={[{ value: "auto", label: t("canal préféré, s'il est prouvé") }, { value: "whatsapp", label: "WhatsApp" }, { value: "email", label: "E-mail" }, { value: "none", label: t("ne pas envoyer, garder au dossier") }]} />
            </label>
            <label>
              <span>{t("Note sur l'avis (facultatif)")}</span>
              <input name="note" maxLength={160} placeholder={t("ex. montant net après retenue…")} />
            </label>
          </div>
          {chosen && <p className="muted">{t("Montant brut d'après l'échéancier : {a} FCFA. Corrigez seulement si l'émetteur a payé autre chose, la note ira sur l'avis.", { a: fmt(chosen.amount) })}</p>}
          <div className={styles.actFoot}>
            <button type="button" className="btn sm ghost" onClick={() => setOpen("")}>
              {t("Annuler")}
            </button>
            <button type="submit" className="btn sm primary" disabled={cPending || !flow}>
              {cPending ? "…" : t("Émettre l'avis")}
            </button>
          </div>
          <Msg state={cState} />
        </form>
      )}

      {open === "transfert" && !closure && (
        <form action={tAction} className={styles.actForm}>
          <input type="hidden" name="fileId" value={fileId} />
          <div className={styles.row3}>
            <label>
              <span>{t("Portée")}</span>
              <Select block name="scope" value={positions.length ? "tout" : "vide"} options={[{ value: "tout", label: t("Toutes les positions et clôture du compte") }, { value: "partiel", label: t("Certaines positions, le compte reste ouvert") }, { value: "vide", label: t("Clôture sans position (compte vide)") }]} />
            </label>
            <label>
              <span>{t("Établissement de destination")}</span>
              <input name="destination" placeholder={t("société de bourse · dépositaire")} />
            </label>
            <label>
              <span>{t("Compte de destination")}</span>
              <input name="destinationAccount" placeholder={t("n° de compte-titres")} />
            </label>
          </div>
          {positions.length > 0 && (
            <div className={styles.actChecks}>
              <span>{t("Lignes (pour un transfert partiel)")} :</span>
              {positions.map((p) => (
                <label key={p.isin} className={styles.actCheck}>
                  <input type="checkbox" name="isin" value={p.isin} /> {p.title} · {fmt(p.units)} {p.unitWord}
                </label>
              ))}
            </div>
          )}
          <label>
            <span>{t("Motif (facultatif, pour le journal)")}</span>
            <input name="reason" maxLength={160} />
          </label>
          <p className="muted">{t("L'ordre part au client pour signature ; à la signature le dossier passe « en clôture » et les nouvelles intentions sont refusées ; « clos » à la confirmation du dépositaire, relevé final joint.")}</p>
          <div className={styles.actFoot}>
            <button type="button" className="btn sm ghost" onClick={() => setOpen("")}>
              {t("Annuler")}
            </button>
            <button type="submit" className="btn sm primary" disabled={tPending}>
              {tPending ? "…" : t("Préparer l'ordre")}
            </button>
          </div>
          <Msg state={tState} />
        </form>
      )}

      {open === "transfert" && closure && (
        <div className={styles.actForm}>
          <p>
            <b>{closure.docNumber}</b> · {closure.scope === "tout" ? t("toutes les positions et clôture") : closure.scope === "partiel" ? t("transfert partiel") : t("clôture sans position")}
            {closure.destination ? ` → ${closure.destination}${closure.destinationAccount ? ` · ${closure.destinationAccount}` : ""}` : ""} · {t("préparé le {d}", { d: fmtDateTime(closure.requestedAt) })}
            {closure.signedAt ? ` · ${t("signé le {d}", { d: fmtDateTime(closure.signedAt) })}` : ""}
            {closure.confirmedAt ? ` · ${t("confirmé le {d}", { d: fmtDateTime(closure.confirmedAt) })}` : ""}
          </p>
          {custodianAccount && (
            <p className="muted">
              {t("Compte-titres")} {custodianAccount}
            </p>
          )}
          <form action={csAction} className={styles.actFoot}>
            <input type="hidden" name="fileId" value={fileId} />
            {!closure.signedAt && (
              <button type="submit" name="step" value="signe" className="btn sm primary" disabled={csPending}>
                {t("Ordre signé par le client")}
              </button>
            )}
            {closure.signedAt && !closure.confirmedAt && (
              <button type="submit" name="step" value="confirme" className="btn sm primary" disabled={csPending}>
                {t("Transfert confirmé par le dépositaire")}
              </button>
            )}
            {!closure.confirmedAt && (
              <button type="submit" name="step" value="abandon" className="btn sm ghost" disabled={csPending}>
                {t("Abandonner l'ordre")}
              </button>
            )}
          </form>
          <Msg state={csState} />
        </div>
      )}

      {open === "recl" && (
        <form action={rAction} className={styles.actForm}>
          <input type="hidden" name="fileId" value={fileId} />
          <div className={styles.row3}>
            <label>
              <span>{t("Reçue par")}</span>
              <Select block name="receivedVia" value="Appel" options={["Appel", "WhatsApp", "E-mail", "Courrier", "Agence"].map((v) => ({ value: v, label: v }))} />
            </label>
            <label className={styles.span2}>
              <span>{t("Opération concernée")}</span>
              <Select block name="operation" value="" options={[{ value: "", label: t("Aucune en particulier") }, ...operations.map((o) => ({ value: o.label, label: o.label, hint: o.ref }))]} />
            </label>
          </div>
          <label>
            <span>{t("Les faits, avec les mots du client")}</span>
            <textarea name="facts" rows={3} required minLength={10} />
          </label>
          <label>
            <span>{t("Ce que le client demande")}</span>
            <textarea name="ask" rows={2} required minLength={5} />
          </label>
          <div className={styles.actFoot}>
            <button type="button" className="btn sm ghost" onClick={() => setOpen("")}>
              {t("Annuler")}
            </button>
            <button type="submit" className="btn sm primary" disabled={rPending}>
              {rPending ? "…" : t("Enregistrer et accuser réception")}
            </button>
          </div>
          <Msg state={rState} />
        </form>
      )}
    </div>
  );
}
