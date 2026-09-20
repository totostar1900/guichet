"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";
import { logout } from "@/app/connexion/actions";
import { GUIDE } from "@/data/desk-guide";
import { useT } from "@/i18n/client";
import { COMPANY } from "@/lib/config";
import { LangSwitch } from "./LangSwitch";
import { PushToggle } from "./PushToggle";
import { Sheet } from "./mobile/Sheet";
import { Presentation } from "./mobile/Presentation";
import { Onboarding } from "./mobile/Onboarding";
import { startDeskTour } from "./DeskTour";
import { rankEntries, type SearchEntry } from "@/app/info/InfoSearch";
import { TOP_QUESTIONS, type GuideIndex } from "@/lib/guide-index-shared";
import { cachedGuideIndex, loadGuideIndex, readDoneLessons } from "@/lib/guide-index-client";
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
  security?: { channels: number; devices: number };
  /** The client's financial profile, when set: the word under « Mon profil ». */
  profile?: "prudent" | "equilibre" | "dynamique";
  vapidKey?: string;
  build?: string;
}

const COACH_KEY = "guichet:coach:menu";
type Tab = "guichet" | "contact" | "aide" | "reglages";
/** Yaoundé (UTC+1), Monday to Friday, 8 h to 17 h: whether a conseiller is at the desk right now. */
function deskOpenNow(): boolean {
  const d = new Date(new Date().getTime() + 60 * 60 * 1000);
  const day = d.getUTCDay();
  const h = d.getUTCHours();
  return day >= 1 && day <= 5 && h >= 8 && h < 17;
}
const noop = () => () => {};
const firstTimeSnapshot = () => {
  try {
    // After the presentation and the first steps, once: the last landmark points at the menu.
    return localStorage.getItem("guichet:presented") && localStorage.getItem("guichet:onboarded") && !localStorage.getItem(COACH_KEY) ? "show" : "";
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
  bell: "M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0",
  shield: "M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6zM9 12l2 2 4-4",
  out: "M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M15 16l4-4-4-4M19 12H9",
  docs: "M6 3h9l4 4v14H6zM14 3v5h5M9 12h6M9 16h6",
  eye: "M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6zM12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0",
  profile: "M4 19V9M10 19V5M16 19v-8M22 19H2",
  pin: "M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11zM12 10m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0",
};

export function AppMenu({ signedIn, desk, name, security, profile, vapidKey, build }: AppMenuProps) {
  const t = useT();
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [play, setPlay] = useState<"presentation" | "onboarding" | null>(null);
  const [coachLabel, setCoachLabel] = useState<string | null>(null);
  const [tourStep, setTourStep] = useState<number | null>(null);
  const firstTime = useSyncExternalStore(noop, firstTimeSnapshot, () => "");
  const [coachGone, setCoachGone] = useState(false);
  const [tab, setTab] = useState<Tab>(desk ? "aide" : "guichet");
  const [openNow, setOpenNow] = useState(false);
  const [q, setQ] = useState("");
  const [index, setIndex] = useState<GuideIndex | null>(cachedGuideIndex());
  const [done, setDone] = useState<string[]>([]);
  const hits = useMemo(() => (index && q.trim().length >= 2 ? rankEntries(index.entries, q, 6).results.map((r) => r.e) : []), [index, q]);
  const first = index?.lessons.filter((l) => !l.section) ?? [];
  const course = index?.lessons.filter((l) => l.section) ?? [];
  const firstDone = first.filter((l) => done.includes(l.key)).length;
  const courseDone = course.filter((l) => done.includes(l.key)).length;
  const resume = course.find((l) => !done.includes(l.key));
  const resumeSection = resume && index ? index.sections.find((x) => x.key === resume.section) : undefined;
  const top = index ? TOP_QUESTIONS.map((slug) => index.aide.find((r) => r.slug === slug)).filter((r): r is NonNullable<typeof r> => Boolean(r)) : [];

  const onFiche = path.startsWith("/offres/");
  const wa = `https://wa.me/${COMPANY.phone.replace(/\D/g, "")}?text=${encodeURIComponent(onFiche ? t("Bonjour, je regarde {line} sur le Guichet et…", { line: typeof document === "undefined" ? "" : document.title.replace(/\s*·\s*Guichet.*$/i, "") }) : t("Bonjour, j'ai une question sur le Guichet…"))}`;
  const guideKey = desk && path.startsWith("/desk") ? GUIDE.find((g) => g.path !== "/desk" && path.startsWith(g.path.replace(/\/….*$/, "")))?.key ?? (path === "/desk" ? "carnet" : undefined) : undefined;

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
    setOpenNow(deskOpenNow());
    setQ("");
    loadGuideIndex().then((i) => {
      setIndex(i);
      setDone(readDoneLessons(i.lessons.map((l) => l.key)));
    });
  };
  const close = () => setOpen(false);
  const openHit = (e: SearchEntry) => {
    close();
    router.push(e.href);
  };
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
        tall={!desk}
        title={signedIn && name ? t("Bonjour {name}", { name: name.split(/\s+/)[0] }) : "Guichet"}
        tabs={(desk ? (["aide", "reglages"] as Tab[]) : (["guichet", "contact"] as Tab[])).map((k) => ({ key: k, label: t(k === "aide" ? "Aide" : k === "guichet" ? "Guichet" : k === "contact" ? "Contact" : "Réglages"), on: tab === k, pick: () => setTab(k) }))}
      >
        <div className={styles.menu}>
          {(tab === "aide" || tab === "guichet") && (
            <>
              <label className={styles.search}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Une question, un mot… ex. coupon couru")} aria-label={t("Rechercher dans l'aide")} autoComplete="off" enterKeyHint="search" onKeyDown={(e) => e.key === "Enter" && hits[0] && openHit(hits[0])} />
                <small>{t("aide · glossaire · leçons")}</small>
              </label>
              {q.trim().length >= 2 && (
                <div className={styles.hits} role="listbox">
                  {hits.length === 0 && <span className={styles.none}>{index ? t("Aucun résultat") : t("Un instant…")}</span>}
                  {hits.map((e) => (
                    <button key={e.href + e.title} type="button" role="option" aria-selected={false} className={styles.hit} onClick={() => openHit(e)}>
                      <em>{t(e.kind === "terme" ? "Définition" : e.kind === "lecon" ? "Leçon" : e.kind === "outil" ? "Outil" : "Aide")}</em>
                      <b>{e.title}</b>
                    </button>
                  ))}
                </div>
              )}
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
                  <Link className={styles.item} href={guideKey ? `/desk/guide#${guideKey}` : "/desk/guide"} onClick={close}>
                    <Icon d={D.help} gold />
                    <span>
                      <b>{t(guideKey ? "Cette page, champ par champ" : "Guide du desk")}</b>
                      <small>{t("Guide du desk")}</small>
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
                    <Link className={styles.tile} href={resume && courseDone > 0 ? `/info/${resume.key}` : "/info"} onClick={close}>
                      <Icon d={D.book} />
                      <b>{t("Le Guide")}</b>
                      <small>{index ? t("{d} / {n} lues", { d: firstDone + courseDone, n: index.lessons.length }) : t("leçons, outils, glossaire")}</small>
                    </Link>
                    <Link className={styles.tile} href="/moi/profil" onClick={close}>
                      <Icon d={D.profile} />
                      <b>{t("Mon profil")}</b>
                      <small>{profile ? t(profile === "prudent" ? "prudent" : profile === "equilibre" ? "équilibré" : "dynamique") : signedIn ? t("deux minutes") : t("deux minutes · à titre indicatif")}</small>
                    </Link>
                    {signedIn && (
                      <Link className={styles.tile} href="/moi/securite" onClick={close}>
                        <Icon d={D.shield} />
                        <b>{t("Sécurité")}</b>
                        <small className={security && security.channels === 2 ? styles.good : undefined}>{security ? t("{c} canaux · {d} appareil", { c: String(security.channels), d: String(security.devices) }) : t("canaux, appareils")}</small>
                      </Link>
                    )}
                  </div>
                  <div className={styles.line}>
                    <LangSwitch compact />
                    {signedIn ? (
                      <form action={logout} className={styles.form}>
                        <button type="submit" className={styles.lineOut}>
                          <Icon d={D.out} />
                          {t("Se déconnecter")}
                        </button>
                      </form>
                    ) : (
                      <Link href="/connexion" className={styles.lineOut} onClick={close}>
                        {t("Se connecter")}
                      </Link>
                    )}
                  </div>
                  {/* the alerts row exists only once the VAPID keys are set on the server: without them there is no button to show */}
                  {vapidKey && (
                    <div className={styles.item}>
                      <Icon d={D.bell} />
                      <span>
                        <b>{t("Alertes sur cet appareil")}</b>
                        <small>{t("une opportunité, une clôture, un ordre servi")}</small>
                      </span>
                      <span className={styles.side}>
                        <PushToggle vapidKey={vapidKey} compact />
                      </span>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {tab === "contact" && !desk && (
            <>
              <a className={styles.waCard} href={wa} target="_blank" rel="noopener" onClick={close}>
                <span className={styles.waHead}>
                  <Icon d={D.whatsapp} />
                  <b>WhatsApp</b>
                </span>
                <strong>{COMPANY.phone}</strong>
                <small>{t(onFiche ? "un conseiller répond dans l'heure ouvrée, au sujet de cette ligne" : "un conseiller répond dans l'heure ouvrée")}</small>
                <span className={styles.waBtn}>{t("Écrire")}</span>
              </a>
              <div className={styles.contactPair}>
                <a className={styles.contactCard} href={`tel:${COMPANY.phone.replace(/\s/g, "")}`} onClick={close}>
                  <Icon d={D.phone} />
                  <b>{t("Appeler")}</b>
                  <strong>{COMPANY.phone}</strong>
                  <small>{t("lundi à vendredi, 8 h à 17 h")}</small>
                </a>
                <a className={styles.contactCard} href={`mailto:${COMPANY.email}`} onClick={close}>
                  <Icon d={D.mail} />
                  <b>{t("E-mail")}</b>
                  <strong>{COMPANY.email}</strong>
                  <small>{t("réponse sous un jour ouvré")}</small>
                </a>
              </div>
              <div className={styles.address}>
                <Icon d={D.pin} />
                <span>
                  <b>{COMPANY.legalName}</b>
                  <small>{COMPANY.address}</small>
                  <small>{t(COMPANY.licence)}</small>
                </span>
              </div>
              <div className={styles.hours}>
                <span>
                  <b>{t("Ouvert")}</b> · {t("lundi à vendredi, 8 h à 17 h")}
                </span>
                {openNow && (
                  <em>
                    <i aria-hidden="true" />
                    {t("en ligne maintenant")}
                  </em>
                )}
              </div>
            </>
          )}

          {tab === "reglages" && desk && (
            <>
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

          <div className={styles.foot}>
            <span>
              {COMPANY.legalName} · {t("agrément COSUMAF")}
            </span>
            <span className={styles.footLinks}>
              <Link href="/info/mentions" onClick={close}>
                {t("Mentions")}
              </Link>
              <Link href="/info/aide#entretien" onClick={close}>
                {t("À propos")}
                {build ? ` · v${build}` : ""}
              </Link>
            </span>
          </div>
        </div>
      </Sheet>

      {play === "presentation" && <Presentation force onClose={() => setPlay(desk ? "onboarding" : null)} />}
      {play === "onboarding" && <Onboarding force onClose={() => setPlay(null)} />}
    </>
  );
}
