"use client";

import { useT } from "@/i18n/client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LangSwitch } from "@/components/LangSwitch";
import { AccountMenu } from "./AccountMenu";
import { MarketChips } from "./MarketChips";
import { Sheet } from "./Sheet";
import { currentMarketPage, isMarketPath } from "@/lib/market/pages";
import { INSTRUMENTS_PAGES, MARCHE_PAGES, PORTEFEUILLE_PAGES, type NavPage } from "@/lib/nav-groups";
import { ICONE_PAGE } from "@/components/nav/IconesPages";
import { Tuiles } from "@/components/nav/Tuiles";
import type { ClientPrefs } from "@/lib/domain/types";
import styles from "./MobileShell.module.css";
import { isEspaceSection, isInstrumentsSection, isMarcheSection, listForFiche, TITRES } from "@/lib/nav-section";

/**
 * The phone shell (≤ 760 px): a top bar with a real « back » and the page
 * title, and a bottom tab bar with the four destinations. Desktop keeps the
 * site header; both are rendered, CSS shows one. The back arrow returns to
 * the list the reader came from, same filters, same scroll, using the
 * browser history when it is ours, or the last list URL we remembered.
 */
export const LAST_LIST_KEY = "guichet:lastList";

// Une racine ne porte pas de flèche de retour : c'est une destination du dock.
// « /titres » en est une depuis que « / » est devenu la console.
const ROOTS = ["/", "/titres", "/fonds", "/moi", "/info", "/desk", "/connexion", "/actualites", "/marche"];

/**
 * `feuille` : le siège ouvre sa liste au lieu de sauter sur une page.
 *
 * Trois sièges sur cinq en portent une, et c'est la même règle que la bande de
 * l'écran large : un siège qui est à la fois un lien et un bouton demande au
 * pouce de viser, et le pouce vise mal. L'ancienne racine devient le premier
 * élément de la liste, nommée, plutôt que de disparaître.
 */
type Groupe = "portefeuille" | "instruments" | "marche";
type Tab = { href: string; label: string; icon: React.ReactNode; match: (p: string) => boolean; badge?: number; feuille?: Groupe };

/** Les trois listes, lues de la même table que la bande de l'écran large. */
/* L'en-tête ne porte plus que le nom du siège : la phrase qui le suivait
   redisait ce que les tuiles montrent, et volait une ligne en tête de feuille. */
const GROUPES: Record<Groupe, { titre: string; pages: NavPage[] }> = {
  portefeuille: { titre: "Portefeuille", pages: PORTEFEUILLE_PAGES },
  instruments: { titre: "Instruments", pages: INSTRUMENTS_PAGES },
  marche: { titre: "Marché", pages: MARCHE_PAGES },
};

const I = {
  guichet: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h10" />
    </svg>
  ),
  // Trader : une courbe qui monte vers une flèche, donc le geste et non l'objet.
  trader: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 17l5-6 4 4 6-9" />
      <path d="M14 6h6v6" />
    </svg>
  ),
  fonds: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 17l5-6 4 4 4-7 5 5" />
      <path d="M3 21h18" />
    </svg>
  ),
  moi: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
    </svg>
  ),
  apprendre: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H4z" />
      <path d="M20 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z" />
    </svg>
  ),
  actualites: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5h13v14H6a2 2 0 0 1-2-2z" />
      <path d="M17 9h3v8a2 2 0 0 1-2 2M7 9h6M7 13h6M7 17h4" />
    </svg>
  ),
  desk: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18M8 15h4" />
    </svg>
  ),
};

function fallbackFor(path: string): string {
  if (path.startsWith("/offres")) {
    try {
      const last = sessionStorage.getItem(LAST_LIST_KEY);
      if (last) return last;
    } catch {
      // storage unavailable
    }
    return listForFiche(path);
  }
  if (path.startsWith("/fonds")) return "/fonds";
  if (path.startsWith("/societes") || path.startsWith("/emetteurs")) return "/societes";
  if (path.startsWith("/desk")) return "/desk";
  if (path.startsWith("/actualites")) return "/actualites";
  if (path.startsWith("/moi") || path.startsWith("/ouvrir-un-compte")) return "/moi";
  if (path.startsWith("/info") || path.startsWith("/comparer")) return "/info";
  return "/";
}

export function MobileShell({ signedIn, name, segment, tier, email, phone, phoneOk, emailOk, prefs, kycStatus, vapidKey, desk, deskHost = false, pendingCount = 0, security, profile, build, menu }: { signedIn: boolean; name?: string; segment?: string; tier?: number; email?: string; phone?: string; phoneOk?: boolean; emailOk?: boolean; prefs?: ClientPrefs; kycStatus?: string; vapidKey?: string; desk: boolean; /** the desk's own host: no client tab bar */ deskHost?: boolean; pendingCount?: number; /** ce que la feuille du compte dit sous « Sécurité », « Mon profil » et au pied */ security?: { channels: number; devices: number }; profile?: "prudent" | "equilibre" | "dynamique"; build?: string; menu?: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [title, setTitle] = useState("");
  // La feuille retient QUEL siège l'a ouverte et SUR QUELLE page : partir la
  // referme, et deux sièges ne peuvent pas être ouverts ensemble.
  const [feuille, setFeuille] = useState<{ groupe: Groupe; at: string } | null>(null);
  const ouverte = feuille?.at === path ? feuille.groupe : null;
  const isRoot = ROOTS.includes(path) || path === "/societes";

  // The page title comes from <title>, which every page already sets.
  useEffect(() => {
    const read = () => setTitle(document.title.replace(/\s*[·—-]\s*(Guichet|Purpose Capital).*$/i, "").trim());
    read();
    const t = document.querySelector("title");
    if (!t) return;
    const mo = new MutationObserver(read);
    mo.observe(t, { childList: true, characterData: true, subtree: true });
    return () => mo.disconnect();
  }, [path]);

  // Did this tab see another of our pages before this one? Then the browser history is ours.
  useEffect(() => {
    try {
      const prev = sessionStorage.getItem("guichet:here");
      if (prev && prev !== path) sessionStorage.setItem("guichet:cameFrom", prev);
      sessionStorage.setItem("guichet:here", path);
    } catch {
      // storage unavailable
    }
  }, [path]);

  const back = () => {
    let ours = false;
    try {
      ours = Boolean(sessionStorage.getItem("guichet:cameFrom"));
    } catch {
      // storage unavailable
    }
    // Our own history: go back (Next restores the list scroll). A link opened from WhatsApp: the remembered list.
    if (ours && window.history.length > 1) router.back();
    else router.push(fallbackFor(path));
  };

  const t = useT();
  /**
   * Quatre destinations, et c'est la même règle que la bande de l'écran large.
   *
   * Le dock portait cinq onglets rangés par instrument. Un client se connecte
   * pour voir ce qu'il a et pour traiter : le portefeuille et le marché
   * suffisent à porter les deux, « À décider » porte les gestes, et le compte
   * porte le reste. Titres et Fonds tiennent sous « Marché », en deux onglets
   * de section.
   */
  const tabs: Tab[] = [
    { href: "/", label: t("Portefeuille"), icon: I.moi, match: isEspaceSection, feuille: "portefeuille" },
    /* INSTRUMENTS PREND LE SIÈGE LIBÉRÉ. Marché portait les deux à la fois, ce
       qui se lit et ce qui se traite ; trois mots règlent la question : Marché
       se lit, Instruments s'achète, Trader fait. */
    { href: "/titres", label: t("Instruments"), icon: I.fonds, match: isInstrumentsSection, feuille: "instruments" },
    // Trader entre au dock : sans lui, les neuf services n'ont pas de porte sur
    // téléphone, et c'est là que la plupart des clients lisent.
    { href: "/trader", label: t("Agir"), icon: I.trader, match: (p) => p.startsWith("/trader") },
    { href: "/marche", label: t("Marché"), icon: I.guichet, match: isMarcheSection, feuille: "marche" },
    /* « À DÉCIDER » A QUITTÉ LE DOCK le 2 octobre 2026. Un onglet qui porte ce
       nom demande d'aller voir s'il y a quelque chose, et il est vide neuf jours
       sur dix : un onglet vide neuf jours sur dix est un onglet qu'on cesse
       d'ouvrir. La bande en tête du portefeuille le dit sans qu'on y aille, et
       le nombre se lit au passage. Le siège libéré revient à Instruments. */
  ];

  return (
    <>
      <div className={styles.top}>
        {isRoot ? (
          <Link href="/" className={styles.brand}>
            <b>PURPOSE CAPITAL</b>
            <span>Guichet</span>
          </Link>
        ) : (
          <>
            <button type="button" className={styles.back} onClick={back} aria-label={t("Retour")}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
            <div className={styles.title}>{title ? t(title) : "…"}</div>
          </>
        )}
        <div className={styles.right}>
          {/* LA LANGUE ENTRE DANS LA BARRE. Sous 760 px l'en-tete de bureau est
              masque : le bouton de langue mesurait 0 x 0, et le seul chemin vers
              l'anglais passait par le bas d'une feuille. */}
          <span className={styles.lang}>
            <LangSwitch compact />
          </span>
          {desk && (
            <Link href="/desk" className={`${styles.deskLink} ${path.startsWith("/desk") ? styles.deskOn : ""}`}>
              {t("Desk")}
            </Link>
          )}
          {signedIn ? (
            <AccountMenu name={name ?? "?"} segment={segment ?? ""} tier={tier ?? 0} desk={desk} email={email} phone={phone} phoneOk={phoneOk} emailOk={emailOk} prefs={prefs} kycStatus={kycStatus} vapidKey={vapidKey} security={security} profile={profile} build={build} />
          ) : (
            !path.startsWith("/connexion") && (
              <Link href={`/connexion?next=${encodeURIComponent(path)}`} className={styles.signin}>
                {t("Se connecter")}
              </Link>
            )
          )}
          {menu}
        </div>
      </div>

      {!deskHost && <MarketChips />}

      {/* Le dock ne parait qu a qui est entre. Tout ce qu il porte demande une
          connexion : le montrer a un visiteur serait lui offrir quatre portes
          fermees sous le pouce. Devant la porte, la page se suffit, avec son
          menu « ⋮ » et ses propres appels a l action. */}
      {!deskHost && signedIn && (
      <nav className={styles.tabs} aria-label="Navigation principale" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
        {tabs.map((tab) => {
          const face = (
            <>
              <span className={styles.icon}>
                {tab.icon}
                {tab.badge ? <em>{tab.badge}</em> : null}
              </span>
              {t(tab.label)}
            </>
          );
          if (tab.feuille) {
            const g = tab.feuille;
            return (
              <button key={tab.href} type="button" aria-current={tab.match(path) ? "page" : undefined} aria-expanded={ouverte === g} aria-haspopup="dialog" onClick={() => setFeuille(ouverte === g ? null : { groupe: g, at: path })}>
                {face}
              </button>
            );
          }
          return (
            <Link key={tab.href} href={tab.href} aria-current={tab.match(path) ? "page" : undefined}>
              {face}
            </Link>
          );
        })}
      </nav>
      )}

      {/* Une seule feuille pour les trois sièges : trois composants de la même
          chose finiraient par se répondre différemment.

          DES TUILES, ET NON DES RANGÉES. Trois ou quatre destinations lues en
          une fois valent mieux que trois phrases lues l'une après l'autre : on
          vient ici pour aller ailleurs, pas pour lire. Ce que la tuile perd,
          c'est la phrase entière ; elle garde trois mots, jamais rien, parce
          qu'une grille d'icônes nues ne dit pas ce qu'elle ouvre. La feuille
          large, elle, garde la phrase : la place y est.

          ET PAS DE CHIFFRE SOUS LE NOM, décision du 5 octobre 2026. « 45 »
          sous Titres répondait avant le toucher, mais il ramenait sous l'icône
          le troisième étage de texte qu'on venait d'enlever avec les trois
          mots. Il reste dans le menu large, à côté du nom de SA page, là où il
          ne coûte pas une ligne. */}
      <Sheet open={Boolean(ouverte)} onClose={() => setFeuille(null)} title={t(ouverte ? GROUPES[ouverte].titre : "")}>
        <Tuiles
          items={(ouverte ? GROUPES[ouverte].pages : []).map((p) => ({
            key: p.key,
            href: p.href,
            nom: t(p.short ?? p.label),
            icone: ICONE_PAGE[p.key],
            ici: p.href === path || p.key === currentMarketPage(path),
          }))}
          onPick={() => setFeuille(null)}
        />
      </Sheet>
    </>
  );
}
