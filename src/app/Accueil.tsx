import Link from "next/link";
import { getT } from "@/i18n/server";
import { COMPANY } from "@/lib/config";
import { tirerLesMessages } from "@/lib/domain/vitrine-messages";
import { FamilleDessin } from "@/components/accueil/FamilleDessin";
import { CarteCemac } from "@/components/accueil/CarteCemac";
import { CourbeFinanciere } from "@/components/accueil/CourbeFinanciere";
import { C, ListeAPlat, T, type Rangee } from "@/components/accueil/ListeAPlat";
import { TraceSurVue } from "@/components/accueil/TraceSurVue";
import styles from "./Accueil.module.css";

/**
 * L'accueil d'un visiteur qui n'est pas connecté : SEPT ÉCRANS, UN PAR LECTURE, SUR UN SEUL FOND BLEU NUIT (18 novembre 2026).
 *
 * Un écran, un message, et la page S'ARRÊTE à chaque écran, comme les statuts d'une messagerie (« scroll-snap-type: y mandatory » et « scroll-snap-stop: always », « globals.css »).
 *   1 · le titre, sur un fond de courbe financière (le client a retiré la ligne d'agrément de cet écran : elle est au dernier) ;
 *   2 · les produits à plat, fusionnés avec ce que chacun peut apporter et ce qu'il ne garantit pas ; leurs icônes se dessinent ;
 *   3 · investir, avec le dessin de la famille qui se trace et un texte sur ce que l'investissement peut apporter à l'investisseur et aux siens ;
 *   4 · la région, sur la carte de la zone CEMAC ;
 *   5 · « en toute sérénité » : le sérieux de la maison, à plat, icônes qui se dessinent ;
 *   6 · « à chaque étape » : l'accompagnement, à plat ;
 *   7 · un espace dédié : les conseillers, le risque de perte en capital, les trois liens du pied, et la maison (nom, agrément, version).
 * LES MESSAGES CHANGENT À CHAQUE VISITE : trois variantes par écran, une tirée côté serveur (`vitrine-messages.ts`).
 * LES BOUTONS D'ENTRÉE NE SONT PAS DANS LA PAGE : la bande basse (PorteVitrine) ; au large, la pastille du haut.
 * Aucun titre jaune (le client : « retirer tous les titres jaunes ») : plus d'étiquette dorée au-dessus des titres, et plus de numéros.
 * Un seul fond, sans lueur : le bleu nuit de la maison, d'un bord à l'autre, pied compris.
 *
 * L'ÉCRAN 2 NE PROMET RIEN (le client voulait « les rendements qui sécurisent le futur » : la règle de la vitrine l'interdit). Il dit ce que chaque produit est et ce qu'il ne garantit pas (« tant que l'émetteur tient ses engagements », « rien ne le garantit »).
 * LE TEXTE DE L'ÉCRAN 3 DIT « PEUT » ET « RIEN N'EST GARANTI » : un placement fait avec méthode peut aider à préparer les projets d'une famille ; il n'en promet aucun.
 * LE PIED est celui de la page (le pied du gabarit est masqué ici) : l'adresse et la mention longue en sont retirées à la demande du client ; le nom de la maison et son agrément restent, le risque de perte en capital est écrit à l'écran 6, et « Éclairages », « Aide et contact », « Risques et limites » sont de vrais liens vers des pages publiques. Les mentions légales complètes restent à « /info/mentions ».
 */
export async function Accueil() {
  const t = await getT();
  const m = tirerLesMessages();

  const produits: Rangee[] = [
    { clef: "tresor", titre: t("Titres du Trésor"), dit: t("Les obligations et les bons des États de la zone. Un intérêt versé à des dates connues d'avance, et votre capital remboursé à l'échéance, tant que l'émetteur tient ses engagements."), icone: (<><T d="M3 10 12 4l9 6" /><T d="M5 10v8" /><T d="M9.5 10v8" /><T d="M14.5 10v8" /><T d="M19 10v8" /><T d="M3 20h18" /></>) },
    { clef: "actions", titre: t("Actions cotées"), dit: t("Les sociétés de la bourse régionale. Une part de leur capital, qui peut verser un dividende : rien ne le garantit, et le cours peut baisser."), icone: (<><T d="M3 17l6-6 4 4 8-9" /><T d="M15 6h6v6" /></>) },
    { clef: "fonds", titre: t("Fonds agréés"), dit: t("Votre placement réparti sur plusieurs lignes, géré par des professionnels agréés par la COSUMAF."), icone: (<><T d="M12 3v9h9" /><C cx={12} cy={12} r={9} /></>) },
    { clef: "adjudications", titre: t("Adjudications"), dit: t("Le calendrier des séances d'emprunt des États, annoncées à l'avance."), icone: (<><T d="M4 6h16v14H4z" /><T d="M4 10h16" /><T d="M8 3v5" /><T d="M16 3v5" /></>) },
  ];

  const garanties: Rangee[] = [
    { clef: "agrement", titre: t("Une société agréée"), dit: t("Purpose Capital est agréée en qualité de société de bourse par la Commission de Surveillance du Marché Financier de l'Afrique Centrale (COSUMAF)."), icone: (<><T d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" /><T d="M8.5 12l2.5 2.5 5-5" /></>) },
    { clef: "titres", titre: t("Vos titres à votre nom"), dit: t("Les titres acquis sont inscrits à votre nom, et le demeurent si vous nous quittez."), icone: (<><T d="M4 5h16v14H4z" /><C cx={12} cy={10.5} r={2.2} /><T d="M8 16h8" /></>) },
    { clef: "especes", titre: t("Vos espèces séparées"), dit: t("Votre compte espèces est ouvert à votre nom. Chaque mouvement porte sa date de valeur."), icone: (<><C cx={9} cy={12} r={5.5} /><C cx={15} cy={12} r={5.5} /></>) },
    { clef: "ordres", titre: t("Vous seul donnez les ordres"), dit: t("Aucun ordre ne part sans vous. Le conseiller éclaire et propose ; la décision vous appartient."), icone: (<><T d="M12 3l9 9-9 9-9-9z" /><C cx={12} cy={12} r={2.4} /></>) },
  ];

  const etapes: Rangee[] = [
    { clef: "ouvrir", titre: t("Ouvrir votre compte"), dit: t("Le desk vous rappelle si une pièce manque, à votre rythme."), icone: (<><T d="M4 5h16v14H4z" /><T d="M12 9v6" /><T d="M9 12h6" /></>) },
    { clef: "choisir", titre: t("Choisir une ligne"), dit: t("Chaque chiffre est expliqué, la décision reste la vôtre."), icone: (<><C cx={12} cy={12} r={9} /><C cx={12} cy={12} r={5} /><C cx={12} cy={12} r={1.2} /></>) },
    { clef: "ordre", titre: t("Passer votre ordre"), dit: t("Rien n'est débité sans votre accord."), icone: (<><T d="M5 19 19 5" /><T d="M9 5h10v10" /></>) },
    { clef: "suivre", titre: t("Suivre vos placements"), dit: t("Chaque étape vous est notifiée ; relevés et avis se téléchargent."), icone: (<T d="M3 12h4l3-6 4 12 3-6h4" />) },
  ];

  return (
    <div className={styles.page} data-vitrine="">
      {/* ÉCRAN 1 · LE TITRE, sur un fond de courbe financière (sans graduation ni chiffre). */}
      <section className={styles.ecran}>
        <TraceSurVue className={styles.fond}>
          <CourbeFinanciere className={styles.courbe} />
        </TraceSurVue>
        <div className={styles.col}>
          <h1 data-anim="">{t(m.hub)}</h1>
        </div>
        <span className={styles.defile} aria-hidden="true" />
      </section>

      {/* ÉCRAN 2 · LES PRODUITS, À PLAT, avec ce que chacun peut apporter et ce qu'il ne garantit pas. */}
      <section className={styles.ecran}>
        <div className={styles.col}>
          <h2 data-anim="">{t(m.futur)}</h2>
          <ListeAPlat rangees={produits} />
        </div>
      </section>

      {/* ÉCRAN 3 · INVESTIR : le dessin de la famille qui se trace, et ce que l'investissement peut apporter aux siens. */}
      <section className={styles.ecran}>
        <div className={styles.col}>
          <h2 data-anim="">{t(m.investir)}</h2>
          <TraceSurVue className={styles.famille}>
            <FamilleDessin className={styles.dessin} />
          </TraceSurVue>
          <p className={styles.texte} data-anim="">
            <span className={styles.phrase}>{t("Investir, c'est penser à ceux qui comptent.")}</span> {t("Un placement fait avec méthode peut aider à préparer les projets d'une famille ; rien n'est garanti, mais la démarche, elle, se transmet.")}
          </p>
        </div>
      </section>

      {/* ÉCRAN 4 · LA RÉGION : un seul message, sur la carte de la zone CEMAC. */}
      <section className={styles.ecran}>
        <TraceSurVue className={styles.fond}>
          <CarteCemac className={styles.carte} />
        </TraceSurVue>
        <div className={styles.col}>
          <h2 data-anim="">{t(m.region)}</h2>
          <p className={styles.chapeau} data-anim="">
            {t("Les fonds levés sur ce marché financent des projets de la région : le marché existe pour les rendre possibles.")}
          </p>
        </div>
      </section>

      {/* ÉCRAN 5 · EN TOUTE SÉRÉNITÉ : le sérieux de la maison, à plat. */}
      <section className={styles.ecran}>
        <div className={styles.col}>
          <h2 data-anim="">{t(m.vous)}</h2>
          <p className={styles.chapeau} data-anim="">
            {t("Une maison sérieuse, à vos côtés à chaque étape.")}
          </p>
          <ListeAPlat rangees={garanties} />
        </div>
      </section>

      {/* ÉCRAN 6 · À CHAQUE ÉTAPE : l'accompagnement, à plat. */}
      <section className={styles.ecran}>
        <div className={styles.col}>
          <h2 data-anim="">{t("À chaque étape, à vos côtés.")}</h2>
          <ListeAPlat rangees={etapes} />
        </div>
      </section>

      {/* ÉCRAN 7 · L'ESPACE DÉDIÉ : les conseillers, le risque écrit, les trois liens, et la maison (nom, agrément, version). */}
      <section className={`${styles.ecran} ${styles.pied}`}>
        <div className={styles.col}>
          <p className={styles.conseillers} data-anim="">
            {t("Des conseillers à votre écoute, en français, en anglais et sans jargon, à chaque étape.")}
          </p>
          <p className={styles.avertissement} data-anim="">
            {t("Tout placement comporte un risque de perte en capital. Les performances passées ne préjugent pas des performances futures.")}
          </p>
          <nav className={styles.liens} aria-label={t("Pour en savoir plus")} data-anim="">
            <Link href="/info/eclairages">{t("Éclairages")}</Link>
            <Link href="/info/aide">{t("Aide et contact")}</Link>
            <Link href="/info/risques">{t("Risques et limites")}</Link>
            <Link href="/info/textes">{t("Textes et conditions")}</Link>
          </nav>
          <p className={styles.maison} data-anim="">
            <b>{COMPANY.legalName}</b>, {t(COMPANY.licence)}
            {process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ? ` · v${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA.slice(0, 7)}` : ""}
          </p>
        </div>
      </section>
    </div>
  );
}
