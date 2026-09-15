"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { IntentResult } from "@/app/offres/[id]/actions";
import { submitIntent } from "@/app/offres/[id]/actions";
import { estimate } from "@/lib/domain/estimate";
import { INTENT_LABEL } from "@/lib/domain/intent";
import type { IntentType, Offer } from "@/lib/domain/types";
import { fmt, parseAmount, parseUnits } from "@/lib/format";
import styles from "./IntentForm.module.css";

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
  const com = gross * (o.commissionPct / 100);
  return `${fmt(qty)} ${isBond ? "titres" : "actions"} × ${isBond ? `${ref} %` : `${fmt(ref)} FCFA`} = ${fmt(gross)} FCFA · commission ${fmt(com)} · ${type === "vente" ? "net encaissé" : "total"} ≈ ${fmt(type === "vente" ? gross - com : gross + com)} FCFA · prix d'exécution selon le marché`;
}

/** Fund redemption: the amount field is a number of units. */
function redemptionEstimate(o: Offer, units: number): string {
  if (!o.fund) return "";
  if (!units) return "Indiquez un nombre de parts pour voir l'estimation à la dernière VL.";
  const gross = units * o.fund.nav;
  const fee = gross * (o.fund.exitFeePct / 100);
  return `${units.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} parts × VL ${fmt(o.fund.nav)} FCFA = ${fmt(gross)} FCFA${fee ? ` · droits de sortie ${fmt(fee)}` : ""} · net ≈ ${fmt(gross - fee)} FCFA à la VL de rachat`;
}

export function IntentForm({ offer, types, initialType, initialAmount, held = 0, priceText, past, signedIn, tier = 0, phone = "", email = "", name = "" }: { offer: Offer; types: IntentType[]; initialType: IntentType; initialAmount?: number; held?: number; priceText: string; past: boolean; signedIn: boolean; tier?: number; phone?: string; email?: string; name?: string }) {
  // The profile name is "Prénom Nom" when the client typed it, or an e-mail stub otherwise.
  const nameParts = name.trim().split(/\s+/).filter(Boolean);
  const [firstName, lastName] = nameParts.length >= 2 ? [nameParts[0], nameParts.slice(1).join(" ")] : ["", ""];
  const [state, action, pending] = useActionState<IntentResult | null, FormData>(submitIntent, null);
  const fmtUnits = (v: number) => (offer.kind === "FONDS" ? v.toLocaleString("fr-FR", { maximumFractionDigits: 3 }) : fmt(v));
  const [amount, setAmount] = useState(initialAmount ? fmtUnits(initialAmount) : "");
  const [type, setType] = useState<IntentType>(initialType);
  const [channel, setChannel] = useState<"WhatsApp" | "Appel" | "E-mail">("WhatsApp");
  const parse = (s: string) => (offer.kind === "FONDS" && type === "rachat" ? parseUnits(s) : parseAmount(s));
  const est = estimate(offer, parse(amount));
  const needsAmount = type === "ferme" || type === "cession" || type === "appetit" || type === "achat" || type === "vente" || type === "souscription" || type === "rachat";
  const market = offer.kind === "MARCHE";

  if (state?.ok) {
    return (
      <div className={styles.wrap}>
        <div className={styles.done}>
          <b>Reçu — réf. {state.ref}</b>
          {DONE[state.type](BY[state.channel])}
          <ul className={styles.steps}>
            <li>
              Accusé de réception envoyé sur WhatsApp au <b>{state.phone}</b> et par e-mail à <b>{state.email}</b>
              {state.sent.some((x) => x.status === "skipped") ? " (envoi automatique en cours d'activation : le desk vous écrit à la main)" : state.sent.some((x) => x.status === "failed") ? " — un envoi a échoué, le desk vous recontacte" : ""}.
            </li>
            <li>Un conseiller vous confirme {BY[state.channel]} — vérifiez que ce numéro reçoit bien les appels et WhatsApp.</li>
            <li>Le bulletin à signer et l&apos;appel de fonds arrivent par e-mail ; l&apos;exécution vous est confirmée sur les deux canaux.</li>
          </ul>
          {state.needsAccount && (
            <div className={styles.needAccount}>
              Pour transmettre cet ordre, votre compte-titres doit être ouvert : dix minutes sur votre téléphone.{" "}
              <Link className="btn primary sm" href={`/ouvrir-un-compte?next=${encodeURIComponent(`/offres/${offer.id}`)}`}>
                Ouvrir mon compte
              </Link>
            </div>
          )}
          <div className={styles.doneActions}>
            <Link className="btn sm" href={`/offres/${offer.id}`}>
              Autre intention
            </Link>
            <Link className="btn sm ghost" href="/desk">
              Voir dans le desk
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const amtLabel = market ? `Quantité (${offer.instrument === "obligation" ? "titres" : "actions"})` : offer.kind === "FONDS" ? (type === "rachat" ? "Parts à racheter" : "Montant (FCFA)") : offer.kind === "ACTIONS" ? "Montant (FCFA)" : offer.kind === "RACHAT" ? "Titres à céder" : offer.kind === "BTA" ? "Montant (FCFA)" : "Montant nominal (FCFA)";

  return (
    <div className={styles.wrap}>
      <h3 className="display">{past ? "Une question sur cette ligne ?" : "Votre intention sur cette ligne"}</h3>
      {!past && <div className={styles.priceLine}>{priceText}</div>}
      <form action={action}>
        <input type="hidden" name="offerId" value={offer.id} />
        <div className={styles.radio}>
          {types.map((t) => (
            <label key={t}>
              <input type="radio" name="type" value={t} checked={type === t} onChange={() => setType(t)} />
              {INTENT_LABEL[t]}
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
                  Vous détenez {fmtUnits(held)} {offer.kind === "FONDS" ? "parts" : offer.instrument === "obligation" ? "titres" : "actions"} ·{" "}
                  <button type="button" className={styles.linkBtn} onClick={() => setAmount(fmtUnits(held))}>
                    tout {type === "rachat" ? "racheter" : "vendre"}
                  </button>
                </small>
              )}
            </label>
          ) : (
            <span />
          )}
          {market && (type === "achat" || type === "vente") && (
            <label className="field">
              Prix limite (facultatif — {offer.instrument === "obligation" ? "% du nominal" : "FCFA par action"})
              <input name="limitPrice" type="number" step={offer.instrument === "obligation" ? "0.001" : "1"} placeholder={offer.instrument === "obligation" ? String(offer.lastPrice ?? "") : String(offer.lastPrice ?? "")} />
            </label>
          )}
        </div>
        <fieldset className={styles.contact}>
          <legend>Vos coordonnées</legend>
          <div className={styles.row}>
            <label className="field">
              <span>
                Prénom <em className={styles.req}>· requis</em>
              </span>
              <input name="firstName" autoComplete="given-name" placeholder="Prénom" defaultValue={firstName} required minLength={2} />
            </label>
            <label className="field">
              <span>
                Nom <em className={styles.req}>· requis</em>
              </span>
              <input name="lastName" autoComplete="family-name" placeholder="Nom" defaultValue={lastName} required minLength={2} />
            </label>
          </div>
          <div className={styles.row}>
            <label className="field">
              <span>
                Téléphone (WhatsApp) <em className={styles.req}>· requis</em>
              </span>
              <input name="contactPhone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+237 6 87 67 67 67" defaultValue={phone} required pattern="[+0-9 ().-]{8,}" title="Numéro avec indicatif, ex. +237 6 87 67 67 67" />
            </label>
            <label className="field">
              <span>
                E-mail <em className={styles.req}>· requis</em>
              </span>
              <input name="contactEmail" type="email" inputMode="email" autoComplete="email" placeholder="vous@exemple.com" defaultValue={email} required />
            </label>
          </div>
          <div className={styles.channelLbl}>Me joindre par</div>
          <div className={styles.channels}>
            {(["WhatsApp", "Appel", "E-mail"] as const).map((c) => (
              <label key={c}>
                <input type="radio" name="channel" value={c} checked={channel === c} onChange={() => setChannel(c)} />
                {c}
              </label>
            ))}
          </div>
          <p className={styles.procedure}>
            Prénom et nom tels que sur votre pièce d&apos;identité (ils figurent sur le bulletin). Téléphone et e-mail sont vérifiés à l&apos;envoi : accusé de réception immédiat sur WhatsApp et par e-mail, confirmation d&apos;un conseiller {BY[channel]}, bulletin à signer par e-mail. En donnant ce numéro, vous acceptez d&apos;être contacté sur WhatsApp pour cette opération.
          </p>
        </fieldset>
        {needsAmount && <div className={`${styles.estimate} ${est.ok ? "" : styles.estimateOff}`}>{market ? marketEstimate(offer, parseAmount(amount), type) : offer.kind === "FONDS" && type === "rachat" ? redemptionEstimate(offer, parse(amount)) : est.text}</div>}
        {signedIn && tier < 2 && (type === "souscription" || type === "rachat") && (
          <div className={styles.tierNote}>
            Souscrire à un fonds demande un dossier client approuvé (les parts sont inscrites à votre nom chez le dépositaire). Envoyez votre intention — elle est gardée — puis{" "}
            <Link href={`/ouvrir-un-compte?next=${encodeURIComponent(`/offres/${offer.id}`)}`}>complétez votre dossier</Link> (10 min).
          </div>
        )}
        {signedIn && tier < 2 && (type === "ferme" || type === "cession" || type === "achat" || type === "vente") && (
          <div className={styles.tierNote}>
            Prises fermes, cessions et ordres de bourse demandent un compte-titres ouvert. Envoyez quand même votre intention — elle est gardée — puis{" "}
            <Link href={`/ouvrir-un-compte?next=${encodeURIComponent(`/offres/${offer.id}`)}`}>ouvrez votre compte</Link> (10 min).
          </div>
        )}
        <label className="field" style={{ marginBottom: 10 }}>
          Message (facultatif)
          <textarea name="message" rows={2} placeholder={offer.kind === "RACHAT" ? "Titres détenus chez… / date de disponibilité" : "Ex. : plutôt la ligne la plus courte ; contrainte de trésorerie le 16."} />
        </label>
        {state && !state.ok && <div className={styles.error}>{state.error}</div>}
        {!signedIn && (
          <div className={styles.login}>
            Identifiez-vous pour envoyer votre intention — un code par e-mail suffit, aucun compte à créer d&apos;avance.
            <Link className="btn primary sm" href={`/connexion?next=${encodeURIComponent(`/offres/${offer.id}?intent=${type}`)}`}>
              Se connecter
            </Link>
          </div>
        )}
        <div className={styles.foot}>
          <small>{offer.kind === "FONDS" ? "Une souscription est exécutée à la prochaine valeur liquidative, inconnue au moment de l'ordre ; elle est confirmée par un conseiller et un bulletin à signer. Ni conseil, ni garantie de performance." : "Une prise ferme engage la transmission de votre offre à l'adjudication ; elle est confirmée par un conseiller et un bulletin à signer. Ni conseil, ni garantie d'allocation."}</small>
          <button className="btn primary" type="submit" disabled={pending || !signedIn}>
            {pending ? "Envoi…" : "Envoyer au desk"}
          </button>
        </div>
      </form>
    </div>
  );
}
