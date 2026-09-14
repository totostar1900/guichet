"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { IntentResult } from "@/app/offres/[id]/actions";
import { submitIntent } from "@/app/offres/[id]/actions";
import { estimate } from "@/lib/domain/estimate";
import { INTENT_LABEL } from "@/lib/domain/intent";
import type { IntentType, Offer } from "@/lib/domain/types";
import { fmt, parseAmount } from "@/lib/format";
import styles from "./IntentForm.module.css";

const DONE: Record<IntentType, (by: string) => string> = {
  ferme: (by) => `Votre prise ferme est dans le carnet. Un conseiller vous confirme ${by} avant la clôture et vous envoie le bulletin à signer.`,
  appetit: (by) => `Votre appétit est noté ; le desk vous rappelle ${by} avant la clôture pour arrêter le montant.`,
  cession: (by) => `Votre demande de cession est enregistrée. Nous vérifions la position et vous confirmons ${by}.`,
  rappel: (by) => `Nous vous prévenons ${by} dès l'ouverture.`,
  info: (by) => `Un conseiller vous répond ${by} dans l'heure.`,
  achat: (by) => `Votre ordre d'achat est enregistré. Un conseiller le confirme ${by}, vous envoie l'ordre de bourse à signer et l'appel de fonds ; exécution au marché, règlement T+3.`,
  vente: (by) => `Votre ordre de vente est enregistré. Un conseiller vérifie votre position et vous confirme ${by} ; produit crédité après règlement.`,
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

export function IntentForm({ offer, types, initialType, priceText, past, signedIn, tier = 0 }: { offer: Offer; types: IntentType[]; initialType: IntentType; priceText: string; past: boolean; signedIn: boolean; tier?: number }) {
  const [state, action, pending] = useActionState<IntentResult | null, FormData>(submitIntent, null);
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<IntentType>(initialType);
  const est = estimate(offer, parseAmount(amount));
  const needsAmount = type === "ferme" || type === "cession" || type === "appetit" || type === "achat" || type === "vente";
  const market = offer.kind === "MARCHE";

  if (state?.ok) {
    return (
      <div className={styles.wrap}>
        <div className={styles.done}>
          <b>Reçu — réf. {state.ref}</b>
          {DONE[state.type](BY[state.channel])}
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

  const amtLabel = market ? `Quantité (${offer.instrument === "obligation" ? "titres" : "actions"})` : offer.kind === "ACTIONS" ? "Montant (FCFA)" : offer.kind === "RACHAT" ? "Titres à céder" : offer.kind === "BTA" ? "Montant (FCFA)" : "Montant nominal (FCFA)";

  return (
    <div className={styles.wrap}>
      <h3 className="display">{past ? "Une question sur cette ligne ?" : `Votre intention sur cette ligne — ${priceText}`}</h3>
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
        <div className={styles.row} style={market && (type === "achat" || type === "vente") ? { gridTemplateColumns: "1fr 1fr 1fr" } : undefined}>
          {needsAmount ? (
            <label className="field">
              {amtLabel}
              <input
                name="amount"
                inputMode="numeric"
                placeholder={offer.kind === "RACHAT" ? "500" : "10 000 000"}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onBlur={() => amount && setAmount(fmt(parseAmount(amount)))}
              />
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
          <label className="field">
            Me joindre par
            <select name="channel" defaultValue="WhatsApp">
              <option>WhatsApp</option>
              <option>Appel</option>
              <option>E-mail</option>
            </select>
          </label>
        </div>
        {needsAmount && <div className={`${styles.estimate} ${est.ok ? "" : styles.estimateOff}`}>{market ? marketEstimate(offer, parseAmount(amount), type) : est.text}</div>}
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
          <small>Une prise ferme engage la transmission de votre offre à l&apos;adjudication ; elle est confirmée par un conseiller et un bulletin à signer. Ni conseil, ni garantie d&apos;allocation.</small>
          <button className="btn primary" type="submit" disabled={pending || !signedIn}>
            {pending ? "Envoi…" : "Envoyer au desk"}
          </button>
        </div>
      </form>
    </div>
  );
}
