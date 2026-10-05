"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { logout } from "@/app/connexion/actions";
import { leconDuClient, sectionDuDesk } from "@/lib/guide-link";
import { useLang, useT } from "@/i18n/client";

import { LangSwitch } from "./LangSwitch";
import { PaletteSwitch } from "./PaletteSwitch";
import { Sheet } from "./mobile/Sheet";
import { Presentation } from "./mobile/Presentation";
import { Onboarding } from "./mobile/Onboarding";
import { startDeskTour } from "./DeskTour";
import { MenuContact, MenuPied, MenuRecherche, useGuideIndex } from "./menu/Pieces";
import { usePhone } from "./chart-utils";
import styles from "./AppMenu.module.css";

/**
 * The « ⋮ » of the application, right of the account in the header. On the
 * phone, two tabs at a fixed height: « Guichet » (the search, this page's
 * landmarks, six tiles: the presentation, the first steps, the help, the
 * Guide, the profile, the security; the language and the alerts; the
 * account) and « Contact » (WhatsApp with the number in large, call, e-mail,
 * the address and the licence, the hours). On a desk, « Aide » and
 * « Réglages », docked under the header. Vertical dots for the app, the gold
 * horizontal « ··· » for a line: one gesture, two scopes, and « Déclarer une
 * intention » is in neither.
 */
export interface AppMenuProps {
  signedIn: boolean;
  desk: boolean;
  name?: string;
  /** Kept for the layout's call; the alerts row lives on Mon espace now. */
  vapidKey?: string;
  build?: string;
}

const COACH_KEY = "guichet:coach:menu";
type Tab = "guichet" | "aide" | "reglages";
const noop = () => () => {};
const firstTimeSnapshot = () => {
  try {
    // After the presentation, once: the last landmark points at the menu.
    return localStorage.getItem("guichet:presented") && !localStorage.getItem(COACH_KEY) ? "show" : "";
  } catch {
    return "";
  }
};
function Icon({ d, gold }: { d: string; gold?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={gold ? styles.gold : undefined}>
      <path d={d} />
    </svg>
  );
}

const D = {
  whatsapp: "M4 20l1.3-3.9A8 8 0 1 1 8 19.1L4 20z",
  phone: "M5 4h3l2 5-2.5 1.5a11 11 0 0 0 5 5L14 13l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z",
  mail: "M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l9 6 9-6",
  play: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM10 8.5v7l5.5-3.5z",
  steps: "M4 19V5l6 3v11zM14 16V4l6 3v11z",
  help: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.5M12 17h.01",
  book: "M4 5h6a2 2 0 0 1 2 2v13a1.5 1.5 0 0 0-1.5-1.5H4zM20 5h-6a2 2 0 0 0-2 2v13a1.5 1.5 0 0 1 1.5-1.5H20z",
  marks: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8v5M12 16h.01",
  tour: "M4 12h6M4 6h12M4 18h9M17 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0",
  cards: "M3 4h18v7H3zM3 14h18v7H3z",
  services: "M4 5h6v5H4zM14 5h6v5h-6zM4 14h6v5H4zM14 14h6v5h-6z",
  bell: "M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0",
  shield: "M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6zM9 12l2 2 4-4",
  out: "M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M15 16l4-4-4-4M19 12H9",
  docs: "M6 3h9l4 4v14H6zM14 3v5h5M9 12h6M9 16h6",
  eye: "M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6zM12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0",
  profile: "M4 19V9M10 19V5M16 19v-8M22 19H2",
  pin: "M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11zM12 10m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0",
};

export function AppMenu({ signedIn, desk, name, build }: AppMenuProps) {
  const t = useT();
  const lang = useLang();
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [play, setPlay] = useState<"presentation" | "onboarding" | null>(null);
  const [coachLabel, setCoachLabel] = useState<string | null>(null);
  const [tourStep, setTourStep] = useState<number | null>(null);
  const firstTime = useSyncExternalStore(noop, firstTimeSnapshot, () => "");
  const [coachGone, setCoachGone] = useState(false);
  const [tab, setTab] = useState<Tab>(desk ? "aide" : "guichet");
  // On the phone the desk gets one sheet too: its learning items, then the language and the account.
  const phone = usePhone();
  const deskTabs = desk && !phone;
  const { index, lues, resume } = useGuideIndex(open);

  const onFiche = path.startsWith("/offres/");
  /* La porte du guide s'ouvre à la page qui parle de l'écran qu'on a sous les
     yeux. La correspondance vivait ici, écrite à la main et pour le desk seul ;
     elle vit maintenant dans `lib/guide-link`, sous cliquet, et sert les deux
     côtés. */
  const guideDesk = desk ? sectionDuDesk(path) : undefined;
  const guideClient = leconDuClient(path);

  const show = () => {
    // What this page can replay, and where the desk's tour stands: read on opening, never guessed.
    setCoachLabel(document.querySelector<HTMLElement>("[data-coach-replay]")?.dataset.coachReplay ?? null);
    try {
      const v = sessionStorage.getItem("guichet:desktour");
      setTourStep(v == null ? null : Number(v));
    } catch {
      setTourStep(null);
    }
    setOpen(true);
    setTab(desk ? "aide" : "guichet");
  };
  const close = () => setOpen(false);
  const dismissCoach = () => {
    try {
      localStorage.setItem(COACH_KEY, new Date().toISOString());
    } catch {
      // storage unavailable
    }
    setCoachGone(true);
  };
  const go = (fn: () => void) => () => {
    close();
    fn();
  };

  const coach = Boolean(firstTime) && !coachGone && !desk;
  const contactBlock = <MenuContact close={close} surFiche={onFiche} />;

  /* CONNECTÉ, LE « ⋮ » N'EXISTE PLUS : tout est derrière l'initiale depuis
     le 5 octobre 2026, et deux portes vers la même feuille étaient la cause du
     doublon. Il reste pour le visiteur, qui n'a pas d'initiale, et pour le
     desk, qui a ses deux onglets. */
  if (signedIn && !desk) return null;

  return (
    <>
      <button type="button" className={`${styles.dots} ${coach ? styles.dotsCoach : ""}`} onClick={show} aria-haspopup="dialog" aria-expanded={open} aria-label={t("Menu : aide, contact, réglages")} title={t("Aide, contact, réglages")}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="5" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="12" cy="19" r="1.7" />
        </svg>
      </button>

      {coach && (
        <div className={styles.coach} role="dialog" aria-label={t("Un dernier repère")}>
          <div className={styles.coachDim} onClick={dismissCoach} aria-hidden="true" />
          <div className={styles.coachTip}>
            <small className={styles.coachEyebrow}>{t("Un dernier repère")}</small>
            <b>{t("Tout est ici : aide, WhatsApp et réglages.")}</b>
            <span>{t("Les trente secondes que vous venez de voir, les premiers pas, un conseiller à joindre, la langue, l'affichage des cartes. Le « ··· » d'une ligne, lui, ne parle que de cette ligne.")}</span>
            <div className={styles.coachFoot}>
              <button type="button" className="btn sm primary" onClick={dismissCoach}>
                {t("Compris")}
              </button>
            </div>
          </div>
        </div>
      )}

      <Sheet
        open={open}
        onClose={close}
        navy
        dock="top-right"
        tall={!desk || phone}
        title={signedIn && name ? t("Bonjour {name}", { name: name.split(/\s+/)[0] }) : "Guichet"}
        tabs={deskTabs ? (["aide", "reglages"] as Tab[]).map((k) => ({ key: k, label: t(k === "aide" ? "Aide" : "Réglages"), on: tab === k, pick: () => setTab(k) })) : undefined}
      >
        <div className={styles.menu}>
          {(tab === "aide" || tab === "guichet" || !deskTabs) && (
            <>
              <MenuRecherche index={index} close={close} />
              {coachLabel && (
                <>
                  <div className={styles.group}>{t("Sur cette page")}</div>
                  <button type="button" className={`${styles.item} ${styles.here}`} onClick={go(() => window.dispatchEvent(new Event("guichet:coach:replay")))}>
                    <Icon d={D.marks} gold />
                    <span>
                      <b>{coachLabel}</b>
                      <small>{t("les repères de cette page")}</small>
                    </span>
                  </button>
                </>
              )}
              {desk ? (
                <>
                  <div className={styles.group}>{t("Apprendre")}</div>
                  <button type="button" className={styles.item} onClick={go(() => startDeskTour(router))}>
                    <Icon d={D.tour} gold />
                    <span>
                      <b>{t("Visite guidée")}</b>
                      <small>{tourStep != null && tourStep > 0 ? t("en cours, étape {n} : reprendre du début", { n: tourStep + 1 }) : t("vingt étapes à travers le desk")}</small>
                    </span>
                  </button>
                  <Link className={styles.item} href={guideDesk?.href ?? "/desk/guide"} onClick={close}>
                    <Icon d={D.help} gold />
                    <span>
                      <b>{t(guideDesk ? "Cette page, champ par champ" : "Guide du desk")}</b>
                      {/* La commande dit où elle mène : « Guide du desk » deux
                          fois n'apprenait rien. */}
                      <small>{guideDesk ? t(guideDesk.titre) : t("Guide du desk")}</small>
                    </span>
                  </Link>
                  <Link className={styles.item} href="/desk/docs" onClick={close}>
                    <Icon d={D.docs} gold />
                    <span>
                      <b>{t("Documentation")}</b>
                      <small>{t("fonctionnement, plateformes, aider un client")}</small>
                    </span>
                  </Link>
                  <button type="button" className={styles.item} onClick={go(() => setPlay("presentation"))}>
                    <Icon d={D.eye} gold />
                    <span>
                      <b>{t("Ce que voit le client")}</b>
                      <small>{t("trente secondes, puis les premiers pas")}</small>
                    </span>
                  </button>
                </>
              ) : (
                <>
                  <div className={styles.tiles}>
                    <button type="button" className={styles.tile} onClick={go(() => setPlay("presentation"))}>
                      <Icon d={D.play} />
                      <b>{t("Trente secondes")}</b>
                      <small>{t("la présentation")}</small>
                    </button>
                    <button type="button" className={styles.tile} onClick={go(() => setPlay("onboarding"))}>
                      <Icon d={D.steps} />
                      <b>{t("Premiers pas")}</b>
                      <small>{t("six écrans")}</small>
                    </button>
                    <Link className={styles.tile} href="/info/aide" onClick={close}>
                      <Icon d={D.help} />
                      <b>{t("Aide")}</b>
                      <small>{t("les questions qu'on nous pose")}</small>
                    </Link>
                    {/* L ÉCLAIRAGE QUI PARLE DE CET ÉCRAN, quand il y en a une.
                        Le Guide s'ouvrait à son sommaire, ou à l'éclairage laissée
                        en plan : deux destinations utiles, mais aucune ne
                        répond à « qu'est-ce que je regarde ». */}
                    <Link className={styles.tile} href={guideClient?.href ?? (resume && lues > 0 ? `/info/${resume.key}` : "/info")} onClick={close}>
                      <Icon d={D.book} />
                      <b>{t(guideClient ? "Cette page expliquée" : "Le Guide")}</b>
                      <small>{guideClient ? t(guideClient.titre) : index ? t("{d} / {n} lues", { d: lues, n: index.lessons.length }) : t("éclairages, outils, glossaire")}</small>
                    </Link>
                    <Link className={styles.tile} href="/moi/profil" onClick={close}>
                      <Icon d={D.profile} />
                      <b>{t("Mon profil")}</b>
                      <small>{t("deux minutes · à titre indicatif")}</small>
                    </Link>
                  </div>
                  <div className={styles.group}>{t("Couleurs")}</div>
                  <PaletteSwitch lang={lang} />
                  {/* L'ENTRÉE A QUITTÉ CETTE FEUILLE le 6 octobre 2026 : la barre
                      du haut l'affiche déjà à côté du « ⋮ », à toute largeur, et un
                      doublon rangé plus loin que l'original ne sert personne.

                      LA LANGUE RESTE, et c'est le seul endroit où elle vit pour un
                      visiteur : la feuille « Bonjour » n'existe que pour qui est
                      entré. Nommée, cette fois, et non posée nue au bout d'une
                      ligne. */}
                  <div className={styles.group}>{t("Langue")}</div>
                  <div className={styles.item}>
                    <Icon d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
                    <span>
                      <b>{t("Français ou anglais")}</b>
                    </span>
                    <LangSwitch compact />
                  </div>
                  <div className={styles.group}>{t("Nous joindre")}</div>
                  {contactBlock}
                </>
              )}
            </>
          )}

          {desk && (tab === "reglages" || !deskTabs) && (
            <>
              <div className={styles.group}>{t("Couleurs")}</div>
              <PaletteSwitch lang={lang} />
              <div className={styles.group}>{t(signedIn ? "Mon compte" : "Réglages")}</div>
              <div className={styles.item}>
                <Icon d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
                <span>
                  <b>{t("Langue")}</b>
                </span>
                <LangSwitch compact />
              </div>
              {signedIn && (
                <form action={logout} className={styles.form}>
                  <button type="submit" className={`${styles.item} ${styles.danger}`}>
                    <Icon d={D.out} />
                    <span>
                      <b>{t("Se déconnecter")}</b>
                    </span>
                  </button>
                </form>
              )}
            </>
          )}

          <MenuPied close={close} build={build} />
        </div>
      </Sheet>

      {play === "presentation" && <Presentation force onClose={() => setPlay(desk ? "onboarding" : null)} />}
      {play === "onboarding" && <Onboarding force onClose={() => setPlay(null)} />}
    </>
  );
}
