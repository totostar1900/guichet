"use client";

import Link from "next/link";
import { useActionState, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { IntentResult } from "@/app/offres/[id]/actions";
import { checkPhoneProof, guestSendEmailCode, guestVerifyEmailCode, sendPhoneProof, submitIntent } from "@/app/offres/[id]/actions";
import type { ChannelStatus } from "@/lib/domain/types";
import { normalizePhone } from "@/lib/format";
import { estimate } from "@/lib/domain/estimate";
import { orderChecks } from "@/lib/domain/checks";
import { Info } from "./Info";
import { INTENT_LABEL } from "@/lib/domain/intent";
import type { IntentType, Offer } from "@/lib/domain/types";
import { fmt, parseAmount, parseUnits } from "@/lib/format";
import styles from "./IntentForm.module.css";
import { useT } from "@/i18n/client";

const DONE: Record<IntentType, (by: string) => string> = {
  ferme: (by) => `Votre prise ferme est dans le carnet. Un conseiller vous confirme ${by} avant la clôture et vous envoie le bulletin à signer.`,
  appetit: (by) => `Votre appétit est noté ; le desk vous rappelle ${by} avant la clôture pour arrêter le montant.`,
  cession: (by) => `Votre demande de cession est enregistrée. Nous vérifions la position et vous confirmons ${by}.`,
  rappel: (by) => `Nous vous prévenons ${by} dès l'ouverture.`,
  info: (by) => `Un conseiller vous répond ${by} dans l'heure.`,
  achat: (by) => `Votre ordre d'achat est enregistré. Un conseiller le confirme ${by}, vous envoie l'ordre de bourse à signer et l'appel de fonds ; exécution au marché, règlement T+3.`,
  vente: (by) => `Votre ordre de vente est enregistré. Un conseiller vérifie votre position et vous confirme ${by} ; produit crédité après règlement.`,
  souscription: (by) => `Votre souscription est enregistrée. Un conseiller vous confirme ${by}, vous envoie le bulletin de souscription et l'appel de fonds ; les parts sont inscrites à votre nom chez le dépositaire à la prochaine VL.`,
  rachat: (by) => `Votre demande de rachat est enregistrée. Un conseiller vérifie vos parts et vous confirme ${by} ; le produit est viré après la VL de rachat.`,
};
const BY: Record<string, string> = { WhatsApp: "sur WhatsApp", Appel: "par téléphone", "E-mail": "par e-mail" };

/** Secondary market: the amount field is a quantity. */
function marketEstimate(o: Offer, qty: number, type: IntentType): string {
  if (!qty) return "Indiquez une quantité pour voir l'estimation au cours de référence.";
  const isBond = o.instrument === "obligation";
  const ref = type === "vente" ? (o.bid ?? o.lastPrice ?? 0) : (o.ask ?? o.lastPrice ?? 0);
  const unit = isBond ? (o.nominal * ref) / 100 : ref;
  if (o.lotSize && qty < o.lotSize) return `Quantité minimale : ${o.lotSize}.`;
  const gross = qty * unit;
  return `${fmt(qty)} ${isBond ? "titres" : "actions"} × ${isBond ? `${ref} %` : `${fmt(ref)} FCFA`} = ${fmt(gross)} FCFA ${type === "vente" ? "encaissés" : "à décaisser"} · prix d'exécution selon le marché`;
}

/** Fund redemption: the amount field is a number of units. */
function redemptionEstimate(o: Offer, units: number): string {
  if (!o.fund) return "";
  if (!units) return "Indiquez un nombre de parts pour voir l'estimation à la dernière VL.";
  const gross = units * o.fund.nav;
  const fee = gross * (o.fund.exitFeePct / 100);
  return `${units.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} parts × VL ${fmt(o.fund.nav)} FCFA = ${fmt(gross)} FCFA${fee ? ` · frais du fonds à la sortie ${fmt(fee)}` : ""} · net ≈ ${fmt(gross - fee)} FCFA à la VL de rachat`;
}

/**
 * The proof of a channel, inline: a six-digit code sent on the channel and
 * typed here, once. The phone (WhatsApp) is proven by Guichet's own code; a
 * guest's e-mail by the sign-in code, which also creates the account.
 */
function ProofBlock({ kind, target, onProven, demo }: { kind: "phone" | "email"; target: string; onProven: (target: string) => void; demo?: string }) {
  const t = useT();
  const router = useRouter();
  const [sent, setSent] = useState<"idle" | "sent">("idle");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ error?: string; demo?: string } | null>(demo ? { demo } : null);
  const [pending, start] = useTransition();
  const send = () =>
    start(async () => {
      const r = kind === "phone" ? await sendPhoneProof(target) : await guestSendEmailCode(target);
      if (!r.ok) {
        setMsg({ error: r.error });
        return;
      }
      setSent("sent");
      setMsg("demoCode" in r && r.demoCode ? { demo: r.demoCode } : null);
    });
  const check = () =>
    start(async () => {
      if (kind === "phone") {
        const r = await checkPhoneProof(target, code);
        if (!r.ok) {
          setMsg({ error: r.error });
          return;
        }
        onProven(normalizePhone(target));
      } else {
        const r = await guestVerifyEmailCode(target, code);
        if (!r.ok) {
          setMsg({ error: r.error });
          return;
        }
        onProven(target.trim().toLowerCase());
        router.refresh(); // the session now exists: the page comes back signed in
      }
    });
  return (
    <div className={styles.proof} aria-live="polite">
      {sent === "idle" ? (
        <>
          <span>{t(kind === "phone" ? "Ce numéro n'est pas encore prouvé : un code arrive sur WhatsApp, une seule fois." : "Un code arrive sur cet e-mail : il vous connecte, et crée votre compte s'il n'existe pas.")}</span>
          <button type="button" className="btn sm primary" disabled={pending || !target} onClick={send}>
            {t(pending ? "Envoi…" : kind === "phone" ? "Recevoir le code sur WhatsApp" : "Recevoir le code par e-mail")}
          </button>
        </>
      ) : (
        <>
          <span>{t(kind === "phone" ? "Le code à six chiffres reçu sur WhatsApp :" : "Le code à six chiffres reçu par e-mail :")}</span>
          <div className={styles.proofRow}>
            <input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="000000" aria-label={t("Code à six chiffres")} />
            <button type="button" className="btn sm primary" disabled={pending || code.length !== 6} onClick={check}>
              {t(pending ? "Vérification…" : "Valider")}
            </button>
          </div>
          <button type="button" className={styles.linkBtn} disabled={pending} onClick={send}>
            {t("Renvoyer le code")}
          </button>
        </>
      )}
      {msg?.error && <em className={styles.proofError}>{msg.error}</em>}
      {msg?.demo && <em className={styles.proofDemo}>{t("Serveur de démonstration, code :")} {msg.demo}</em>}
    </div>
  );
}

export function IntentForm({ offer, types, initialType, initialAmount, held = 0, priceText, past, signedIn, tier = 0, phone = "", email = "", name = "", channels }: { offer: Offer; types: IntentType[]; initialType: IntentType; initialAmount?: number; held?: number; priceText: string; past: boolean; signedIn: boolean; tier?: number; phone?: string; email?: string; name?: string; channels?: ChannelStatus }) {
  // The profile name is "Prénom Nom" when the client typed it, or an e-mail stub otherwise.
  const nameParts = name.trim().split(/\s+/).filter(Boolean);
  const [firstName, lastName] = nameParts.length >= 2 ? [nameParts[0], nameParts.slice(1).join(" ")] : ["", ""];
  const [state, action, pending] = useActionState<IntentResult | null, FormData>(submitIntent, null);
  const t = useT();
  const fmtUnits = (v: number) => (offer.kind === "FONDS" ? v.toLocaleString("fr-FR", { maximumFractionDigits: 3 }) : fmt(v));
  const [amount, setAmount] = useState(initialAmount ? fmtUnits(initialAmount) : "");
  const [type, setType] = useState<IntentType>(initialType);
  const [limit, setLimit] = useState("");
  const [channel, setChannel] = useState<"WhatsApp" | "Appel" | "E-mail">("WhatsApp");
  const [who, setWho] = useState({ firstName, lastName, phone: phone || channels?.phone || "", email });
  // The proofs: the phone as proven on the profile (or just now), the e-mail as the session's (or just proven by a guest).
  const [provenPhone, setProvenPhone] = useState<string | null>(channels?.phoneVerifiedAt && channels.phone ? channels.phone : null);
  const [provenEmail, setProvenEmail] = useState<string | null>(signedIn && email ? email.toLowerCase() : null);
  const phoneOk = Boolean(provenPhone && normalizePhone(who.phone) === provenPhone);
  // A session without e-mail (the dev backend) proves nothing: any well-formed e-mail passes there.
  const emailOk = signedIn && !email ? who.email.includes("@") : Boolean(provenEmail && who.email.trim().toLowerCase() === provenEmail);
  const ready = signedIn && phoneOk && emailOk;
  // On a phone the form is read in three steps (montant → coordonnées → récapitulatif); desktop shows everything.
  const [step, setStep] = useState(1);
  const formRef = useRef<HTMLFormElement>(null);
  const goTo = (n: number) => {
    if (n > step && formRef.current) {
      // Every field of the current step must be valid before moving on.
      const fields = formRef.current.querySelectorAll<HTMLInputElement>(`[data-step="${step}"] input, [data-step="${step}"] textarea`);
      for (const el of fields) {
        if (!el.checkValidity()) {
          el.reportValidity();
          return;
        }
      }
      if (step === 1 && needsAmount && (!parse(amount) || blocked)) {
        formRef.current.querySelector<HTMLInputElement>('input[name="amount"]')?.focus();
        return;
      }
    }
    setStep(n);
    formRef.current?.closest("aside")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const parse = (s: string) => (offer.kind === "FONDS" && type === "rachat" ? parseUnits(s) : parseAmount(s));
  const est = estimate(offer, parse(amount));
  const needsAmount = type === "ferme" || type === "cession" || type === "appetit" || type === "achat" || type === "vente" || type === "souscription" || type === "rachat";
  const market = offer.kind === "MARCHE";
  // Consistency of the order as typed: minimum, whole titles, quotité, limit price, position held.
  const limitNum = limit ? Number(limit.replace(",", ".")) : null;
  const checks = needsAmount && parse(amount) ? orderChecks(offer, type, parse(amount), limitNum && !isNaN(limitNum) ? limitNum : null, { held: (type === "vente" || type === "rachat") && held > 0 ? held : undefined, needsAccount: signedIn && tier < 2 && (type === "ferme" || type === "cession" || type === "achat" || type === "vente") }).filter((c) => c.level !== "ok") : [];
  const blocked = checks.some((c) => c.level === "block");

  if (state?.ok) {
    return (
      <div className={styles.wrap}>
        <div className={styles.done}>
          <b>{t("Reçu : réf.")} {state.ref}</b>
          {t(DONE[state.type]("{by}"), { by: t(BY[state.channel]) })}
          <ul className={styles.steps}>
            <li>
              {t("Accusé de réception envoyé sur WhatsApp au")} <b>{state.phone}</b> {t("et par e-mail à")} <b>{state.email}</b>
              {state.sent.some((x) => x.status === "skipped") ? t(" (envoi automatique en cours d'activation : le desk vous écrit à la main)") : state.sent.some((x) => x.status === "failed") ? t(" : un envoi a échoué, le desk vous recontacte") : ""}.
            </li>
            <li>{t("Un conseiller vous confirme {by} : vérifiez que ce numéro reçoit bien les appels et WhatsApp.", { by: t(BY[state.channel]) })}</li>
            <li>{t("Le bulletin à signer et l'appel de fonds arrivent par e-mail ; l'exécution vous est confirmée sur les deux canaux.")}</li>
          </ul>
          {state.needsAccount && (
            <div className={styles.needAccount}>
              {t("Pour transmettre cet ordre, votre compte-titres doit être ouvert : dix minutes sur votre téléphone.")}{" "}
              <Link className="btn primary sm" href={`/ouvrir-un-compte?next=${encodeURIComponent(`/offres/${offer.id}`)}`}>
                {t("Ouvrir mon compte")}
              </Link>
            </div>
          )}
          <div className={styles.doneActions}>
            <Link className="btn sm" href={`/offres/${offer.id}`}>
              {t("Autre intention")}
            </Link>
            <Link className="btn sm ghost" href="/desk">
              {t("Voir dans le desk")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const amtLabel = t(market ? (offer.instrument === "obligation" ? "Quantité (titres)" : "Quantité (actions)") : offer.kind === "FONDS" ? (type === "rachat" ? "Parts à racheter" : "Montant (FCFA)") : offer.kind === "ACTIONS" ? "Montant (FCFA)" : offer.kind === "RACHAT" ? "Titres à céder" : offer.kind === "BTA" ? "Montant (FCFA)" : "Montant nominal (FCFA)");

  return (
    <div className={styles.wrap}>
      <h3 className="display">{t(past ? "Une question sur cette ligne ?" : "Votre intention sur cette ligne")}</h3>
      {!past && <div className={styles.priceLine}>{priceText}</div>}
      <form action={action} ref={formRef} data-at={step} className={styles.form}>
        <input type="hidden" name="offerId" value={offer.id} />
        <div className={styles.stepBar} aria-hidden="true">
          {[1, 2, 3].map((n) => (
            <i key={n} className={n <= step ? styles.stepDone : undefined} />
          ))}
        </div>
        <div className={styles.stepTitle}>{t(step === 1 ? "1 · Votre demande" : step === 2 ? "2 · Vos coordonnées" : "3 · Récapitulatif")}</div>
        <div data-step="1">
        <div className={styles.radio}>
          {types.map((it) => (
            <label key={it}>
              <input type="radio" name="type" value={it} checked={type === it} onChange={() => setType(it)} />
              {t(INTENT_LABEL[it])}
            </label>
          ))}
        </div>
        <div className={styles.row}>
          {needsAmount ? (
            <label className="field">
              {amtLabel}
              <input
                name="amount"
                inputMode="numeric"
                placeholder={offer.kind === "RACHAT" ? "500" : "10 000 000"}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onBlur={() => amount && setAmount(type === "rachat" ? fmtUnits(parse(amount)) : fmt(parse(amount)))}
              />
              {held > 0 && (type === "vente" || type === "rachat") && (
                <small className={styles.held}>
                  {t("Vous détenez")} {fmtUnits(held)} {t(offer.kind === "FONDS" ? "parts" : offer.instrument === "obligation" ? "titres" : "actions")} ·{" "}
                  <button type="button" className={styles.linkBtn} onClick={() => setAmount(fmtUnits(held))}>
                    {t(type === "rachat" ? "tout racheter" : "tout vendre")}
                  </button>
                </small>
              )}
            </label>
          ) : (
            <span />
          )}
          {market && (type === "achat" || type === "vente") && (
            <label className="field">
              {t("Prix limite (facultatif)")} : {t(offer.instrument === "obligation" ? "% du nominal" : "FCFA par action")}
              <input name="limitPrice" type="number" step={offer.instrument === "obligation" ? "0.001" : "1"} placeholder={String(offer.lastPrice ?? "")} value={limit} onChange={(e) => setLimit(e.target.value)} />
            </label>
          )}
        </div>
        {needsAmount && <div className={`${styles.estimate} ${est.ok ? "" : styles.estimateOff}`}>{t(market ? marketEstimate(offer, parseAmount(amount), type) : offer.kind === "FONDS" && type === "rachat" ? redemptionEstimate(offer, parse(amount)) : est.text)}</div>}
        {checks.length > 0 && (
          <ul className={styles.checks} aria-live="polite">
            {checks.map((c) => (
              <li key={c.key} className={c.level === "block" ? styles.checkBlock : styles.checkWarn}>
                <span>{t(c.text)}</span> <Info text={t(c.why)} label={t(c.level === "block" ? "Pourquoi l'ordre ne passe pas" : "Pourquoi ce message")} subtle />
              </li>
            ))}
          </ul>
        )}
        {signedIn && tier < 2 && (type === "souscription" || type === "rachat") && (
          <div className={styles.tierNote}>
            {t("Souscrire à un fonds demande un dossier client approuvé (les parts sont inscrites à votre nom chez le dépositaire). Envoyez votre intention, elle est gardée, puis")}{" "}
            <Link href={`/ouvrir-un-compte?next=${encodeURIComponent(`/offres/${offer.id}`)}`}>{t("complétez votre dossier")}</Link> (10 min).
          </div>
        )}
        {signedIn && tier < 2 && (type === "ferme" || type === "cession" || type === "achat" || type === "vente") && (
          <div className={styles.tierNote}>
            {t("Prises fermes, cessions et ordres de bourse demandent un compte-titres ouvert. Envoyez quand même votre intention, elle est gardée, puis")}{" "}
            <Link href={`/ouvrir-un-compte?next=${encodeURIComponent(`/offres/${offer.id}`)}`}>{t("ouvrez votre compte")}</Link> (10 min).
          </div>
        )}
        </div>
        <div data-step="2">
        <fieldset className={styles.contact}>
          <legend>{t("Vos coordonnées")}</legend>
          <div className={styles.row}>
            <label className="field">
              <span>
                {t("Prénom")} <em className={styles.req}>· {t("requis")}</em>
              </span>
              <input name="firstName" autoComplete="given-name" placeholder={t("Prénom")} value={who.firstName} onChange={(e) => setWho({ ...who, firstName: e.target.value })} required minLength={2} />
            </label>
            <label className="field">
              <span>
                {t("Nom")} <em className={styles.req}>· {t("requis")}</em>
              </span>
              <input name="lastName" autoComplete="family-name" placeholder={t("Nom")} value={who.lastName} onChange={(e) => setWho({ ...who, lastName: e.target.value })} required minLength={2} />
            </label>
          </div>
          <div className={styles.row}>
            <label className="field">
              <span>
                {t("Téléphone (WhatsApp)")} <em className={styles.req}>· {t("requis")}</em>
              </span>
              <input name="contactPhone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+237 6 87 67 67 67" value={who.phone} onChange={(e) => setWho({ ...who, phone: e.target.value })} required pattern="[+0-9 ().-]{8,}" title={t("Numéro avec indicatif, ex. +237 6 87 67 67 67")} />
              {phoneOk && <em className={styles.proven}>✓ {t("prouvé")}</em>}
            </label>
            <label className="field">
              <span>
                E-mail <em className={styles.req}>· {t("requis")}</em>
              </span>
              <input name="contactEmail" type="email" inputMode="email" autoComplete="email" placeholder="vous@exemple.com" value={who.email} onChange={(e) => setWho({ ...who, email: e.target.value })} required readOnly={Boolean(signedIn && provenEmail)} />
              {emailOk && <em className={styles.proven}>✓ {t("prouvé")}</em>}
            </label>
          </div>
          {!signedIn && !emailOk && <ProofBlock kind="email" target={who.email} onProven={setProvenEmail} />}
          {signedIn && Boolean(email) && !emailOk && <em className={styles.proofError}>{t("L'e-mail est celui de votre connexion ; pour en changer, passez par Mon espace › Sécurité.")}</em>}
          {signedIn && emailOk && !phoneOk && who.phone.replace(/\D/g, "").length >= 8 && <ProofBlock kind="phone" target={who.phone} onProven={setProvenPhone} />}
          {!signedIn && emailOk && <em className={styles.proofDemo}>{t("Connexion en cours…")}</em>}
          <div className={styles.channelLbl}>{t("Me joindre par")}</div>
          <div className={styles.channels}>
            {(["WhatsApp", "Appel", "E-mail"] as const).map((c) => (
              <label key={c}>
                <input type="radio" name="channel" value={c} checked={channel === c} onChange={() => setChannel(c)} />
                {t(c)}
              </label>
            ))}
          </div>
          <p className={styles.procedure}>
            {t("Prénom et nom tels que sur votre pièce d'identité (ils figurent sur le bulletin). E-mail et WhatsApp sont prouvés par un code, une seule fois : accusé de réception immédiat sur les deux, confirmation d'un conseiller {by}, bulletin à signer par e-mail. En donnant ce numéro, vous acceptez d'être contacté sur WhatsApp pour cette opération.", { by: t(BY[channel]) })}
          </p>
        </fieldset>
        <label className="field" style={{ marginBottom: 10 }}>
          {t("Message (facultatif)")}
          <textarea name="message" rows={2} placeholder={t(offer.kind === "RACHAT" ? "Titres détenus chez… / date de disponibilité" : "Ex. : plutôt la ligne la plus courte ; contrainte de trésorerie le 16.")} />
        </label>
        </div>
        <div data-step="3">
        <div className={styles.recap}>
          <div>
            <span>{t("Ligne")}</span>
            <b>{offer.title}</b>
          </div>
          <div>
            <span>{t("Demande")}</span>
            <b>{t(INTENT_LABEL[type])}</b>
          </div>
          {needsAmount && (
            <div>
              <span>{amtLabel}</span>
              <b>{parse(amount) ? (type === "rachat" ? fmtUnits(parse(amount)) : fmt(parse(amount))) : "—"}</b>
            </div>
          )}
          <div>
            <span>{t("Contact")}</span>
            <b>
              {who.firstName} {who.lastName} · {t(channel)} · {channel === "E-mail" ? who.email : who.phone}
            </b>
          </div>
        </div>
        {state && !state.ok && <div className={styles.error}>{state.error}</div>}
        {!ready && (
          <div className={styles.login}>
            {t(!signedIn ? "Votre e-mail doit être prouvé par son code (étape 2) : il vous connecte, sans compte à créer d'avance." : !phoneOk ? "Votre numéro WhatsApp doit être prouvé par son code (étape 2), une seule fois." : "L'e-mail doit être celui de votre connexion (étape 2).")}
            <button type="button" className="btn primary sm" onClick={() => goTo(2)}>
              {t("Aller à l'étape 2")}
            </button>
          </div>
        )}
        <div className={styles.foot}>
          <small>{t(offer.kind === "FONDS" ? "Une souscription est exécutée à la prochaine valeur liquidative ; elle est confirmée par un conseiller et un bulletin à signer. Ni conseil, ni garantie de performance." : "Une prise ferme engage la transmission de votre offre à l'adjudication ; elle est confirmée par un conseiller et un bulletin à signer. Ni conseil, ni garantie d'allocation.")}</small>
          <button className="btn primary" type="submit" disabled={pending || !ready}>
            {t(pending ? "Envoi…" : "Envoyer au desk")}
          </button>
        </div>
        </div>
        <div className={styles.stepNav}>
          {step > 1 ? (
            <button type="button" className="btn ghost" onClick={() => goTo(step - 1)}>
              {t("Retour")}
            </button>
          ) : (
            <span />
          )}
          {step < 3 && (
            <button type="button" className="btn primary" onClick={() => goTo(step + 1)}>
              {t("Continuer")}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
