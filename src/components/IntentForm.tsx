"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import type { IntentResult } from "@/app/offres/[id]/actions";
import { submitIntent } from "@/app/offres/[id]/actions";
import type { ChannelStatus } from "@/lib/domain/types";
import { normalizePhone } from "@/lib/format";
import { ProofBlock } from "@/components/ProofBlock";
import { TrustNudge } from "@/components/TrustNudge";
import { estimate } from "@/lib/domain/estimate";
import { orderChecks } from "@/lib/domain/checks";
import { Info } from "./Info";
import { INTENT_LABEL } from "@/lib/domain/intent";
import type { IntentType, Offer } from "@/lib/domain/types";
import { fmt, parseAmount, parseUnits } from "@/lib/format";
import styles from "./IntentForm.module.css";
import { useLang, useT } from "@/i18n/client";
import { amountFlag } from "@/data/profile";

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

/**
 * Le prix d’un titre, en francs.
 *
 * Une obligation se cote en pourcentage du nominal : 101 % sur un nominal de
 * 10 000 vaut 10 100 francs le titre. Une action se cote en francs, et le cours
 * est le prix. Le prix limite l’emporte quand il est posé : c’est celui que le
 * client dit accepter, donc celui qui borne sa dépense.
 */
function unitPrice(o: Offer, type: IntentType, limit: number | null): number {
  const ref = limit ?? (type === "vente" ? (o.bid ?? o.lastPrice ?? 0) : (o.ask ?? o.lastPrice ?? 0));
  return o.instrument === "obligation" ? (o.nominal * ref) / 100 : ref;
}

/**
 * Combien de titres une somme achète, arrondi à la quotité par le bas.
 *
 * Par le bas, toujours : un ordre qui dépasserait la somme annoncée serait une
 * mauvaise surprise à l’appel de fonds, et le carnet ne prend de toute façon que
 * des titres entiers, par multiples de la quotité.
 */
function qtyForCash(o: Offer, type: IntentType, cash: number, limit: number | null): number {
  const p = unitPrice(o, type, limit);
  if (!cash || p <= 0) return 0;
  const lot = o.lotSize && o.lotSize > 0 ? o.lotSize : 1;
  return Math.floor(cash / p / lot) * lot;
}

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

export function IntentForm({ offer, types, initialType, initialAmount, held = 0, priceText, past, signedIn, tier = 0, phone = "", phoneProven = false, email = "", name = "", channels, bridge, profileFlag, investable }: { offer: Offer; types: IntentType[]; initialType: IntentType; initialAmount?: number; held?: number; priceText: string; past: boolean; signedIn: boolean; tier?: number; phone?: string; /** le numéro de la session a été confirmé par un code à la connexion */ phoneProven?: boolean; email?: string; name?: string; channels?: ChannelStatus; bridge?: { phone: string; token: string }; profileFlag?: string; investable?: number }) {
  // The profile name is "Prénom Nom" when the client typed it, or an e-mail stub otherwise.
  const nameParts = name.trim().split(/\s+/).filter(Boolean);
  const [firstName, lastName] = nameParts.length >= 2 ? [nameParts[0], nameParts.slice(1).join(" ")] : ["", ""];
  const [state, action, pending] = useActionState<IntentResult | null, FormData>(submitIntent, null);
  const t = useT();
  const lang = useLang();
  const fmtUnits = (v: number) => (offer.kind === "FONDS" ? v.toLocaleString("fr-FR", { maximumFractionDigits: 3 }) : fmt(v));
  const [amount, setAmount] = useState(initialAmount ? fmtUnits(initialAmount) : "");
  const [type, setType] = useState<IntentType>(initialType);
  const [limit, setLimit] = useState("");
  // Sur la cote l’ordre part en titres, c’est ce que le carnet prend. Mais on pense en
  // francs : on peut saisir une somme, que le formulaire convertit et montre.
  const [unit, setUnit] = useState<"titres" | "francs">("titres");
  const [cash, setCash] = useState("");
  const [channel, setChannel] = useState<"WhatsApp" | "Appel" | "E-mail">("WhatsApp");
  // L’e-mail du compte : celui de la session quand le fournisseur le donne, sinon
  // celui que le profil a prouvé. On lisait le premier seulement ; quand il
  // manquait, le formulaire acceptait n’importe quelle adresse bien formée et la
  // marquait « prouvée », alors qu’un compte connecté se parle à son adresse.
  const accountEmail = (email || (channels?.emailVerifiedAt && channels.email) || "").trim().toLowerCase();
  const [who, setWho] = useState({ firstName, lastName, phone: bridge?.phone || phone || channels?.phone || "", email: email || channels?.email || "" });
  // The proofs: the phone as proven on the profile (or just now), the e-mail as the account's (or just proven by a guest).
  // Trois façons de connaître un numéro prouvé, et la connexion en est une : le
  // lien WhatsApp du desk, le code que le profil a déjà validé, ou la connexion
  // par téléphone elle-même.
  const [provenPhone, setProvenPhone] = useState<string | null>(bridge?.phone ?? (channels?.phoneVerifiedAt && channels.phone ? channels.phone : null) ?? (phoneProven && phone ? normalizePhone(phone) : null));
  const [provenEmail, setProvenEmail] = useState<string | null>(signedIn && accountEmail ? accountEmail : null);
  // No WhatsApp sender on this host: the desk confirms by phone, the button opens, the intention is marked unproven.
  const [phonePending, setPhonePending] = useState(false);
  const phoneOk = Boolean(provenPhone && normalizePhone(who.phone) === provenPhone);
  // Une session dont on ne connaît aucune adresse (le serveur de développement) ne
  // prouve rien : là, une adresse bien formée passe. Partout ailleurs, l'adresse du
  // compte est la seule.
  const emailOk = signedIn && !accountEmail ? who.email.includes("@") : Boolean(provenEmail && who.email.trim().toLowerCase() === provenEmail);
  // The intention leaves the client's profile: they say so before it goes, and the desk reads it.
  const [profileOk, setProfileOk] = useState(false);
  const [amountOk, setAmountOk] = useState(false);
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
      if (step === 1 && needsAmount && (!ordered || blocked)) {
        formRef.current.querySelector<HTMLInputElement>("[data-order-field]")?.focus();
        return;
      }
    }
    setStep(n);
    formRef.current?.closest("aside")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const parse = (s: string) => (offer.kind === "FONDS" && type === "rachat" ? parseUnits(s) : parseAmount(s));
  const market = offer.kind === "MARCHE";
  const limitNum = limit ? Number(limit.replace(",", ".")) : null;
  const lim = limitNum != null && !isNaN(limitNum) && limitNum > 0 ? limitNum : null;
  const byCash = market && unit === "francs";
  // Une seule quantité commande tout le reste : l’estimation, les contrôles, le passage
  // à l’étape suivante, et ce qui part au desk. Saisie en titres, ou déduite d’une somme.
  const ordered = byCash ? qtyForCash(offer, type, parseAmount(cash), lim) : parse(amount);
  const est = estimate(offer, ordered);
  // The outlay against the savings the client said they can invest this year: a word, and a confirmation past half of it.
  const amountMark = investable != null && est.outlay ? amountFlag({ investable, kind: "equilibre", horizonYears: [0, 1], measures: { horizon: 0, tolerance: 0, knowledge: 0, capacity: 0 }, answers: {}, updatedAt: "" }, est.outlay) : null;
  const amountWarn = amountMark?.level === "warn" ? amountMark[lang] : undefined;
  const ready = signedIn && (phoneOk || phonePending) && emailOk && (!profileFlag || profileOk) && (!amountWarn || amountOk);
  const needsAmount = type === "ferme" || type === "cession" || type === "appetit" || type === "achat" || type === "vente" || type === "souscription" || type === "rachat";
  // Consistency of the order as typed: minimum, whole titles, quotité, limit price, position held.
  const checks = needsAmount && ordered ? orderChecks(offer, type, ordered, lim, { held: (type === "vente" || type === "rachat") && held > 0 ? held : undefined, needsAccount: signedIn && tier < 2 && (type === "ferme" || type === "cession" || type === "achat" || type === "vente") }).filter((c) => c.level !== "ok") : [];
  const blocked = checks.some((c) => c.level === "block");

  if (state?.ok) {
    return (
      <div className={styles.wrap}>
        <div className={styles.done}>
          <div className={styles.receiptHead}>
            <span className={styles.tick} aria-hidden="true">
              ✓
            </span>
            <span>
              <b>{t("Votre intention est enregistrée")}</b>
              <small>{t("Gardez cette référence : elle sert de référence de virement.")}</small>
            </span>
          </div>
          <div className={styles.ref}>{state.ref}</div>
          <dl className={styles.receipt}>
            <dt>{t("Votre demande")}</dt>
            <dd>
              {t(INTENT_LABEL[state.type])}
              {ordered ? ` · ${market ? `${fmt(ordered)} ${t(offer.instrument === "obligation" ? "titres" : "actions")}` : `${fmtUnits(ordered)} ${t(offer.kind === "FONDS" && type === "rachat" ? "parts" : "FCFA")}`}` : ""}
            </dd>
            <dt>{t("La ligne")}</dt>
            <dd>{offer.title}</dd>
            <dt>{t("On vous répond")}</dt>
            <dd>{t(BY[state.channel])}</dd>
          </dl>
          <div className={styles.next}>{t("La suite")}</div>
          <ul className={styles.steps}>
            <li>
              {t("Accusé de réception envoyé sur WhatsApp au")} <b>{state.phone}</b> {t("et par e-mail à")} <b>{state.email}</b>
              {state.sent.some((x) => x.status === "skipped") ? t(" (envoi automatique en cours d'activation : le desk vous écrit à la main)") : state.sent.some((x) => x.status === "failed") ? t(" : un envoi a échoué, le desk vous recontacte") : ""}.
            </li>
            <li>{t("Un conseiller vous confirme {by} : vérifiez que ce numéro reçoit bien les appels et WhatsApp.", { by: t(BY[state.channel]) })}</li>
            <li>{t("Le bulletin à signer et l'appel de fonds arrivent par e-mail ; l'exécution vous est confirmée sur les deux canaux.")}</li>
          </ul>
          {/* Un accusé de réception part d’un domaine que la boîte du client ne connaît pas encore : il finit souvent au courrier indésirable. */}
          <p className={styles.spam}>
            {t("Si l’accusé n’arrive pas dans quelques minutes, regardez vos courriers indésirables, et marquez-le comme légitime : les suivants arriveront dans la boîte de réception.")}
          </p>
          {state.needsAccount && (
            <div className={styles.needAccount}>
              {t("Pour transmettre cet ordre, votre compte-titres doit être ouvert : dix minutes sur votre téléphone.")}{" "}
              <Link className="btn primary sm" href={`/ouvrir-un-compte?next=${encodeURIComponent(`/offres/${offer.id}`)}`}>
                {t("Ouvrir mon compte")}
              </Link>
            </div>
          )}
          <TrustNudge />
          <div className={styles.doneActions}>
            <Link className="btn sm" href={`/offres/${offer.id}`}>
              {t("Autre intention")}
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
        {bridge && <input type="hidden" name="de" value={bridge.token} />}
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
              {/* Sur la cote, le client choisit son unité : des titres, ou une somme */}
              {market ? (
                <span className={styles.unitRow}>
                  {amtLabel}
                  <span className={styles.unitPick} role="group" aria-label={t("Saisir en")}>
                    {(["titres", "francs"] as const).map((u) => (
                      <button
                        key={u}
                        type="button"
                        aria-pressed={unit === u}
                        className={unit === u ? styles.unitOn : undefined}
                        onClick={() => setUnit(u)}
                      >
                        {t(u === "titres" ? (offer.instrument === "obligation" ? "en titres" : "en actions") : "en FCFA")}
                      </button>
                    ))}
                  </span>
                </span>
              ) : (
                amtLabel
              )}
              {byCash ? (
                <input
                  data-order-field
                  inputMode="numeric"
                  placeholder="1 000 000"
                  value={cash}
                  onChange={(e) => setCash(e.target.value)}
                  onBlur={() => cash && setCash(fmt(parseAmount(cash)))}
                />
              ) : (
                <input
                  data-order-field
                  name="amount"
                  inputMode="numeric"
                  placeholder={offer.kind === "RACHAT" ? "500" : "10 000 000"}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onBlur={() => amount && setAmount(type === "rachat" ? fmtUnits(parse(amount)) : fmt(parse(amount)))}
                />
              )}
              {/* Ce qui part au desk reste une quantité : c’est ce que le carnet prend. */}
              {byCash && <input type="hidden" name="amount" value={ordered ? String(ordered) : ""} />}
              {byCash && (
                <small className={styles.conv}>
                  {ordered
                    ? t("soit {n} {u} à {p}, pour {c} FCFA", {
                        n: fmt(ordered),
                        u: t(offer.instrument === "obligation" ? "titres" : "actions"),
                        p: offer.instrument === "obligation" ? `${lim ?? offer.ask ?? offer.lastPrice ?? 0} %` : `${fmt(lim ?? offer.ask ?? offer.lastPrice ?? 0)} FCFA`,
                        c: fmt(Math.round(ordered * unitPrice(offer, type, lim))),
                      })
                    : parseAmount(cash)
                      ? t("Cette somme n’atteint pas un titre au cours de référence.")
                      : t("La somme se convertit en titres au cours de référence, arrondie à la quotité par le bas.")}
                </small>
              )}
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
        {needsAmount && <div className={`${styles.estimate} ${est.ok ? "" : styles.estimateOff}`}>{t(market ? marketEstimate(offer, ordered, type) : offer.kind === "FONDS" && type === "rachat" ? redemptionEstimate(offer, parse(amount)) : est.text)}</div>}
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
              <input name="contactPhone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+237 6 87 67 67 67" value={who.phone} onChange={(e) => setWho({ ...who, phone: e.target.value })} required pattern="[+0-9 \(\)\.\-]{8,}" title={t("Numéro avec indicatif, ex. +237 6 87 67 67 67")} />
              {phoneOk && <em className={styles.proven}>✓ {t(bridge && normalizePhone(who.phone) === bridge.phone ? "reconnu par le lien WhatsApp du desk" : "prouvé")}</em>}
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
          {signedIn && Boolean(accountEmail) && !emailOk && <em className={styles.proofError}>{t("L'e-mail est celui de votre compte ; pour en changer, passez par Mon espace › Sécurité.")}</em>}
          {signedIn && emailOk && !phoneOk && who.phone.replace(/\D/g, "").length >= 8 && <ProofBlock kind="phone" target={who.phone} onProven={setProvenPhone} onUnavailable={() => setPhonePending(true)} />}
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
        {amountWarn && (
          <label className={styles.profileBox}>
            <input type="checkbox" checked={amountOk} onChange={(e) => setAmountOk(e.target.checked)} />
            <span>
              <b>{t("Ce montant est {flag}.", { flag: amountWarn })}</b> {t("Je le sais et je confirme mon intention ; un conseiller en parlera avec moi.")}
            </span>
          </label>
        )}
        {profileFlag && (
          <label className={styles.profileBox}>
            <input type="checkbox" checked={profileOk} onChange={(e) => setProfileOk(e.target.checked)} />
            <span>
              <b>{t("Cette ligne est {flag}.", { flag: profileFlag })}</b> {t("Je le sais et je confirme mon intention ; un conseiller en parlera avec moi.")}
            </span>
          </label>
        )}
        <input type="hidden" name="profileFlag" value={[profileFlag && profileOk ? profileFlag : "", amountWarn && amountOk ? amountWarn : ""].filter(Boolean).join(" · ")} />
        <div className={styles.foot}>
          <small>{t(offer.kind === "FONDS" ? "Une souscription est exécutée à la prochaine valeur liquidative ; elle est confirmée par un conseiller et un bulletin à signer. La décision reste la vôtre ; la performance dépend du marché." : "Une prise ferme engage la transmission de votre offre à l'adjudication ; elle est confirmée par un conseiller et un bulletin à signer. La décision reste la vôtre ; l'allocation dépend de l'adjudication.")}</small>
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
