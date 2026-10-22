import type { Metadata, Viewport } from "next";
import { comptesParLieu, type ComptesParLieu } from "@/lib/domain/listes";
import Link from "next/link";
import { Instrument_Serif, Manrope } from "next/font/google";
import "./globals.css";
import "./palettes.css";
import styles from "./layout.module.css";
import { COMPANY, DISCLAIMER, PRODUCT } from "@/lib/config";
import { NavTabs } from "@/components/NavTabs";
import { repo } from "@/lib/data";
import { backendName } from "@/lib/data";
import { getSession } from "@/lib/auth";
import { UserMenu } from "@/components/UserMenu";
import { RailMarche } from "@/components/RailMarche";
import { Colonne } from "@/components/Colonne";
import { PosteDuDesk } from "@/components/PosteDuDesk";
import { chargerPoste } from "@/lib/desk/poste";
import { ColonneStore } from "@/components/ColonneStore";
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
import { AuthHashRedirect } from "@/components/AuthHashRedirect";
import { AppMenu } from "@/components/AppMenu";
import { PorteVitrine } from "@/components/PorteVitrine";
import { SaufSurLaPorte } from "@/components/SaufSurLaPorte";
import { ConsentGate } from "@/components/ConsentGate";
import { TermSheetHost } from "@/components/TermSheet";
import { PALETTE_BOOT, P_COOKIE, T_COOKIE, paletteAttrs } from "@/lib/palette";
import { PaletteKeeper } from "@/components/PaletteSwitch";
import { BarProbe } from "@/components/mobile/BarProbe";
import { cookies, headers } from "next/headers";
import { clientOrigin, deskSplit, isDeskHost } from "@/lib/hosts";
import { LEGAL_VERSION } from "@/data/legal";
import { attentesPourLaBarre } from "@/lib/domain/contexte-client";

// One family for everything, display, text and figures, with tabular numerals; see globals.css.
const ui = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-ui", display: "swap" });
/**
 * La seconde famille, et la seule.
 *
 * L app a longtemps tenu sur une police unique, et le disait : « every face is
 * the same family now ». Un titre en serif a fort contraste est ce qui donne a
 * l accueil son caractere, et c est la seule chose que Manrope ne sait pas
 * faire. Elle ne sert qu aux titres : les chiffres restent en Manrope, avec
 * ses chiffres tabulaires, plutot que d ouvrir une troisieme famille.
 */
const titre = Instrument_Serif({ subsets: ["latin"], weight: ["400"], variable: "--font-titre", display: "swap" });

export const metadata: Metadata = {
  /**
   * L'origine des adresses absolues d'une carte de partage.
   *
   * Sans elle, Next la devine, et en production elle tombait sur l'hôte du
   * desk : chaque ligne partagée sur WhatsApp portait une image hébergée sur
   * « desk.purposecapital.africa », que le proxy renvoyait ensuite vers le
   * hôte client. Cela marchait par accident, cela montrait une adresse qui ne
   * regarde personne, et cela dépendait d'une redirection dans la main d'un
   * robot. Tout ce qui se partage vit sur le hôte client : il est nommé ici.
   */
  metadataBase: new URL(clientOrigin() || "http://localhost:3000"),
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

/**
 * Les trois chiffres des trois pages d'achat : la cote, les fonds, les séances.
 * La bande large en fait une somme, les tuiles du téléphone les montrent un par
 * un. Ils sont comptés comme chaque page les montre, par « domain/listes », et
 * ne tiennent qu'à la lecture que le layout faisait déjà. N'échoue jamais la
 * page : sans eux les tuiles portent leur nom, et c'est tout.
 */
async function countOffers(): Promise<ComptesParLieu | undefined> {
  try {
    return comptesParLieu(await repo().listOffers());
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
  /* LE COMPTEUR SUIT LA SURFACE, PAS LE RÔLE.
     Il était éteint pour quiconque a le rôle « desk » ou « responsable ». Or
     un membre de la maison est aussi client chez elle : mesuré le 8 octobre
     2026, un compte « responsable » avec sa propre convention à accepter
     voyait la bande « Ce qui vous attend » sur sa page d'arrivée, puisque la
     bande, elle, ne regarde pas le rôle, et n'avait AUCUNE pastille. Deux
     lectures de la même chose, deux réponses. C'est la surface qui tranche :
     sur le site client, on est client, quel que soit son rôle ailleurs. */
  /**
   * QUATRE ÉTAGES EN SÉRIE SONT DEVENUS DEUX, et c'est de la latence pure.
   *
   * Mesuré le 20 octobre 2026, lecture par lecture contre la base : AUCUNE
   * n'est lente. La pire fait 669 ms, la plupart entre 200 et 600, et le
   * temps ne suit pas le nombre de lignes : zéro ligne coûte 216 ms, deux
   * cent soixante en coûtent 603. Ce qu'on paie est l'ALLER-RETOUR, pas la
   * donnée.
   *
   * Leur somme faisait 4 583 ms, leur maximum 669. Toute lecture mise en
   * série coûte donc son aller-retour entier, et la mise en page en
   * enchaînait quatre : le compte, le consentement, le poste, chacun
   * attendant le précédent alors qu'aucun n'a besoin de lui. Ils n'ont
   * besoin que de la SESSION, qui vient de l'étage d'avant.
   *
   * Un seul « Promise.all » les porte maintenant tous.
   */
  const [account, profile, attentes, consent, poste] = session
    ? await Promise.all([
        accountLine(session.userId),
        deskUi ? undefined : repo().getFinancialProfile(session.userId).catch(() => undefined),
        deskUi ? [] : attentesPourLaBarre(session.userId),
        // A client accepts the legal text once per version of it; the desk is bound by its contract, not by this box.
        !desk ? repo().getConsent(session.userId).catch(() => ({}) as { version?: string }) : undefined,
        deskUi ? chargerPoste(session.userId, session.role).catch(() => undefined) : undefined,
      ])
    : [undefined, undefined, [], undefined, undefined];
  const security = desk ? undefined : account?.security;
  const needsConsent = Boolean(session && !desk && consent?.version !== LEGAL_VERSION);
  /* LA SURFACE, ET POURQUOI C'EST LA SESSION QUI LA DIT.
     Le système de design décrit la vitrine devant la porte et l'espace de
     travail derrière, et « la porte » est la connexion : un visiteur est devant,
     un client connecté et le desk sont derrière. Ce n'est donc pas la route qui
     décide, et c'est voulu : si la vitrine se jugeait par la liste blanche de
     porte.ts, un client connecté qui ouvre « Risques et limites » verrait le
     thème basculer en cours de navigation. */
  const surface = session ? "travail" : "vitrine";

  const menu = <AppMenu signedIn={Boolean(session)} desk={deskUi} name={session?.name} vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY} build={process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7)} />;
  return (
    <html lang={lang} className={`${ui.variable} ${titre.variable}`} suppressHydrationWarning {...paletteAttrs(jar.get(P_COOKIE)?.value, jar.get(T_COOKIE)?.value, surface)}>
      <head>
        {/* the device's palette and theme, applied before the first paint */}
        <script dangerouslySetInnerHTML={{ __html: PALETTE_BOOT }} />
      </head>
      <body>
        <LangProvider lang={lang}>
        <AuthHashRedirect />
        <PaletteKeeper saved={account?.prefs} />
        <BarProbe />
        <ColonneStore>
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
            <NavTabs counts={navCounts} mode={navMode} connecte={Boolean(session)} />
            <div className={styles.right}>
              {/* CE QUI A QUITTÉ LA BARRE, ET POURQUOI.
                  « À décider » est passé dans le « ⋮ », qui en porte le
                  compte sur son bouton : la barre n'a pas la largeur en
                  portrait, et le compteur y disputait sa place au seul appel
                  à l'action de la page, « Ouvrir un compte titres ».
                  Le sélecteur de langue part aussi, pour les 67 px qu'il
                  prenait, mesurés : il vit déjà dans le menu, nommé, et se
                  touche une fois dans la vie d'un compte. */}
              {backend === "memory" && (
                <span className={styles.backend} title={t("Aucun backend configuré : données de démonstration en mémoire")}>
                  {t("démo · mémoire")}
                </span>
              )}
              <UserMenu session={session} deskUi={deskUi} account={session ? { name: session.name, segment: session.segment, tier: session.tier, desk: deskUi, email: account?.email ?? session.email, phone: account?.phone ?? session.phone, phoneOk: account?.phoneOk, emailOk: account?.emailOk, prefs: account?.prefs, kycStatus: session.kycStatus, vapidKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, security, profile: profile?.kind, build: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7), attentes: deskUi ? [] : attentes } : undefined} />
              {menu}
            </div>
          </div>
        </header>
        <MobileShell signedIn={Boolean(session)} name={session?.name} segment={session?.segment} tier={session?.tier} email={account?.email ?? session?.email} phone={account?.phone ?? session?.phone} phoneOk={account?.phoneOk} emailOk={account?.emailOk} prefs={account?.prefs} kycStatus={session?.kycStatus} vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY} security={security} profile={profile?.kind} build={process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7)} attentes={deskUi ? [] : attentes} desk={deskUi} deskHost={onDeskHost} menu={menu} />
        {needsConsent ? <ConsentGate previous={consent?.version} /> : null}
        <Presentation />
        <Onboarding />
        {/* LA NAVIGATION PASSE À GAUCHE AU-DELÀ DE 1040 PIXELS, et le haut est
            rendu à la page : 224 pixels gelés au desk, 62 au guichet.
            En dessous, rien ne change : la barre ci-dessus sert les écrans
            intermédiaires et le dock sert le téléphone. */}
        <div className={styles.avecColonne}>
          {/* SUR L'ADRESSE DU DESK, UN VISITEUR N'A PAS DE COLONNE.
              Faute de session, « deskUi » est faux et la colonne servait les
              groupes du VISITEUR : « Nos placements », « À propos », « Le
              guide ». C'est la vitrine de Guichet, dressée à gauche d'un
              formulaire d'administration — la même faute que la rangée de
              liens que le pied y affichait, et qui en est partie le
              12 octobre 2026. La console ne fait pas la publicité de la
              maison. Entré, l'opérateur retrouve la colonne du desk. */}
          {!(onDeskHost && !session) && (
          <Colonne
            mode={deskUi ? "desk" : "client"}
            connecte={Boolean(session)}
            enseigne={
              <Link className={styles.marque} href="/">
                <b>{COMPANY.name.toUpperCase()}</b>
                <span>{deskUi ? t("Desk") : PRODUCT.name}</span>
              </Link>
            }
            pied={
              /* AU DESK, LA FEUILLE DU COMPTE N'EST PAS CELLE DU CLIENT.
                 Celle du Guichet répond à « qui suis-je comme client » :
                 canaux prouvés, notifications, palier, statut KYC. Un
                 opérateur n'a rien de tout cela, et elle lui montrait des
                 cases vides sous un « Bonjour ». */
              deskUi && session && poste ? (
                <PosteDuDesk nom={session.name} poste={poste} build={process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7)} dock="bottom-left" />
              ) : (
              <UserMenu
                session={session}
                deskUi={deskUi}
                /* Au pied de la colonne, la feuille du compte s'ouvre en bas à
                   gauche. Ancrée en haut à droite, elle s'ouvrait à douze cents
                   pixels de l'avatar qu'on venait de toucher. */
                dock="bottom-left"
                account={session ? { name: session.name, segment: session.segment, tier: session.tier, desk: deskUi, email: account?.email ?? session.email, phone: account?.phone ?? session.phone, phoneOk: account?.phoneOk, emailOk: account?.emailOk, prefs: account?.prefs, kycStatus: session.kycStatus, vapidKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, security, profile: profile?.kind, build: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7), attentes: deskUi ? [] : attentes } : undefined}
              />
              )
            }
          />
          )}
          <main className={styles.main}>
            {/* Le rail des pages du marche se pose ici, et il decide lui-meme s il
                a lieu d etre : la mise en page d une famille vit a un endroit. */}
            <RailMarche>{children}</RailMarche>
          </main>
        </div>
        </RegistryProvider>
        </ColonneStore>
        {/* LE PIED RÉGLEMENTAIRE NE PARAÎT PAS DANS LA CONSOLE.
            Il adresse un CLIENT : l'agrément COSUMAF, l'adresse du siège, la
            mention « communication promotionnelle », la convention de
            rendement, le risque de perte en capital. Le desk n'est pas le
            destinataire de ces phrases, il en est l'auteur, et cent treize
            pixels de texte qu'on ne lit jamais ferment chaque page.
            Sur le guichet il reste entier : c'est là qu'il a un lecteur. */}
        {!onDeskHost && (
        <SaufSurLaPorte>
        <footer className={styles.footer}>
          {/* CE QUE LE « ⋮ » PORTAIT POUR UN VISITEUR, RESSORTI ET NOMMÉ.
              Le menu à trois points a disparu de la page publique le
              12 octobre 2026 : il cachait précisément ce qu'un visiteur
              cherche. Les deux choses qui comptaient reparaissent ici, en
              toutes lettres.

              SEULEMENT POUR QUI N'EST PAS ENTRÉ, et c'est la même règle qui a
              fait retirer le « ⋮ » au client : une porte par audience, pas
              deux. Le client règle sa langue derrière son initiale, où vit
              déjà tout son compte.

              ET SEULEMENT SUR LE SITE CLIENT. Sur l'adresse du desk, cette
              rangée vendait Guichet à qui venait ouvrir la console : trois
              liens de vitrine sous un formulaire d'administration. Une page
              d'administration ne fait pas la publicité de la maison. */}
          {/* LE SÉLECTEUR DE LANGUE N'EST PLUS ICI, et ce n'est pas qu'une
              question de place : « LangSwitch » pose un « form », ce « p » le
              contenait, et un « form » dans un « p » est du HTML invalide. Le
              navigateur défaisait l'imbrication au parsing, l'arbre rendu ne
              correspondait plus à celui du serveur, et chaque page publique
              rendait une erreur d'hydratation au premier clic — il fallait
              recharger pour la voir s'afficher. Il vit maintenant dans la
              pastille du coin (PorteVitrine), où il est dans un « div ». */}
          {!session && !onDeskHost && (
            <p className={styles.porteVisiteur}>
              <Link href="/info">{t("Le guide")}</Link>
              <Link href="/info/aide">{t("Aide et contact")}</Link>
              <Link href="/info/risques">{t("Risques et limites")}</Link>
            </p>
          )}
          <p>
            <b>{COMPANY.legalName}</b>, {t(COMPANY.licence)}. {COMPANY.address} · {COMPANY.phone} · {COMPANY.email}
          </p>
          <p>
            {t(DISCLAIMER)}
            {process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ? <span className={styles.build}> · v{process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA.slice(0, 7)}</span> : null}
          </p>
        </footer>
        </SaufSurLaPorte>
        )}
        {/* LES DEUX PORTES ET LA LANGUE, EN HAUT À DROITE, POUR QUI N'EST PAS
            ENTRÉ. La pastille est fixée à la fenêtre : elle ne dépend donc
            d'aucune des trois barres, dont deux n'existent pas au-delà de
            1040 px. Elle décide elle-même de paraître — la surface publique
            est une liste blanche, et seule l'adresse courante la connaît
            (porte.ts). */}
        <PorteVitrine signedIn={Boolean(session)} deskHost={onDeskHost} />
        </LangProvider>
      </body>
    </html>
  );
}
