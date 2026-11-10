import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { prochaineEcheance, PREAVIS_JOURS } from "@/lib/domain/prelevement";
import { getT } from "@/i18n/server";
import { fmt, fmtDate, localIso } from "@/lib/format";
import styles from "../../page.module.css";
import barre from "@/components/mobile/BarreDEtape.module.css";
import { BarreCollante } from "@/components/mobile/BarreDEtape";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Par prélèvement") };
}

/**
 * APPROVISIONNER, DEUXIÈME ÉTAPE : LE PRÉLÈVEMENT (10 novembre 2026).
 *
 * Il se montre même sans mandat : une porte qui n'apparaît qu'à ceux qui l'ont déjà franchie n'ouvre sur personne. Il se CHANGE là où il vit, à /moi/prelevements : ce qu'on lit ici est un écho, pas un second domicile ; le bouton du bas y mène.
 */
export default async function PrelevementPage() {
  const t = await getT();
  const s = await requireSession("/moi/provision/alimenter/prelevement");
  const mandats = await repo()
    .listMandats(s.userId)
    .catch(() => []);
  const mandat = mandats.find((m) => m.objet === "provision" && m.state !== "revoque" && m.signedAt);
  const prochainTirage = mandat?.dayOfMonth ? prochaineEcheance(mandat.dayOfMonth, localIso(new Date())) : undefined;

  return (
    <Glissement>
      <div className={styles.wrap}>
        <EnTete
          surTitre={t("Mon argent chez nous")}
          titre={t("Par prélèvement")}
          phrase={t("C'est nous qui le prenons, sur votre compte en banque, sur une autorisation que vous avez signée.")}
          aCote={mandat ? <span className={`${styles.etiq} ${styles.etiqOn}`}>{t("Prélèvement actif")}</span> : undefined}
        />

        <div className={styles.chemin}>
          {mandat ? (
            <>
              <div className={styles.encadre}>
                <b>{mandat.amount ? t("{m} FCFA le {j} de chaque mois", { m: fmt(mandat.amount), j: String(mandat.dayOfMonth ?? "") }) : t("Mandat signé")}</b>
                <br />
                {t("Mandat")} <span className="mono">{mandat.ref}</span>
                {mandat.signedAt ? `, ${t("signé le {d}", { d: fmtDate(mandat.signedAt, false) })}` : ""}
                {prochainTirage ? ` · ${t("prochain prélèvement le {d}, annoncé {n} jours avant", { d: fmtDate(prochainTirage, false), n: String(PREAVIS_JOURS) })}` : ""}
                {mandat.state === "suspendu" ? ` · ${t("arrêté après deux mois refusés de suite par votre banque")}` : ""}
              </div>
              <div className={styles.gestesDeLEtat}>
                <Link href="/moi/prelevements">{t("Changer le montant")}</Link>
                <Link href="/moi/prelevements">{t("Révoquer le mandat")}</Link>
              </div>
              <p className={styles.avert}>{t("Chaque prélèvement est annoncé avant de partir, et nous ne prélevons jamais plus que le montant que vous avez signé.")}</p>
            </>
          ) : (
            <>
              <p className={styles.avert}>
                {t("Faites venir une somme fixe chaque mois, sans y penser. Vous signez l'autorisation une fois ; chaque prélèvement vous est annoncé cinq jours avant, et jamais au-delà du montant signé.")}
              </p>
              <div className={styles.rangee}>
                <Link className="btn sm" href="/moi/prelevements">
                  {t("Mettre en place un prélèvement")}
                </Link>
              </div>
              <p className={styles.avert}>{t("Vous fixez le montant et le jour, et vous l'arrêtez quand vous voulez.")}</p>
            </>
          )}
        </div>

        <BarreCollante>
          <Link href="/moi/provision/alimenter" className={`btn ${barre.retour}`}>
            {t("Retour")}
          </Link>
          <Link href="/moi/prelevements" className={`btn primary ${barre.suivant}`}>
            {mandat ? t("Changer le montant") : t("Mettre en place un prélèvement")}
          </Link>
        </BarreCollante>
      </div>
    </Glissement>
  );
}
