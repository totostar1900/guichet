import { DeskNav } from "@/components/DeskNav";
import { getT } from "@/i18n/server";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { etapeDuMandat, JOURS_AVANT_ABANDON_DE_COPIE, MOTIFS_DE_REFUS_DE_COPIE } from "@/lib/domain/mandat";
import { fmt, fmtDate } from "@/lib/format";
import { VerifierLaCopie } from "./VerifierLaCopie";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mandats à vérifier" };

/**
 * LES MANDATS À VÉRIFIER (15 novembre 2026, maquette « Signature manuelle » : 1A).
 *
 * Un mandat se signe par code, puis à la main sur le même document, déposé à la banque du client ; la copie vient ici. Le desk la lit, contrôle cinq choses, puis valide
 * (le mandat prélève) ou refuse avec un motif (le client renvoie une copie). Il garde la copie au dossier. Rien n'est prélevé tant que le mandat n'est pas validé.
 */
export default async function MandatsAVerifierPage() {
  await requireDesk("/desk/prelevements/copies");
  const t = await getT();
  const r = repo();
  const [mandats, fiches] = await Promise.all([r.listMandats(), r.listClientFiles().catch(() => [])]);
  const nomDe = new Map(fiches.map((f) => [f.userId, f.identity.name]));
  const aVerifier = mandats.filter((m) => m.state !== "revoque" && etapeDuMandat(m) === "en_verification").sort((a, b) => (a.copieRecueLe ?? "").localeCompare(b.copieRecueLe ?? ""));
  const enAttente = mandats.filter((m) => m.state !== "revoque" && (etapeDuMandat(m) === "copie_attendue" || etapeDuMandat(m) === "copie_refusee"));
  const motifs = (Object.keys(MOTIFS_DE_REFUS_DE_COPIE) as (keyof typeof MOTIFS_DE_REFUS_DE_COPIE)[]).map((k) => ({ value: k, label: t(MOTIFS_DE_REFUS_DE_COPIE[k]) }));
  const controles = [
    t("Le document est bien celui de la référence du mandat"),
    t("La signature ressemble au spécimen du dossier"),
    t("Le titulaire est celui du dossier"),
    t("Le RIB correspond à celui du mandat"),
    t("Le cachet ou la mention de la banque est présent, si la banque en pose un"),
  ];
  return (
    <>
      <DeskNav current="/desk/prelevements" badges={{ "/desk/prelevements": aVerifier.length }} />
      <div className={styles.page}>
        <header className={styles.head}>
          <h1>{t("Mandats à vérifier")}</h1>
          <p className="muted">
            {t("Le client a signé son mandat par code, puis à la main, et vous envoie la copie. Vous la lisez, vous contrôlez cinq points, puis vous validez ou vous refusez. Rien n'est prélevé avant votre validation, et la copie reste au dossier.")}
          </p>
        </header>

        {aVerifier.length === 0 ? (
          <p className="muted">{t("Aucune copie à vérifier.")}</p>
        ) : (
          <ul className={styles.liste}>
            {aVerifier.map((m) => (
              <li key={m.id} className={styles.carte}>
                <div className={styles.tete}>
                  <b>{nomDe.get(m.userId) ?? m.accountHolder}</b>
                  <span className="mono">{m.ref}</span>
                  <span className="muted">{t("copie reçue le {d}", { d: m.copieRecueLe ? fmtDate(m.copieRecueLe) : "—" })}</span>
                </div>
                <dl className={styles.faits}>
                  <div><dt>{t("Titulaire")}</dt><dd>{m.accountHolder}</dd></div>
                  <div><dt>{t("Compte débité")}</dt><dd>{m.bankName} · <span className="mono">{m.bankAccount}</span></dd></div>
                  <div><dt>{t("Montant présenté")}</dt><dd>{fmt(m.amount)} FCFA</dd></div>
                </dl>
                <p>
                  <a href={`/api/documents/mandat-copie/${m.id}`} target="_blank" rel="noopener noreferrer">
                    {t("Lire la copie signée")} ↗
                  </a>{" "}
                  <span className="muted">({m.copieNom})</span>
                </p>
                <ul className={styles.controles}>
                  {controles.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
                <VerifierLaCopie id={m.id} motifs={motifs} />
              </li>
            ))}
          </ul>
        )}

        {enAttente.length > 0 && (
          <section className={styles.attente}>
            <h2>{t("Copie attendue ou refusée")}</h2>
            <ul>
              {enAttente.map((m) => (
                <li key={m.id}>
                  <span className="mono">{m.ref}</span> · {nomDe.get(m.userId) ?? m.accountHolder} · {m.refusLe ? t("refusée le {d}", { d: fmtDate(m.refusLe) }) : t("signé par code le {d}", { d: fmtDate(m.signedAt ?? "") })}
                </li>
              ))}
            </ul>
            <p className="muted">{t("Un rappel part au bout de 7 jours ; au bout de {n} jours sans copie, le mandat est retiré avec son épargne.", { n: String(JOURS_AVANT_ABANDON_DE_COPIE) })}</p>
          </section>
        )}
      </div>
    </>
  );
}
