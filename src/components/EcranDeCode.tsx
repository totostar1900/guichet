"use client";

import { useT } from "@/i18n/client";
import { ClavierCode } from "@/components/ClavierCode";
import styles from "./EcranDeCode.module.css";

/**
 * L'ÉCRAN DE CODE, AU PLUS PETIT (19 novembre 2026, le client : « coller à Revolut et minimiser l'écran »).
 *
 * Un mot de bienvenue avec le prénom, six ronds, le clavier ; l'empreinte est la touche en bas à gauche, « Code oublié ? » le seul lien. Rien d'autre : ni titre de page, ni phrase, ni bouton de plus. La porte de connexion et le verrou de l'application le partagent : un seul geste, un seul écran.
 */
export function EcranDeCode({ titre, prenom, onFini, occupe, cle, erreur, empreinte, onOubli, enAttente }: { titre?: string; prenom?: string; onFini: (code: string) => void; occupe: boolean; cle: string; erreur?: string | null; empreinte?: () => void; onOubli?: () => void; /** une phrase brève sous les ronds quand le téléphone demande déjà quelque chose */ enAttente?: string | null }) {
  const t = useT();
  const mot = titre ? t(titre) : prenom ? t("Bonjour {prenom}", { prenom }) : t("Bonjour");
  return (
    <div className={styles.ecran} aria-live="polite">
      <h1 className="display">{mot}</h1>
      <ClavierCode
        onFini={onFini}
        occupe={occupe}
        cle={cle}
        erreur={erreur ? <div className={styles.erreur} role="alert">{t(erreur)}</div> : enAttente ? <div className={styles.attente}>{t(enAttente)}</div> : <div className={styles.attente} aria-hidden="true">&nbsp;</div>}
        empreinte={empreinte ? { onClick: empreinte, label: t("Utiliser Face ID ou l'empreinte") } : undefined}
      />
      {onOubli && (
        <button type="button" className={styles.lien} onClick={onOubli} disabled={occupe}>
          {t("Code oublié ?")}
        </button>
      )}
    </div>
  );
}
