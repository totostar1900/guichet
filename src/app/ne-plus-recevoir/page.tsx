import Link from "next/link";
import { repo } from "@/lib/data";
import { readOptOut } from "@/lib/channels";
import { COMPANY } from "@/lib/config";
import { getT } from "@/i18n/server";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ne plus recevoir" };

/**
 * Se désinscrire en un clic, sans compte.
 *
 * Quelqu'un qui ne veut plus de nos messages n'a aucune raison de retrouver un
 * mot de passe pour le dire. Le lien porte sa propre preuve, signée du sel de
 * la maison ; l'ouvrir coupe l'envoi, tout de suite, sans écran de
 * confirmation. Demander « êtes-vous sûr » à quelqu'un qui part est une façon
 * polie de ne pas l'écouter.
 *
 * Ce que cette page ne fait pas : ouvrir une session, montrer des données,
 * toucher aux messages de service. Un accusé de réception ou un avis d'opéré
 * découle d'un ordre passé et continue d'arriver ; la page le dit, pour que
 * personne ne croie avoir tout coupé.
 */
export default async function OptOutPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const t = await getT();
  const sp = await searchParams;
  const token = readOptOut(sp.t);
  let done = false;
  if (token) {
    try {
      if (token.channel === "email") await repo().setEmailOptIn(token.userId, false);
      else await repo().setContactOptIn(token.userId, false);
      await repo().logEvent({ kind: "system", html: `<b>Désinscription</b> : un client ne souhaite plus recevoir nos informations par ${token.channel === "email" ? "e-mail" : "WhatsApp"}` });
      done = true;
    } catch {
      done = false;
    }
  }
  const channel = token?.channel === "whatsapp" ? t("WhatsApp") : t("e-mail");
  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className="eyebrow">{COMPANY.name}</div>
        {done ? (
          <>
            <h1>{t("C'est fait.")}</h1>
            <p>{t("Vous ne recevrez plus nos informations ni nos opportunités par {c}.", { c: channel })}</p>
            <p className="muted">{t("Les messages liés à vos ordres continuent d'arriver : accusés de réception, avis de résultat, avis d'opéré, relevés. Ils découlent de ce que vous avez demandé et ne se refusent pas depuis ce lien.")}</p>
            <p className="muted">{t("Vous pouvez revenir sur ce choix à tout moment depuis Mon espace.")}</p>
          </>
        ) : (
          <>
            <h1>{t("Ce lien n'est plus valable.")}</h1>
            <p>{t("Il a peut-être expiré, ou la page a été ouverte sans lui. Le réglage se trouve dans Mon espace, à la ligne « Informations et opportunités ».")}</p>
          </>
        )}
        <div className={styles.foot}>
          <Link className="btn sm" href="/moi">
            {t("Mon espace")}
          </Link>
          <Link className="btn sm ghost" href="/">
            {t("Le Guichet")}
          </Link>
        </div>
      </div>
    </div>
  );
}
