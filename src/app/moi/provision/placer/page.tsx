import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { cashPosition } from "@/lib/domain/cash";
import { getT } from "@/i18n/server";
import { PlacerLaProvision } from "../PlacerLaProvision";
import { estMonetaire } from "../monetaire";
import styles from "../page.module.css";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Placer votre provision") };
}

/**
 * PLACER CE QUI DORT, ET RIEN D'AUTRE SUR CETTE PAGE.
 *
 * Ce n'est pas un mouvement d'argent, et c'est pourquoi ce geste reste une
 * bande du sommaire quand les deux autres sont devenus des pastilles : la
 * somme ne sort pas de chez nous, elle devient des parts inscrites au nom du
 * client. Les deux pastilles sont les deux sens du robinet ; celui-ci est une
 * souscription.
 *
 * Le détail du mécanisme — pourquoi une souscription et non un compte
 * rémunéré — vit dans « PlacerLaProvision », avec le formulaire.
 */
export default async function PlacerPage() {
  const t = await getT();
  const s = await requireSession("/moi/provision/placer");
  const r = repo();
  const [cash, intents, offers] = await Promise.all([r.listCash(s.userId).catch(() => []), r.listIntents(), r.listOffers()]);
  const poche = cashPosition(
    cash,
    intents.filter((i) => i.clientId === s.userId),
  );
  const monetaires = offers.filter((o) => o.kind === "FONDS" && !o.hidden && o.fund?.distributed && estMonetaire(o.title, o.fund?.category));

  return (
    <Glissement>
      <div className={styles.wrap}>
        <EnTete
          retour={{ href: "/moi/provision", mot: t("Votre provision") }}
          surTitre={t("Votre provision")}
          titre={t("La faire travailler")}
          phrase={t("En parts d'un fonds monétaire, inscrites à votre nom. Le rendement est celui du fonds ; nous n'en promettons aucun.")}
        />
        <PlacerLaProvision
          disponible={Math.round(poche.idle)}
          fonds={monetaires.map((o) => ({ id: o.id, titre: o.title, gestionnaire: o.fund?.manager ?? o.issuer, droits: o.fund?.entryFeePct }))}
        />
      </div>
    </Glissement>
  );
}
