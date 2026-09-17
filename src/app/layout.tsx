import type { Metadata } from "next";
import Link from "next/link";
import { Manrope } from "next/font/google";
import "./globals.css";
import styles from "./layout.module.css";
import { COMPANY, DISCLAIMER, PRODUCT } from "@/lib/config";
import { NavTabs } from "@/components/NavTabs";
import { backendName } from "@/lib/data";
import { getSession } from "@/lib/auth";
import { UserMenu } from "@/components/UserMenu";
import { MobileShell } from "@/components/mobile/MobileShell";
import { isDesk } from "@/lib/auth/types";
import { RegistryProvider } from "@/components/RegistryProvider";
import { loadRegistry } from "@/lib/reference";

// One family for everything — display, text and figures — with tabular numerals; see globals.css.
const ui = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-ui", display: "swap" });

export const metadata: Metadata = {
  title: { default: `${PRODUCT.name} · ${COMPANY.name}`, template: `%s · ${PRODUCT.name}` },
  description: "Opportunités et instruments financiers en CEMAC — titres publics, BVMAC, opérations de marché.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const backend = backendName();
  const [session, registry] = await Promise.all([getSession(), loadRegistry()]);
  return (
    <html lang="fr" className={ui.variable}>
      <body>
        <RegistryProvider types={registry.types} bondTerms={[...registry.bondTerms.values()]} glossary={registry.glossary}>
        <header className={styles.top}>
          <div className={styles.topIn}>
            <Link className={styles.brand} href="/">
              <b>{COMPANY.name.toUpperCase()}</b>
              <span>
                <em>{PRODUCT.name}</em> · {PRODUCT.tagline}
              </span>
            </Link>
            <NavTabs />
            <div className={styles.right}>
              {backend === "memory" && (
                <span className={styles.backend} title="Aucun backend configuré : données de démonstration en mémoire">
                  démo · mémoire
                </span>
              )}
              <UserMenu session={session} />
            </div>
          </div>
        </header>
        <MobileShell signedIn={Boolean(session)} name={session?.name} desk={isDesk(session)} />
        <main className={styles.main}>{children}</main>
        </RegistryProvider>
        <footer className={styles.footer}>
          <p>
            <b>{COMPANY.legalName}</b>, {COMPANY.licence}. {COMPANY.address} · {COMPANY.phone} · {COMPANY.email}
          </p>
          <p>{DISCLAIMER}</p>
        </footer>
      </body>
    </html>
  );
}
