"use client";

import { useState, useTransition } from "react";
import { useT } from "@/i18n/client";
import { signerParPin } from "./actions";
import styles from "./page.module.css";
import { BarreDEtape } from "@/components/mobile/BarreDEtape";
import { ClavierCode } from "@/components/ClavierCode";
import { retirerMonOrdre } from "@/app/moi/counter-actions";
import barre from "@/components/mobile/BarreDEtape.module.css";

/**
 * SIGNER SON ORDRE AVEC LE PIN DU COMPTE, SUR UN SEUL ÉCRAN (23 novembre 2026, le client : « la signature se fait avec le pin code ; pas besoin d'afficher le PDF à l'écran »).
 *
 * Le récapitulatif de ce qu'on signe en haut, le clavier du code dessous. Plus de code à usage unique envoyé, attendu, renvoyé : le code à six chiffres qui ouvre l'application est la preuve. Le
 * dernier chiffre tapé signe ; la page de confirmation s'ouvre depuis le serveur. Le PDF n'est pas montré : il part par e-mail et sur WhatsApp à la signature.
 *
 * LES GESTES VIVENT DANS UNE BARRE COLLÉE AU BAS, comme sur la page du mandat : « Supprimer ». Il n'y a pas de « Modifier » : on ne change pas un ordre, on le supprime et on en passe un autre,
 * aux conditions du moment. Le retrait se confirme sur place, dans la barre ; le rappel qui arrive par « ?retirer » l'ouvre d'office.
 */
export function SignatureOrdre({
  id,
  ref_,
  ouvertDoffice,
  relire,
}: {
  id: string;
  ref_: string;
  ouvertDoffice?: boolean;
  /** Le récapitulatif et l'arbitrage, rendus par le serveur. */
  relire: React.ReactNode;
}) {
  const t = useT();
  const [confirme, setConfirme] = useState(Boolean(ouvertDoffice));
  const [erreur, setErreur] = useState<string | null>(null);
  const [essai, setEssai] = useState(0);
  const [enCours, start] = useTransition();

  const signer = (code: string) => {
    setErreur(null);
    start(async () => {
      const r = await signerParPin(id, code);
      /* Une signature acquise redirige depuis le serveur et ne revient pas ici. */
      if (r && !r.ok) {
        setErreur(r.error);
        setEssai((n) => n + 1);
      }
    });
  };

  return (
    <>
      <div className={styles.pas} aria-label={t("Étape {n} sur 2", { n: "2" })}>
        <i className={styles.pasOn} />
        <i className={styles.pasOn} />
        <span>{t("Étape 2 sur 2 · signer")}</span>
      </div>
      {relire}
      <section className={styles.signer}>
        <h2 className={styles.etapeTitre}>{t("Signez avec votre code")}</h2>
        <p className={styles.hint}>{t("Le code à six chiffres de votre compte. Votre exemplaire part ensuite par e-mail et sur WhatsApp.")}</p>
        <ClavierCode
          onFini={signer}
          occupe={enCours}
          cle={`signer${essai}`}
          enErreur={Boolean(erreur)}
          erreur={erreur ? <div className={styles.err} role="alert">{t(erreur)}</div> : undefined}
        />
      </section>

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
        ) : (
          <button className={`btn ${barre.retour}`} type="button" onClick={() => setConfirme(true)}>
            {t("Supprimer")}
          </button>
        )}
      </BarreDEtape>
    </>
  );
}
