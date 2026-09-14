import type { Metadata } from "next";
import Link from "next/link";
import { IBM_Plex_Mono, Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import styles from "./layout.module.css";
import { COMPANY, DISCLAIMER, PRODUCT } from "@/lib/config";
import { NavTabs } from "@/components/NavTabs";
import { backendName } from "@/lib/data";
import { getSession } from "@/lib/auth";
import { UserMenu } from "@/components/UserMenu";

const display = Playfair_Display({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display", display: "swap" });
const ui = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-ui", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: `${PRODUCT.name} · ${COMPANY.name}`, template: `%s · ${PRODUCT.name}` },
  description: "Opportunités et instruments financiers en CEMAC — titres publics, BVMAC, opérations de marché.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const backend = backendName();
  const session = await getSession();
  return (
    <html lang="fr" className={`${display.variable} ${ui.variable} ${mono.variable}`}>
      <body>
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
        <main className={styles.main}>{children}</main>
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
