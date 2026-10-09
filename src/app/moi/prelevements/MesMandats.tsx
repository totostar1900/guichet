"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useT } from "@/i18n/client";
import { fmt, fmtDate, fmtDateTime } from "@/lib/format";
import { groupedInput } from "@/lib/ui/grouped";
import { Select } from "@/components/ui/Select";
import { creerMandatAction, envoyerCodeMandatAction, revoquerMandatAction, signerMandatAction, type MandatResult } from "./actions";
import styles from "./page.module.css";

interface Vu {
  id: string;
  ref: string;
  objet: "provision" | "instruction";
  titulaire: string;
  banque: string;
  compte: string;
  plafond: number;
  montant?: number;
  jour?: number;
  etat: "actif" | "suspendu" | "revoque";
  signeLe?: string;
  codeEnvoyeA?: string;
  codeEnvoyeLe?: string;
  revoqueLe?: string;
}

function Msg({ state }: { state: MandatResult | null }) {
  const t = useT();
  if (!state) return null;
  return <p className={state.ok ? styles.ok : styles.erreur}>{state.ok ? (state.message ? t(state.message) : null) : t(state.error)}</p>;
}

/**
 * UN MANDAT SE LIT AVANT DE SE SIGNER, ET SE SIGNE À PART.
 *
 * Le remplir et le signer d'un même geste reviendrait à le signer sans
 * l'avoir lu : la page le crée d'abord, l'affiche avec ses chiffres, et
 * demande ensuite le code. C'est la même séquence que la convention et que
 * l'ordre, pour la même raison.
 */
export function MesMandats({
  mandats,
  instructions,
  titulaireParDefaut,
  banqueParDefaut,
  compteParDefaut,
  canal,
  dossier,
  injoignable,
  jourMin,
  jourMax,
}: {
  mandats: Vu[];
  instructions: { id: string; ref: string; montant: number; jour: number }[];
  titulaireParDefaut: string;
  banqueParDefaut: string;
  compteParDefaut: string;
  canal?: { to: string; parMail: boolean };
  /** Le dossier existe-t-il ? Sans lui, aucun code ne peut partir. */
  dossier: boolean;
  /** Aucune adresse où faire parvenir le code, ni plus tard les préavis. */
  injoignable: boolean;
  jourMin: number;
  jourMax: number;
}) {
  const t = useT();
  const [creer, creerAct, creation] = useActionState<MandatResult | null, FormData>(creerMandatAction, null);
  const [envoi, envoiAct, envoyant] = useActionState<MandatResult | null, FormData>(envoyerCodeMandatAction, null);
  const [sign, signAct, signant] = useActionState<MandatResult | null, FormData>(signerMandatAction, null);
  const [revoc, revocAct, revoquant] = useActionState<MandatResult | null, FormData>(revoquerMandatAction, null);
  const [objet, setObjet] = useState<"provision" | "instruction">("provision");
  const [ouvert, setOuvert] = useState(false);
  const [aRevoquer, setARevoquer] = useState<string | null>(null);
  const [quelle, setQuelle] = useState(instructions[0]?.id ?? "");
  /* Contrôlés, parce que le regroupement replace le curseur après chaque
     touche : un champ non contrôlé renverrait le curseur au bout. */
  const [montant, setMontant] = useState("");
  const [plafond, setPlafond] = useState("");

  const vivants = mandats.filter((m) => m.etat !== "revoque");
  const anciens = mandats.filter((m) => m.etat === "revoque");

  return (
    <>
      {vivants.length > 0 && (
        <section className={styles.bloc}>
          <h2>{t("Vos autorisations")}</h2>
          <ul className={styles.liste}>
            {vivants.map((m) => (
              <li key={m.id} className={styles.mandat}>
                <div className={styles.mTete}>
                  <b>{m.objet === "provision" ? t("Alimenter ma provision") : t("Alimenter mon épargne programmée")}</b>
                  <span className={m.signeLe ? styles.actif : styles.attente}>{m.signeLe ? (m.etat === "suspendu" ? t("suspendu") : t("actif")) : t("à signer")}</span>
                </div>
                <dl className={styles.mLignes}>
                  {m.montant != null && m.jour != null && (
                    <div>
                      <dt>{t("Chaque mois")}</dt>
                      <dd>{t("{m} FCFA, le {j}", { m: fmt(m.montant), j: String(m.jour) })}</dd>
                    </div>
                  )}
                  <div>
                    <dt>{t("Plafond par échéance")}</dt>
                    <dd>
                      <b>{fmt(m.plafond)} FCFA</b>
                    </dd>
                  </div>
                  <div>
                    <dt>{t("Compte débité")}</dt>
                    <dd>
                      {m.titulaire} · {m.banque} · <span className="mono">{m.compte}</span>
                    </dd>
                  </div>
                  <div>
                    <dt>{t("Référence du mandat")}</dt>
                    <dd className="mono">{m.ref}</dd>
                  </div>
                </dl>

                {m.signeLe ? (
                  <p className={styles.note}>{t("Signé le {d}. Votre exemplaire est dans vos documents : votre banque peut vous le demander.", { d: fmtDateTime(m.signeLe) })}</p>
                ) : (
                  <div className={styles.signer}>
                    {/* LA PAGE ET L'ACTION DOIVENT DIRE LA MÊME CHOSE. Sans
                        dossier, la page annonçait « le code s'affichera à
                        l'écran » et le bouton répondait « Dossier
                        introuvable » : deux vérités, dont une seule tenait.
                        Vu à l'écran le 9 octobre 2026. */}
                    <p className={styles.note}>
                      {!dossier
                        ? t("Votre dossier doit être ouvert avant de signer un mandat : c'est lui qui porte le canal par lequel le code vous parvient.")
                        : injoignable
                          ? t("Il nous faut une adresse e-mail avant de signer : c'est là que part le code, puis l'annonce de chaque prélèvement.")
                          : canal
                          ? t(canal.parMail ? "Le code part par e-mail, à {o}" : "Le code part par WhatsApp, au {o}", { o: canal.to })
                          : t("Aucun canal d'envoi n'est configuré : le code s'affichera à l'écran.")}
                    </p>
                    <form action={envoiAct}>
                      <input type="hidden" name="id" value={m.id} />
                      <button className="btn primary" type="submit" disabled={envoyant || !dossier || injoignable}>
                        {envoyant ? "…" : m.codeEnvoyeLe ? t("Renvoyer un code") : t("Recevoir mon code")}
                      </button>
                    </form>
                    <Msg state={envoi} />
                    {envoi?.ok && envoi.code && (
                      <div className={styles.demo}>
                        {t("Code de démonstration :")} <b className="mono">{envoi.code}</b>
                      </div>
                    )}
                    <form action={signAct} className={styles.codeRow}>
                      <input type="hidden" name="id" value={m.id} />
                      <label className="field">
                        {t("Code reçu")}
                        <input name="code" inputMode="numeric" maxLength={6} placeholder={t("6 chiffres")} autoComplete="one-time-code" />
                      </label>
                      <button className="btn primary" type="submit" disabled={signant}>
                        {signant ? "…" : t("Je signe ce mandat")}
                      </button>
                    </form>
                    <Msg state={sign} />
                  </div>
                )}

                {/* LA RÉVOCATION EST UN DROIT, DONC ELLE EST VISIBLE. La cacher
                    derrière un message au desk reviendrait à la supprimer. */}
                {aRevoquer === m.id ? (
                  <form action={revocAct} className={styles.codeRow}>
                    <input type="hidden" name="id" value={m.id} />
                    <label className="field">
                      {t("Un mot, si vous voulez (facultatif)")}
                      <input name="motif" maxLength={160} />
                    </label>
                    <button type="button" className="btn sm ghost" onClick={() => setARevoquer(null)}>
                      {t("Garder")}
                    </button>
                    <button className="btn sm primary" type="submit" disabled={revoquant}>
                      {revoquant ? "…" : t("Révoquer")}
                    </button>
                  </form>
                ) : (
                  <button type="button" className="btn sm" onClick={() => setARevoquer(m.id)}>
                    {t("Révoquer ce mandat")}
                  </button>
                )}
                <Msg state={revoc} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={styles.bloc}>
        <h2>{vivants.length ? t("En ajouter un") : t("Autoriser un prélèvement")}</h2>
        {/* LE DIRE AVANT, PAS APRÈS. Préparer un mandat qu'on ne pourra pas
            signer, c'est remplir sept champs pour s'entendre refuser au
            dernier geste. La condition se lit donc ici aussi, et elle est la
            même : une adresse où le code, puis chaque préavis, peut arriver. */}
        {injoignable ? (
          <p className={styles.note}>
            {t("Il nous faut une adresse e-mail avant de signer : c'est là que part le code, puis l'annonce de chaque prélèvement.")}{" "}
            <Link href="/moi/securite#canaux">{t("Ajouter mon adresse →")}</Link>
          </p>
        ) : !ouvert ? (
          <button type="button" className="btn primary" onClick={() => setOuvert(true)}>
            {t("Préparer un mandat")}
          </button>
        ) : (
          <form action={creerAct} className={styles.form}>
            <fieldset className={styles.choix}>
              <legend>{t("À quoi sert ce prélèvement ?")}</legend>
              {/* UN MANDAT PAR USAGE : le choix est ici, et il n'y a pas de
                  « les deux ». Un mandat général serait juridiquement fragile
                  et commercialement effrayant. */}
              <label>
                <input type="radio" name="objet" value="provision" checked={objet === "provision"} onChange={() => setObjet("provision")} />
                {t("Alimenter ma provision, chaque mois")}
              </label>
              <label>
                <input type="radio" name="objet" value="instruction" checked={objet === "instruction"} onChange={() => setObjet("instruction")} disabled={!instructions.length} />
                {instructions.length ? t("Alimenter une épargne programmée") : t("Alimenter une épargne programmée (vous n'en avez pas encore)")}
              </label>
            </fieldset>

            {/* La liste de la maison, pas la native : au téléphone, celle du
                système s'ouvre en roue, sans la phrase qui dit ce que chaque
                ligne est. Un cliquet garde la règle, invisible autrement. */}
            {objet === "instruction" && (
              <Select
                name="standingId"
                label={t("Laquelle")}
                block
                value={quelle}
                onChange={setQuelle}
                options={instructions.map((i) => ({ value: i.id, label: t("{r} · {m} FCFA le {j}", { r: i.ref, m: fmt(i.montant), j: String(i.jour) }) }))}
              />
            )}

            {objet === "provision" && (
              <div className={styles.deux}>
                <label className="field">
                  {t("Montant prélevé chaque mois")}
                  <input name="amount" inputMode="numeric" placeholder="50 000" value={montant} {...groupedInput(setMontant)} />
                </label>
                <label className="field">
                  {t("Jour du mois ({a} à {b})", { a: String(jourMin), b: String(jourMax) })}
                  <input name="dayOfMonth" inputMode="numeric" placeholder="5" />
                </label>
              </div>
            )}

            <label className="field">
              {t("Plafond par échéance : nous ne prélèverons jamais plus")}
              <input name="maxAmount" inputMode="numeric" placeholder="100 000" value={plafond} {...groupedInput(setPlafond)} />
            </label>

            <div className={styles.deux}>
              <label className="field">
                {t("Titulaire du compte à débiter")}
                <input name="accountHolder" defaultValue={titulaireParDefaut} maxLength={80} />
              </label>
              <label className="field">
                {/* « Banque » seul est déjà le secteur d une société cotée : deuxième
                    fois dans la journée que ce mot court fait une clef fragile. */}
                {t("Banque du compte à débiter")}
                <input name="bankName" defaultValue={banqueParDefaut} maxLength={80} />
              </label>
            </div>
            <label className="field">
              {t("RIB ou IBAN du compte à débiter")}
              <input name="bankAccount" defaultValue={compteParDefaut} maxLength={60} />
            </label>
            <p className={styles.note}>{t("Ce compte doit être ouvert à votre nom. Nous ne présentons jamais de prélèvement sur le compte d'un tiers.")}</p>

            <div className={styles.actions}>
              <button type="button" className="btn ghost" onClick={() => setOuvert(false)}>
                {t("Annuler")}
              </button>
              <button className="btn primary" type="submit" disabled={creation}>
                {creation ? "…" : t("Préparer, puis signer")}
              </button>
            </div>
            <Msg state={creer} />
          </form>
        )}
      </section>

      {anciens.length > 0 && (
        <section className={styles.bloc}>
          <h2>{t("Révoqués")}</h2>
          {/* ILS RESTENT, et ce n'est pas de l'encombrement : une contestation
              porte sur un tirage passé, et une ligne effacée ne se conteste
              plus. */}
          <ul className={styles.liste}>
            {anciens.map((m) => (
              <li key={m.id} className={styles.ancien}>
                <span className="mono">{m.ref}</span> · {m.objet === "provision" ? t("Provision") : t("Épargne programmée")} · {t("révoqué le {d}", { d: fmtDate(m.revoqueLe ?? "") })}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
