import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { cashPosition } from "@/lib/domain/cash";
import { getT } from "@/i18n/server";
import { fmt } from "@/lib/format";
import { DemanderVersement } from "@/app/DemanderVersement";
import styles from "../page.module.css";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Reprendre votre provision") };
}

/**
 * FAIRE SORTIR L'ARGENT, ET RIEN D'AUTRE SUR CETTE PAGE.
 *
 * Le formulaire vivait au troisième rang de quatre encadrés, sous un champ de
 * montant qui servait à placer : deux champs de montant sur un écran, pour
 * deux gestes opposés. Ici il est seul, et le compte de destination se lit
 * au-dessus de lui.
 *
 * UN SEUL COMPTE EST POSSIBLE, celui déclaré à l'ouverture : le nommer avant
 * la demande évite au client de se demander où l'argent va partir — et c'est
 * la seule garantie qui compte contre un détournement.
 */
export default async function ReprendrePage() {
  const t = await getT();
  const s = await requireSession("/moi/provision/reprendre");
  const r = repo();
  const [cash, intents, payouts, file] = await Promise.all([
    r.listCash(s.userId).catch(() => []),
    r.listIntents(),
    r.listPayouts({ userId: s.userId }).catch(() => []),
    r.getClientFileByUser(s.userId).catch(() => undefined),
  ]);
  const poche = cashPosition(
    cash,
    intents.filter((i) => i.clientId === s.userId),
  );
  /* La demande ouverte s'il y en a une, sinon la dernière réponse reçue : un
     refus motivé que le client ne verrait pas le laisserait attendre un
     virement sans savoir pourquoi. */
  const derniereDemande = payouts.find((p) => p.state === "demandee") ?? [...payouts].sort((x, y) => y.askedAt.localeCompare(x.askedAt))[0];
  const compte = file?.funds.bankName ? `${file.funds.bankName}${file.funds.bankAccount ? ` …${file.funds.bankAccount.replace(/\s/g, "").slice(-4)}` : ""}` : undefined;

  return (
    <Glissement>
      <div className={styles.wrap}>
        <EnTete
          retour={{ href: "/moi/provision", mot: t("Votre provision") }}
          surTitre={t("Votre provision")}
          titre={t("La reprendre")}
          phrase={t("Versée sur le compte déclaré à l'ouverture, et sur lui seul, sous 72 heures ouvrables.")}
        />

        <div className={styles.gCorps}>
          {/* CE QUI PEUT PARTIR, ET OÙ. Ce qui est mis de côté par un ordre
              signé ne se reprend pas : la page du solde dit pourquoi, et le
              chiffre d'ici est donc le disponible, pas le solde. */}
          <div className={styles.encadre}>
            <b>{t("{m} FCFA disponibles", { m: fmt(Math.round(poche.idle)) })}</b>
            <br />
            {compte ? t("vers {c}, le compte déclaré à l'ouverture", { c: compte }) : t("vers le compte bancaire déclaré à l'ouverture")}
          </div>
          <DemanderVersement montant={poche.idle} demande={derniereDemande} />
          {/* LE VIDE SE DIT. Le bouton disparaît à solde nul — c'est juste, on
              ne demande pas zéro — mais une page qui ne montre alors qu'un
              encadré et une note laisse croire à une panne. */}
          {poche.idle <= 0 && !derniereDemande && <p className={styles.avert}>{t("Rien à reprendre pour l'instant : votre disponible est à zéro.")}</p>}
          <p className={styles.avert}>{t("Il part dans les soixante-douze heures ouvrables qui suivent votre demande, et le desk recalcule au moment du virement : un coupon qui tombe d'ici là s'y ajoute.")}</p>
        </div>
      </div>
    </Glissement>
  );
}
