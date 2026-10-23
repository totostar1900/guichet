import { requireSession } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { Annee, Ligne } from "../Ligne";
import { chargerLesRayons } from "../rayons";
import { Rayon, titreDuRayon } from "../Rayon";

export const dynamic = "force-dynamic";
export const generateMetadata = () => titreDuRayon("argent");

/** Versements, prélèvements, droits de garde : un mouvement d'argent sans trace consultable est la seule chose que la convention promet et que la page ne donnait pas. */
export default async function ArgentPage() {
  const t = await getT();
  const s = await requireSession("/moi/documents/argent");
  const { argent } = await chargerLesRayons(s.userId, t);
  return (
    <Rayon cle="argent">
      {argent.length === 0 && <p className="muted">{t("Vos versements, prélèvements et avis de garde paraîtront ici.")}</p>}
      {argent.map((x, i) => {
        const an = x.at.slice(0, 4);
        const avant = i > 0 ? argent[i - 1].at.slice(0, 4) : undefined;
        return (
          <div key={x.clef}>
            {an !== avant && <Annee an={an} />}
            <Ligne titre={x.titre} sous={x.sous} etat={x.etat} ton={x.ton} geste={x.geste} />
          </div>
        );
      })}
    </Rayon>
  );
}
