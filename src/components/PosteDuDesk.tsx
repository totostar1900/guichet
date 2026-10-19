"use client";

import Link from "next/link";
import { useState } from "react";
import { Sheet } from "@/components/mobile/Sheet";
import { LangSwitch } from "@/components/LangSwitch";
import { useT } from "@/i18n/client";
import { logout, logoutEverywhere } from "@/app/connexion/actions";
import type { Poste } from "@/lib/desk/poste";
import styles from "./PosteDuDesk.module.css";

/**
 * LA FEUILLE DU COMPTE, AU DESK : « Votre poste ».
 *
 * ELLE NE VIT PAS SOUS « components/desk », et un cliquet l a dit : la mise
 * en page sert les DEUX hôtes, donc elle ne peut pas citer un module réservé
 * au desk. Même chemin que « RailSections » le 2 octobre et « Poignee » le
 * 19. Ce qui protège le client n est pas le dossier mais la garde « deskUi »,
 * qui décide de monter cette feuille ou celle du Guichet.
 *
 * Celle du Guichet répondait à « qui suis-je comme CLIENT » : identité,
 * canaux prouvés, notifications, statut KYC, palier. Un opérateur n'a rien de
 * tout cela, et la feuille lui montrait des cases vides sous un « Bonjour ».
 *
 * Celle-ci répond à deux questions, et à aucune autre : CE QUE MON RÔLE
 * AUTORISE, et CE QUE J'AI FAIT AUJOURD'HUI.
 *
 * LE TITRE N'EST PAS UN SALUT. Un salut convient à qui vient rarement. Un
 * opérateur ouvre cette feuille pour vérifier un droit avant d'agir, ou pour
 * retrouver une approbation : le nom et le rôle sont déjà dans l'en-tête, et
 * « Bonjour » prendrait la ligne la plus visible pour ne rien dire.
 *
 * LES DROITS SE LISENT, ILS NE SE CHANGENT PAS ICI. La tentation serait d'y
 * mettre les boutons. Mais un droit ne se donne pas à soi-même : ces lignes
 * reflètent ce que l'Équipe et le Référentiel ont arrêté, et chacune mène à
 * la page qui en répond. Une feuille de compte qui modifierait des droits
 * serait le seul endroit de la maison où l'on s'autoriserait soi-même.
 */
export function PosteDuDesk({ nom, poste, build, dock }: { nom: string; poste: Poste; build?: string; dock?: "top-right" | "bottom-left" }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const responsable = poste.role === "responsable";
  const initiales = nom
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <button type="button" className={styles.bouton} onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open} title={nom}>
        <span className={styles.av}>{initiales}</span>
        <span className={styles.qui}>
          <b>{nom}</b>
          <span>{responsable ? t("Responsable du desk") : t("Opérateur")}</span>
        </span>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} navy dock={dock ?? "bottom-left"} tall title={t("Votre poste")} sub={nom} action={<LangSwitch compact />}>
        <section className={styles.bloc}>
          <h3 className={styles.gl}>{t("Ce que votre rôle autorise")}</h3>
          <div className={styles.droits}>
            <Droit oui>{t("Passer un ordre pour un client, dans son plafond")}</Droit>
            <Droit oui={responsable}>{t("Publier une note de marché et une actualité")}</Droit>
            <Droit oui={responsable}>{t("Donner le second regard sur un accès ou un plafond")}</Droit>
            <Droit oui={responsable}>{t("Écarter une personne, et lever une mesure")}</Droit>
            {/* CE QUE PERSONNE NE PEUT, et qui mérite d'être dit : une règle
                qu'on découvre en se faisant refuser est une règle mal posée. */}
            <Droit oui={false}>{t("Approuver ce que vous avez vous-même demandé")}</Droit>
          </div>
          <p className={styles.renvoi}>
            {t("Ces droits viennent de")} <Link href="/desk/equipe">{t("Équipe")}</Link> {t("et du")} <Link href="/desk/referentiel">{t("Référentiel")}</Link>
            {t(" : ils se lisent ici, ils se changent là-bas.")}
          </p>
        </section>

        <section className={styles.bloc}>
          <h3 className={styles.gl}>{t("Votre journée")}</h3>
          <div className={styles.chiffres}>
            <span className={styles.ch}>
              <b>{poste.gestes}</b>
              <span>{t("gestes posés")}</span>
            </span>
            <span className={styles.ch}>
              <b>{poste.signatures}</b>
              <span>{t("signatures")}</span>
            </span>
            <span className={`${styles.ch} ${poste.aRegarder.length ? styles.appelle : ""}`}>
              <b>{poste.aRegarder.length}</b>
              <span>{t("attendent votre regard")}</span>
            </span>
          </div>
          {poste.aRegarder.length > 0 && (
            <div className={styles.att}>
              {poste.aRegarder.map((a) => (
                <Link key={a.id} href="/desk/approbations" onClick={() => setOpen(false)}>
                  <span className={styles.nm}>{a.quoi}</span>
                  <em>{a.depuis.slice(0, 10)}</em>
                </Link>
              ))}
            </div>
          )}
          {/* ON DIT CE QU'ON CACHE. Un compteur qui tombe sans rien dire
              laisse croire à une panne ; « deux personnes, pas deux rôles »
              se dit, elle ne se devine pas. */}
          {poste.siennes > 0 && (
            <p className={styles.bloque}>
              <b>{poste.siennes === 1 ? t("Une approbation ne vous est pas montrée") : t("{n} approbations ne vous sont pas montrées", { n: poste.siennes })}</b>
              {t(" : vous les avez demandées. Deux personnes, pas deux rôles.")}
            </p>
          )}
        </section>

        <section className={styles.bloc}>
          <h3 className={styles.gl}>{t("Votre siège")}</h3>
          <Siege />
        </section>

        <section className={styles.bloc}>
          <h3 className={styles.gl}>{t("Cette session")}</h3>
          <dl className={styles.sess}>
            <div>
              <dt>{t("Rôle")}</dt>
              <dd>{responsable ? t("Responsable du desk") : t("Opérateur")}</dd>
            </div>
            {build && (
              <div>
                <dt>{t("Version servie")}</dt>
                <dd className="mono">{build}</dd>
              </div>
            )}
          </dl>
          <form action="/api/deconnexion" method="post" className={styles.sortir}>
            <button type="submit">{t("Se déconnecter")}</button>
          </form>
        </section>
      </Sheet>
    </>
  );
}

function Droit({ oui, children }: { oui?: boolean; children: React.ReactNode }) {
  return (
    <span className={`${styles.droit} ${oui ? styles.peut : styles.pasPeut}`}>
      <i aria-hidden="true">{oui ? "✓" : "·"}</i>
      <span>{children}</span>
    </span>
  );
}

/**
 * LE SIÈGE : ce qui vit dans CE navigateur et ne voyage pas.
 *
 * La largeur de la colonne et les favoris sont des réglages de poste, pas des
 * données de la maison. On les montre ici parce que c'est le seul endroit où
 * l'on pense à les défaire, et on les remet à zéro sans détour.
 */
function Siege() {
  const t = useT();
  const [favoris, setFavoris] = useState<number | null>(null);
  const lire = () => {
    try {
      return (JSON.parse(localStorage.getItem("guichet:colonne:epingles") ?? "[]") as string[]).length;
    } catch {
      return 0;
    }
  };
  const n = favoris ?? (typeof window === "undefined" ? 0 : lire());
  const vider = (clef: string) => {
    try {
      localStorage.removeItem(clef);
    } catch {
      /* sans stockage, il n'y avait rien à vider */
    }
    setFavoris(lire());
    location.reload();
  };
  return (
    <div className={styles.reglages}>
      <span className={styles.reglage}>
        <span className={styles.nm}>{t("Favoris de la colonne")}</span>
        <span className="mono">{n}</span>
        {n > 0 && (
          <button type="button" className={styles.lien} onClick={() => vider("guichet:colonne:epingles")}>
            {t("vider")}
          </button>
        )}
      </span>
      <span className={styles.reglage}>
        <span className={styles.nm}>{t("Largeur de la colonne")}</span>
        <button type="button" className={styles.lien} onClick={() => vider("guichet:poignee:colonne")}>
          {t("rétablir")}
        </button>
      </span>
      <span className={styles.reglage}>
        <span className={styles.nm}>{t("Groupes repliés")}</span>
        <button type="button" className={styles.lien} onClick={() => vider("guichet:colonne:plis")}>
          {t("rétablir")}
        </button>
      </span>
    </div>
  );
}
