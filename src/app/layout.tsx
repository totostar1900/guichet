import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Manrope } from "next/font/google";
import "./globals.css";
import "./palettes.css";
import styles from "./layout.module.css";
import { COMPANY, DISCLAIMER, PRODUCT } from "@/lib/config";
import { NavTabs } from "@/components/NavTabs";
import { repo } from "@/lib/data";
import { backendName } from "@/lib/data";
import { getSession } from "@/lib/auth";
import { UserMenu } from "@/components/UserMenu";
import { MobileShell } from "@/components/mobile/MobileShell";
import { Onboarding } from "@/components/mobile/Onboarding";
import { Presentation } from "@/components/mobile/Presentation";
import { isDesk } from "@/lib/auth/types";
import type { ClientPrefs } from "@/lib/domain/types";
import { RegistryProvider } from "@/components/RegistryProvider";
import { loadIssuerRegistry, loadRegistry } from "@/lib/reference";
import { issuersForClient } from "@/data/issuer-registry";
import { LangProvider } from "@/i18n/client";
import { getLang, getT } from "@/i18n/server";
import { LangSwitch } from "@/components/LangSwitch";
import { AuthHashRedirect } from "@/components/AuthHashRedirect";
import { AppMenu } from "@/components/AppMenu";
import { ConsentGate } from "@/components/ConsentGate";
import { TermSheetHost } from "@/components/TermSheet";
import { PALETTE_BOOT, P_COOKIE, T_COOKIE, paletteAttrs } from "@/lib/palette";
import { PaletteKeeper } from "@/components/PaletteSwitch";
import { BarProbe } from "@/components/mobile/BarProbe";
import { cookies, headers } from "next/headers";
import { deskSplit, isDeskHost } from "@/lib/hosts";
import { LEGAL_VERSION } from "@/data/legal";
import { Suspense } from "react";

// One family for everything, display, text and figures, with tabular numerals; see globals.css.
const ui = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-ui", display: "swap" });

export const metadata: Metadata = {
  title: { default: `${PRODUCT.name} · ${COMPANY.name}`, template: `%s · ${PRODUCT.name}` },
  description: "Opportunités et instruments financiers en CEMAC : titres publics, BVMAC, opérations de marché.",
  applicationName: "Guichet",
  appleWebApp: { capable: true, title: "Guichet", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#0b2545",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/** The two figures in the menu: listed lines and funds. Never fails the page. */
async function countOffers(): Promise<{ titres: number; fonds: number } | undefined> {
  try {
    const all = await repo().listOffers();
    return { titres: all.filter((o) => !o.hidden && o.kind !== "FONDS").length, fonds: all.filter((o) => o.kind === "FONDS").length };
  } catch {
    return undefined;
  }
}

/** What the menu says under « Sécurité » (proven channels, trusted devices) and what the account sheet shows (each channel, the preferences). Never fails the page. */
async function accountLine(userId: string): Promise<{ security: { channels: number; devices: number }; phone?: string; email?: string; phoneOk: boolean; emailOk: boolean; prefs: ClientPrefs } | undefined> {
  try {
    const [ch, devices, prefs] = await Promise.all([repo().getChannelStatus(userId), repo().listDevices(userId), repo().getPrefs(userId).catch(() => ({}) as ClientPrefs)]);
    const emailOk = Boolean(ch.emailVerifiedAt);
    return { security: { channels: (ch.phoneVerifiedAt ? 1 : 0) + (emailOk || ch.email ? 1 : 0), devices: devices.length }, phone: ch.phone, email: ch.email, phoneOk: Boolean(ch.phoneVerifiedAt), emailOk, prefs };
  } catch {
    return undefined;
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const backend = backendName();
  const [session, registry, issuers, lang, t, navCounts, jar, hdrs] = await Promise.all([getSession(), loadRegistry(), loadIssuerRegistry(), getLang(), getT(), countOffers(), cookies(), headers()]);
  const desk = isDesk(session);
  // With the desk on its own host, the client site shows no desk control, even to staff.
  const onDeskHost = isDeskHost(hdrs.get("host"));
  const deskUi = desk && (!deskSplit() || onDeskHost);
  const navMode = deskSplit() ? (onDeskHost ? "desk" : "client") : "all";
  const [account, profile] = session ? await Promise.all([accountLine(session.userId), desk ? undefined : repo().getFinancialProfile(session.userId).catch(() => undefined)]) : [undefined, undefined];
  const security = desk ? undefined : account?.security;
  // A client accepts the legal text once per version of it; the desk is bound by its contract, not by this box.
  const consent = session && !desk ? await repo().getConsent(session.userId).catch(() => ({}) as { version?: string }) : undefined;
  const needsConsent = Boolean(session && !desk && consent?.version !== LEGAL_VERSION);
  const menu = <AppMenu signedIn={Boolean(session)} desk={deskUi} name={session?.name} security={security} profile={profile?.kind} vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY} build={process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7)} />;
  return (
    <html lang={lang} className={ui.variable} suppressHydrationWarning {...paletteAttrs(jar.get(P_COOKIE)?.value, jar.get(T_COOKIE)?.value)}>
      <head>
        {/* the device's palette and theme, applied before the first paint */}
        <script dangerouslySetInnerHTML={{ __html: PALETTE_BOOT }} />
      </head>
      <body>
        <LangProvider lang={lang}>
        <AuthHashRedirect />
        <PaletteKeeper />
        <Suspense>
          <BarProbe />
        </Suspense>
        <RegistryProvider types={registry.types} bondTerms={[...registry.bondTerms.values()]} glossary={registry.glossary} lessons={registry.lessons} issuers={issuersForClient(issuers)}>
        <TermSheetHost />
        <header className={styles.top}>
          <div className={styles.topIn}>
            <Link className={styles.brand} href="/">
              <b>{COMPANY.name.toUpperCase()}</b>
              <span>
                <em>{PRODUCT.name}</em> · {PRODUCT.tagline}
              </span>
            </Link>
            <NavTabs counts={navCounts} mode={navMode} />
            <div className={styles.right}>
              {backend === "memory" && (
                <span className={styles.backend} title={t("Aucun backend configuré : données de démonstration en mémoire")}>
                  {t("démo · mémoire")}
                </span>
              )}
              <Suspense>
                <LangSwitch />
              </Suspense>
              <UserMenu session={session} deskUi={deskUi} account={session ? { name: session.name, segment: session.segment, tier: session.tier, desk: deskUi, email: account?.email ?? session.email, phone: account?.phone ?? session.phone, phoneOk: account?.phoneOk, emailOk: account?.emailOk, prefs: account?.prefs, kycStatus: session.kycStatus, vapidKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY } : undefined} />
              {menu}
            </div>
          </div>
        </header>
        <MobileShell signedIn={Boolean(session)} name={session?.name} segment={session?.segment} tier={session?.tier} email={account?.email ?? session?.email} phone={account?.phone ?? session?.phone} phoneOk={account?.phoneOk} emailOk={account?.emailOk} prefs={account?.prefs} kycStatus={session?.kycStatus} vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY} desk={deskUi} deskHost={onDeskHost} menu={menu} />
        {needsConsent ? <ConsentGate previous={consent?.version} /> : null}
        <Presentation />
        <Onboarding />
        <main className={styles.main}>{children}</main>
        </RegistryProvider>
        <footer className={styles.footer}>
          <p>
            <b>{COMPANY.legalName}</b>, {t(COMPANY.licence)}. {COMPANY.address} · {COMPANY.phone} · {COMPANY.email}
          </p>
          <p>
            {t(DISCLAIMER)}
            {process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ? <span className={styles.build}> · v{process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA.slice(0, 7)}</span> : null}
          </p>
        </footer>
        </LangProvider>
      </body>
    </html>
  );
}
