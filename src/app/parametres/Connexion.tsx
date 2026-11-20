"use client";

import Link from "next/link";
import { useT } from "@/i18n/client";
import feuillet from "@/components/Feuillet.module.css";
import styles from "@/app/moi/appareil/page.module.css";

/**
 * COMMENT ON OUVRE GUICHET : LE CODE (20 novembre 2026, « retire l'empreinte maintenant »).
 *
 * Une ligne : le code de connexion, six chiffres, les mêmes sur tous les appareils, avec « Modifier » sur sa propre page. L'interrupteur « Face ID ou empreinte » est parti : le navigateur accorde aussi une clé d'accès au code d'écran du téléphone, que connaissent les proches, et n'offre aucun réglage pour n'accepter que la biométrie. L'empreinte reviendra avec une application native.
 */
export function Connexion({ aUnCode }: { aUnCode: boolean }) {
  const t = useT();
  return (
    <section className={feuillet.bloc}>
      <h2>{t("Connexion")}</h2>
      <div>
        <div className={styles.reglage}>
          <span>
            <b>{t("Code de connexion")}</b>
            <small>{t(aUnCode ? "Six chiffres, les mêmes sur tous vos appareils." : "Pas encore défini : Guichet vous le demandera à la prochaine ouverture.")}</small>
          </span>
          {aUnCode ? (
            <Link href="/parametres/code" className="btn sm">
              {t("Modifier")}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
