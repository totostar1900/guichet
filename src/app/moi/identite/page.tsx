import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { getT } from "@/i18n/server";
import { Glissement, LienRetour } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";
import { Identite } from "./Identite";
import styles from "@/components/Feuillet.module.css";

export const dynamic = "force-dynamic";
/** The tab and the phone header read this title: in the reader's language. */
export async function generateMetadata() {
  const t = await getT();
  return { title: t("Qui vous êtes") };
}

/**
 * LA PREMIÈRE PAGE DU COMPTE : TROIS LIGNES, ET RIEN D'AUTRE.
 *
 * Le nom, la ville, l'adresse et le numéro étaient le haut de la feuille du
 * compte — au-dessus d'une recherche, de huit tuiles et d'un pied légal. Ce
 * sont pourtant les SEULES choses de cette feuille qui parlent de la personne
 * et ne vivent nulle part ailleurs ; tout le reste était de la navigation.
 * Elles ont donc la page, et la feuille n'a plus de raison d'exister.
 *
 * LES CANAUX SE LISENT ICI ET SE CHANGENT AILLEURS, et ce n'est pas une
 * inconséquence : lire son adresse est un coup d'œil, en changer est une
 * procédure — un code part, et il faut le rendre. « Sécurité » porte déjà
 * cette procédure avec les clés et les appareils ; la refaire ici en ferait
 * une seconde, qui divergerait au premier correctif. La page montre donc
 * l'état et le lien, et dit à quoi sert la preuve.
 *
 * LES DEUX CANAUX VIENNENT DE LA TABLE, PAS DE LA SESSION. Un jeton dure, une
 * adresse change : lire `s.email` afficherait celle qui avait cours à
 * l'ouverture de la session. On prend donc le contact, et la session ne sert
 * que de repli pour un compte qui n'a encore rien d'enregistré.
 */
export default async function IdentitePage() {
  const s = await requireSession("/moi/identite");
  const t = await getT();
  const r = repo();

  const [canaux, contact] = await Promise.all([
    r.getChannelStatus(s.userId).catch(() => undefined),
    r.getContact(s.userId).catch(() => undefined),
  ]);

  const email = canaux?.email ?? contact?.email ?? s.email;
  const phone = canaux?.phone ?? contact?.phone ?? s.phone;

  return (
    <Glissement>
        <div className={styles.page}>
          <EnTete
            retour={{ href: "/moi/compte", mot: t("Votre compte") }}
            surTitre={t("Vous")}
            titre={t("Qui vous êtes")}
            phrase={t("Le nom qui s'imprime sur vos bulletins, et les deux canaux par lesquels la maison vous joint et vous fait signer.")}
          />

          <Identite
            nom={s.name}
            segment={s.segment}
            email={email}
            emailOk={Boolean(canaux?.emailVerifiedAt)}
            phone={phone}
            phoneOk={Boolean(canaux?.phoneVerifiedAt)}
          />
        </div>
    </Glissement>
  );
}
