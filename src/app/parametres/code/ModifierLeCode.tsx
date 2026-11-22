"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/client";
import { ClavierCode } from "@/components/ClavierCode";
import { MessageDAttente } from "@/components/MessageDAttente";
import { codeDeCetAppareil, deviceLabel, enregistrerLeCode, newDeviceToken, readDevice } from "@/lib/device-client";
import { logoutVersLaPorte } from "@/app/connexion/actions";
import { reculer } from "@/components/mobile/retour";
import { modifierLeCode, verifierLeCode } from "@/app/verrou/actions";
import { enrolPin, forgetDeviceAction } from "@/app/moi/securite/actions";
import styles from "./modifier.module.css";

type Etape = "actuel" | "nouveau" | "confirmer" | "fait";

/**
 * CHANGER LE CODE, PAS À PAS (19 novembre 2026, planche « Paramètres et connexion », 3A).
 *
 * Le code ACTUEL d'abord (le client l'a exigé), puis le nouveau, puis encore le nouveau. Une erreur s'écrit sous les ronds et le clavier se vide. Un code accepté se termine par une coche animée et « Terminer ».
 *
 * Changer le code du compte oublie les codes des autres navigateurs (leurs chiffres ne seraient plus les mêmes) : celui de CE navigateur reprend donc les nouveaux chiffres, pour que la porte l'ouvre encore.
 */
/* LE RETOUR REVIENT OÙ ÉTAIT LE LIEN (21 novembre 2026, le client : « le bouton retour dans la page Paramètres renvoie sur des hauteurs différentes »). « Terminer » et « Annuler » REMPLAÇAIENT l'écran par « /parametres » : l'historique gardait deux fois la page Paramètres, l'une à l'endroit du lien « Changer le code », l'autre en haut. Selon qu'on sortait par ces boutons ou par la flèche, on retombait à des hauteurs différentes, et la flèche suivante revenait encore sur Paramètres. Ils reculent maintenant dans l'historique (`reculer`) : on retrouve la page à la hauteur où on l'a quittée, et la flèche du haut dit la même chose. */
export function ModifierLeCode({ aUnCode }: { aUnCode: boolean }) {
  const t = useT();
  const routeur = useRouter();
  const [etape, setEtape] = useState<Etape>(aUnCode ? "actuel" : "nouveau");
  const [actuel, setActuel] = useState("");
  const [premier, setPremier] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, start] = useTransition();

  const TITRES: Record<Exclude<Etape, "fait">, [string, string]> = {
    actuel: ["Votre code actuel", "Saisissez le code que vous utilisez aujourd'hui."],
    nouveau: ["Choisissez un nouveau code", "Six chiffres, les mêmes sur tous vos appareils."],
    confirmer: ["Saisissez-le encore", "Pour éviter toute faute de frappe."],
  };

  const saisi = (c: string) =>
    start(async () => {
      setErreur(null);
      if (etape === "actuel") {
        const v = await verifierLeCode(c);
        if (!v.ok) {
          setErreur(v.error);
          if (v.bloque) await logoutVersLaPorte();
          return;
        }
        setActuel(c);
        setEtape("nouveau");
        return;
      }
      if (etape === "nouveau") {
        setPremier(c);
        setEtape("confirmer");
        return;
      }
      if (c !== premier) {
        setPremier("");
        setEtape("nouveau");
        setErreur("Les deux codes ne sont pas identiques. Recommencez.");
        return;
      }
      const r = await modifierLeCode(actuel, c);
      if (!r.ok) {
        setPremier("");
        setEtape("nouveau");
        setErreur(r.error);
        if (r.bloque) await logoutVersLaPorte();
        return;
      }
      /* Le code de ce navigateur reprend les mêmes chiffres : le serveur a oublié les anciens. */
      const ici = readDevice();
      const ancien = codeDeCetAppareil(ici);
      if (ici && ancien) {
        await forgetDeviceAction(ancien.id).catch(() => undefined);
        const token = newDeviceToken();
        const e = await enrolPin(token, c, deviceLabel());
        if (e.ok) {
          const nouveau = { id: e.device.id, token, who: ici.who, name: e.device.name, since: e.device.createdAt };
          enregistrerLeCode(nouveau);
        }
      }
      setEtape("fait");
    });

  if (etape === "fait") {
    return (
      <div className={styles.page}>
        <div className={styles.fait} role="status">
          <svg viewBox="0 0 52 52" width="96" height="96" aria-hidden="true">
            <circle className={styles.rond} cx="26" cy="26" r="24" fill="none" />
            <path className={styles.coche} d="M15 27l8 8 14-16" fill="none" />
          </svg>
          <h1 className="display">{t("Code modifié")}</h1>
          <p>{t("Votre nouveau code ouvre Guichet sur tous vos appareils.")}</p>
        </div>
        <button type="button" className={styles.terminer} onClick={() => reculer(routeur, "/parametres")}>
          {t("Terminer")}
        </button>
      </div>
    );
  }
  const [titre, phrase] = TITRES[etape];
  return (
    <div className={styles.page}>
      <h1 className="display">{t(titre)}</h1>
      <p>{t(phrase)}</p>
      <ClavierCode onFini={saisi} occupe={enCours} cle={etape} erreur={erreur ? <div className={styles.erreur} role="alert">{t(erreur)}</div> : enCours ? <MessageDAttente /> : null} enErreur={Boolean(erreur)} />
      <button type="button" className={styles.annuler} onClick={() => reculer(routeur, "/parametres")}>
        {t("Annuler")}
      </button>
    </div>
  );
}
