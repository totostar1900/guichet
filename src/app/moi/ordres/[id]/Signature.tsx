"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useT } from "@/i18n/client";
import { envoyerCodeOrdreAction, signerOrdreAction, type OrdreResult } from "./actions";
import styles from "./page.module.css";
import { BarreDEtape } from "@/components/mobile/BarreDEtape";
import { retirerMonOrdre } from "@/app/moi/counter-actions";
import barre from "@/components/mobile/BarreDEtape.module.css";

/**
 * SIGNER SON ORDRE, PAR LE CODE QUI SERT DÉJÀ À LA CONVENTION — ET PAR LUI SEUL (16 novembre 2026 : « toute signature se fait avec un code »).
 * Plus de Face ID ni d'empreinte sur cette page : un seul geste de signature, donc une seule preuve à expliquer.
 *
 * LES GESTES VIVENT DANS UNE BARRE COLLÉE AU BAS, toujours visible, comme sur la page du mandat : le geste qui attend (recevoir le code, puis signer) et « Supprimer »
 * côte à côte. Il n'y a pas de « Modifier » : on ne change pas un ordre, on le supprime et on en passe un autre, aux conditions du moment. Le retrait se confirme
 * sur place, dans la barre ; le rappel qui arrive par « ?retirer » l'ouvre d'office.
 *
 * DEUX ÉTAPES, UN BOUTON PAR ÉTAPE (17 novembre 2026, planche « Signer et suivre », 3A) : « relire » (le récapitulatif, l'arbitrage, puis « Recevoir le code ») et « code » (le champ, le temps qui reste,
 * puis « Je signe mon ordre »). Les deux vivent sur la même adresse : l'étape se lit du code déjà envoyé, donc un rechargement retombe sur le code. « Retour » revient à la relecture sans
 * perdre le code. La signature acquise ouvre la page de confirmation, où le message ne disparaît plus.
 *
 * Même mécanisme, même preuve, même vocabulaire : il n'y a rien de nouveau à
 * apprendre, et c'est le but. Trois choses que cette journée a prouvées
 * nécessaires s'y retrouvent : la destination nommée AVANT l'envoi, le temps
 * qui reste, et « Je n'ai rien reçu ».
 */
function useReste(depuis: string | undefined, duree: number): number | null {
  const [reste, setReste] = useState<number | null>(null);
  useEffect(() => {
    if (!depuis) return;
    const fin = new Date(depuis).getTime() + duree;
    const battre = () => setReste(Math.max(0, Math.ceil((fin - Date.now()) / 1000)));
    battre();
    const id = setInterval(battre, 1000);
    return () => clearInterval(id);
  }, [depuis, duree]);
  return depuis ? reste : null;
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function SignatureOrdre({
  id,
  ref_,
  canal,
  codeEnvoyeLe,
  ouvertDoffice,
  relire,
  resume,
}: {
  id: string;
  ref_: string;
  canal?: { to: string; channel: "whatsapp" | "email" };
  codeEnvoyeLe?: string;
  ouvertDoffice?: boolean;
  /** L'étape 1, rendue par le serveur : le récapitulatif et l'arbitrage. */
  relire: React.ReactNode;
  /** L'étape 2 : ce qu'on signe, en une ligne. */
  resume: { titre: string; chiffre: string };
}) {
  const t = useT();
  const [envoi, envoyer, envoiEnCours] = useActionState<OrdreResult | null, FormData>(envoyerCodeOrdreAction, null);
  const [sign, signer, signEnCours] = useActionState<OrdreResult | null, FormData>(signerOrdreAction, null);
  const [code, setCode] = useState("");
  const [confirme, setConfirme] = useState(Boolean(ouvertDoffice));
  const [retour, setRetour] = useState(false);
  /* L'INSTANT D'ENVOI SE POSE UNE FOIS, à l'arrivée de la réponse. Recalculé à chaque rendu (« new Date() » en clair), il repartait de zéro à chaque seconde : le compte à rebours restait
     figé à « 45 s », « Renvoyer » ne se rouvrait jamais et « ce code reste valable 10:00 » ne baissait pas (mesuré le 16 novembre 2026). */
  const partiLe = useMemo(() => (envoi?.ok ? new Date().toISOString() : undefined), [envoi]);
  const parti = partiLe ?? codeEnvoyeLe;
  const attente = useReste(parti, 45_000);
  const validite = useReste(parti, 10 * 60_000);
  const envoye = Boolean(parti) && validite !== 0;
  const expire = Boolean(parti) && validite === 0;
  /* L'ÉTAPE SE LIT DU CODE : envoyé, on est à l'étape du code, sauf si le client est revenu relire. */
  const enCode = Boolean(parti) && !retour && !confirme;

  const marque = (n: 1 | 2) => (
    <div className={styles.pas} aria-label={t("Étape {n} sur 2", { n: String(n) })}>
      <i className={styles.pasOn} />
      <i className={n === 2 ? styles.pasOn : undefined} />
      <span>{n === 1 ? t("Étape 1 sur 2 · relire") : t("Étape 2 sur 2 · code")}</span>
    </div>
  );
  const via = canal ? t(canal.channel === "email" ? "Le code part par e-mail, à" : "Le code part par WhatsApp, au") : "";

  return (
    <>
      {!enCode ? (
        <>
          {marque(1)}
          {relire}
          <section className={styles.signer}>
            {canal ? (
              <p className={styles.destinataire}>
                {via} <b>{canal.to}</b>
              </p>
            ) : (
              <p className={styles.hint}>{t("Aucun canal d'envoi n'est configuré : le code s'affichera à l'écran.")}</p>
            )}
            {envoi && !envoi.ok && <div className={styles.err}>{envoi.error}</div>}
          </section>
        </>
      ) : (
        <>
          {marque(2)}
          <section className={styles.signer}>
            <h2 className={styles.etapeTitre}>{t("Saisissez le code")}</h2>
            <p className={styles.hint}>{canal ? t(canal.channel === "email" ? "Envoyé par e-mail, à {o}." : "Envoyé par WhatsApp, au {o}.", { o: canal.to }) : t("Aucun canal d'envoi n'est configuré : le code s'affiche à l'écran.")}</p>
            <div className={styles.resume}>
              <span>{t("Vous signez")}</span>
              <b>{resume.titre}</b>
              <small>{resume.chiffre}</small>
            </div>
            {envoi?.ok && envoi.code && (
              <div className={styles.demo}>
                {t("Code de démonstration :")} <b className="mono">{envoi.code}</b>
              </div>
            )}
            <form id="f-sign" action={signer} className={styles.bloc}>
              <input type="hidden" name="id" value={id} />
              <label className="field">
                {t("Code reçu")}
                <input name="code" className={styles.codeChamp} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" maxLength={6} placeholder={t("6 chiffres")} autoComplete="one-time-code" />
              </label>
            </form>
            <p className={styles.attente}>
              {expire ? t("Ce code a expiré : demandez-en un autre.") : validite ? t("Ce code reste valable {t}.", { t: mmss(validite) }) : null}{" "}
              <button className={styles.lien} type="submit" form="f-envoi" disabled={envoiEnCours || Boolean(attente)}>
                {envoiEnCours ? "…" : attente ? t("Renvoyer dans {s} s", { s: String(attente) }) : t("Renvoyer un code")}
              </button>
            </p>
            {envoi && !envoi.ok && <div className={styles.err}>{envoi.error}</div>}
            {sign && !sign.ok && <div className={styles.err}>{sign.error}</div>}
            <details className={styles.aide}>
              <summary>{t("Je n'ai rien reçu")}</summary>
              <ul>
                {canal && <li>{t(canal.channel === "email" ? "Regardez la boîte {o}, courrier indésirable compris." : "Regardez les messages du numéro {o}.", { o: canal.to })}</li>}
                <li>{t("Un code vaut dix minutes ; passé ce délai, demandez-en un autre.")}</li>
                <li>{t("Rien ne marche ? Écrivez-nous depuis vos messages : votre ordre vous attend ici.")}</li>
              </ul>
            </details>
          </section>
        </>
      )}

      {/* LES FORMULAIRES DE LA BARRE sont posés hors d'elle et adressés par « form » : la barre ne porte que des boutons. */}
      <form id="f-envoi" action={envoyer}>
        <input type="hidden" name="id" value={id} />
      </form>
      <form id="f-retrait" action={retirerMonOrdre}>
        <input type="hidden" name="intentId" value={id} />
      </form>
      {/* CE QU'ON PERD EST DIT AVANT, JAMAIS APRÈS : un ordre supprimé ne revient pas, ce n'est pas une pause. */}
      <BarreDEtape indice={confirme ? t("Supprimer l'ordre {r} ? Il ne partira pas. Pour le replacer, il faudra en passer un nouveau, aux conditions du moment.", { r: ref_ }) : undefined}>
        {confirme ? (
          <>
            <button className={`btn primary ${barre.suivant}`} type="submit" form="f-retrait">
              {t("Oui, supprimer")}
            </button>
            <button className={`btn ${barre.retour}`} type="button" onClick={() => setConfirme(false)}>
              {t("Annuler")}
            </button>
          </>
        ) : enCode ? (
          <>
            <button className={`btn primary ${barre.suivant}`} type="submit" form="f-sign" disabled={signEnCours || code.length < 6}>
              {signEnCours ? "…" : t("Je signe mon ordre")}
            </button>
            <button className={`btn ${barre.retour}`} type="button" onClick={() => setRetour(true)}>
              {t("Retour")}
            </button>
          </>
        ) : (
          <>
            {envoye ? (
              <button className={`btn primary ${barre.suivant}`} type="button" onClick={() => setRetour(false)}>
                {t("Saisir le code")}
              </button>
            ) : (
              <button className={`btn primary ${barre.suivant}`} type="submit" form="f-envoi" disabled={envoiEnCours} onClick={() => setRetour(false)}>
                {envoiEnCours ? "…" : t("Recevoir le code")}
              </button>
            )}
            <button className={`btn ${barre.retour}`} type="button" onClick={() => setConfirme(true)}>
              {t("Supprimer")}
            </button>
          </>
        )}
      </BarreDEtape>
    </>
  );
}
