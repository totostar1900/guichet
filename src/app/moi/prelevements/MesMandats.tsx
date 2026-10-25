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
  /** L'exemplaire produit à la signature, s'il existe : la pièce que la banque réclame. */
  piece?: string;
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
  instructionDemandee,
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
  /** L'instruction qu'on vient de signer, quand on arrive de là. */
  instructionDemandee?: string;
}) {
  const t = useT();
  const [creer, creerAct, creation] = useActionState<MandatResult | null, FormData>(creerMandatAction, null);
  const [envoi, envoiAct, envoyant] = useActionState<MandatResult | null, FormData>(envoyerCodeMandatAction, null);
  const [sign, signAct, signant] = useActionState<MandatResult | null, FormData>(signerMandatAction, null);
  const [revoc, revocAct, revoquant] = useActionState<MandatResult | null, FormData>(revoquerMandatAction, null);
  const connue = instructions.some((i) => i.id === instructionDemandee);
  const vivants = mandats.filter((m) => m.etat !== "revoque");
  const anciens = mandats.filter((m) => m.etat === "revoque");
  const [objet, setObjet] = useState<"provision" | "instruction">(connue ? "instruction" : "provision");
  /* LE FORMULAIRE EST OUVERT QUAND IL N'Y A RIEN D'AUTRE À LIRE.
     Relevé le 25 octobre 2026 : un client arrivait de « Approvisionner votre
     compte » en cliquant « Mettre en place un prélèvement », et tombait sur un
     écran dont le seul contenu était un bouton « Préparer un mandat ». Deux
     clics pour la même intention, et le second n'apprend rien — c'est la page
     intermédiaire dans la page. Quand une autorisation existe déjà, le repli
     garde son sens : la liste est alors ce qu'on vient lire, et en ajouter une
     seconde est un geste délibéré. */
  const [ouvert, setOuvert] = useState(connue || vivants.length === 0);
  const [aRevoquer, setARevoquer] = useState<string | null>(null);
  const [quelle, setQuelle] = useState((connue && instructionDemandee) || instructions[0]?.id || "");
  /* Contrôlés, parce que le regroupement replace le curseur après chaque
     touche : un champ non contrôlé renverrait le curseur au bout. */
  const [montant, setMontant] = useState("");
  const [plafond, setPlafond] = useState("");

  return (
    <>
      {vivants.length > 0 && (
        <section className={styles.bloc}>
          <h2>{t("Vos autorisations")}</h2>
          <ul className={styles.liste}>
            {vivants.map((m) => (
              /* L'ANCRE DU RAPPEL : son second lien renvoie ici, sur le
                 mandat qui attend sa signature. Sans elle, le client qui a
                 cliqué « supprimer ce mandat » dans un message atterrissait
                 en haut d'une page et devait le retrouver. */
              <li key={m.id} className={styles.mandat} id={m.signeLe ? undefined : "mandat"}>
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
                  <>
                    {/* LA CONFIRMATION DE LA SIGNATURE SURVIT AU FORMULAIRE
                        QU'ELLE CONFIRME. Relevé en jouant le parcours le
                        25 octobre 2026 : le message « Mandat signé » vivait
                        dans le bloc de signature, et signer fait disparaître ce
                        bloc — donc le message. Le client voyait la carte
                        changer d'état sans qu'une ligne le lui dise, ce qui
                        est indiscernable d'un geste qui n'a pas abouti. C'est
                        la même panne que sur le compte de règlement du desk,
                        le même jour, pour la même raison. */}
                    {sign?.ok && sign.message ? <p className={styles.ok}>{t(sign.message)}</p> : null}
                    <p className={styles.note}>
                      {t("Signé le {d}. Votre banque peut vous demander cet exemplaire.", { d: fmtDateTime(m.signeLe) })}{" "}
                      {/* L'ADRESSE DE LA PIÈCE, et non sa description : « dans
                          vos documents » faisait traverser trois écrans pour
                          trouver le seul papier qu'une agence réclame. */}
                      <Link href={m.piece ? `/moi/documents/${m.piece}?de=${encodeURIComponent("/moi/prelevements")}` : "/moi/documents/signes"}>{t("Ouvrir mon exemplaire →")}</Link>
                    </p>
                  </>
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
                    derrière un message au desk reviendrait à la supprimer.

                    ON NE RÉVOQUE PAS CE QUI N'A JAMAIS EU COURS. Un mandat
                    préparé et jamais signé n'autorise rien : « révoquer » y
                    décrit l'annulation d'un pouvoir qu'on n'a pas donné, et
                    le mot fait hésiter celui qui voudrait simplement effacer
                    un brouillon. Il se supprime, et le reste se révoque. */}
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
                      {revoquant ? "…" : t(m.signeLe ? "Révoquer" : "Supprimer")}
                    </button>
                  </form>
                ) : (
                  <button type="button" className="btn sm" onClick={() => setARevoquer(m.id)}>
                    {t(m.signeLe ? "Révoquer ce mandat" : "Supprimer ce mandat")}
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

            {/* UN SEUL MONTANT POUR LA PROVISION. Le plafond protège le jour
                où le montant pourrait changer sans le client, ce qui est le cas
                d'une épargne programmée dont le montant vient de l'instruction.
                Ici le client écrit lui-même son montant : deux chiffres pour un
                seul étaient une friction sans contrepartie. Le plafond existe
                toujours, il vaut le montant, et la phrase le dit. */}
            {objet === "provision" ? (
              <p className={styles.note}>{t("Ce montant est aussi votre plafond : nous ne prélèverons jamais plus, et jamais autre chose.")}</p>
            ) : (
              <label className="field">
                {t("Plafond par échéance : nous ne prélèverons jamais plus")}
                <input name="maxAmount" inputMode="numeric" placeholder="100 000" value={plafond} {...groupedInput(setPlafond)} />
              </label>
            )}

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
