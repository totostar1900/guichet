"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useT } from "@/i18n/client";
import type { T } from "@/i18n/core";
import { getRegistry, lessonForTerm } from "@/lib/registry";
import { Actor, type ActorKind } from "./Illustrations";
import { Sheet } from "./mobile/Sheet";
import styles from "./TermSheet.module.css";

/**
 * A word of the Guichet, explained on the page it is read on: the map of the
 * actors and the lessons open this sheet instead of leaving for the
 * glossary. It shows the actor's drawing when there is one, the name and what
 * the acronym stands for, the role in two sentences, then the glossary entry
 * and the lesson that talks about it. One host in the layout, opened from
 * anywhere with `openTerm(key)`; `linkTerms(text)` turns the known words of a
 * sentence into taps.
 */
const EVENT = "guichet:term";
export const openTerm = (key: string) => window.dispatchEvent(new CustomEvent(EVENT, { detail: key }));

/** The actor drawn for a term, when the term is an actor. */
const ACTOR: Record<string, ActorKind> = { beac: "beac", cosumaf: "cosumaf", bvmac: "bvmac", depositaire: "depositaire", tresor: "tresor", svt: "svt", gestion: "gestion", societe_bourse: "guichet", emetteur: "entreprise", compte_titres: "client" };

/** The words a sentence links by itself, in both languages: acronyms, actors, the operations. First occurrence per text. */
const PATTERNS: [string, RegExp][] = [
  ["bta", /\bBTA\b/],
  ["ota", /\bOTA\b/],
  ["apes", /\bAPE\b/],
  ["svt", /\bSVT\b/],
  ["opcvm", /\bOPCVM\b/],
  ["vl", /\bVL\b|\bNAV\b/],
  ["beac", /\bBEAC\b/],
  ["cosumaf", /\bCOSUMAF\b/],
  ["bvmac", /\bBVMAC\b/],
  ["adjudication", /\badjudications?\b|\bauctions?\b/i],
  ["rachat", /\brachats?\b|\bbuybacks?\b/i],
  ["introduction", /\bintroductions? en bourse\b|\bIPOs?\b/],
  ["depositaire", /\bdépositaires?\b|\bcustodians?\b/i],
  ["tresor", /\bTrésors? publics?\b|\bPublic Treasur(?:y|ies)\b/],
  ["gestion", /\bsociétés? de gestion\b|\bmanagement compan(?:y|ies)\b/i],
  ["societe_bourse", /\bsociétés? de bourse\b|\bbrokerage firms?\b/i],
  ["compte_titres", /\bcompte-titres\b|\bcustody accounts?\b/i],
  ["coupon_couru", /\bcoupon couru\b|\baccrued coupon\b/i],
];

/** A tappable word: a gold line in running text, a thin dotted one () inside a drawing. */
export function TermWord({ k, children, subtle }: { k: string; children: ReactNode; subtle?: boolean }) {
  const t = useT();
  return (
    <button type="button" className={`${styles.word} ${subtle ? styles.subtle : ""}`} onClick={() => openTerm(k)} aria-label={`${children} : ${t("un mot du Guichet")}`}>
      {children}
    </button>
  );
}

/** The sentence with its known words made tappable; `seen` keeps one tap per word across several sentences. */
export function linkTerms(text: string, seen: Set<string> = new Set(), subtle = false): ReactNode[] {
  const glossary = getRegistry().glossary;
  const out: ReactNode[] = [];
  let rest = text;
  let n = 0;
  for (;;) {
    let best: { k: string; i: number; m: string } | undefined;
    for (const [k, re] of PATTERNS) {
      if (seen.has(k) || !glossary[k]) continue;
      const m = re.exec(rest);
      if (m && (!best || m.index < best.i)) best = { k, i: m.index, m: m[0] };
    }
    if (!best) break;
    if (best.i > 0) out.push(rest.slice(0, best.i));
    out.push(
      <TermWord key={`${best.k}-${n++}`} k={best.k} subtle={subtle}>
        {best.m}
      </TermWord>,
    );
    seen.add(best.k);
    rest = rest.slice(best.i + best.m.length);
  }
  if (rest) out.push(rest);
  return out;
}

/** Sentences in a row (a lesson's body): each paragraph linked, one tap per word for the whole body. */
export function LinkedParagraphs({ paragraphs, className }: { paragraphs: string[]; className?: string }) {
  const seen = new Set<string>();
  return (
    <>
      {paragraphs.map((p, i) => (
        <p key={i} className={className}>
          {linkTerms(p, seen)}
        </p>
      ))}
    </>
  );
}

/** One line with its words linked (a caption, a subtitle). */
export function Linked({ text, subtle }: { text: string; subtle?: boolean }) {
  return <>{linkTerms(text, new Set(), subtle)}</>;
}

const title = (t: T, k: string) => {
  const term = getRegistry().glossary[k];
  return term ? t(term.short) : k;
};

/** Mounted once in the layout: listens for `openTerm`. */
export function TermSheetHost() {
  const t = useT();
  const [key, setKey] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = (e: Event) => {
      setKey((e as CustomEvent<string>).detail);
      setOpen(true);
    };
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  const term = key ? getRegistry().glossary[key] : undefined;
  const lesson = key ? lessonForTerm(key) : undefined;
  const actor = key ? ACTOR[key] : undefined;
  const close = () => setOpen(false);
  return (
    <Sheet open={open} onClose={close} navy title={key ? title(t, key) : ""} sub={term?.long ? t(term.long) : undefined}>
      {term && key && (
        <div className={styles.body}>
          {actor && (
            <span className={styles.plate}>
              <Actor kind={actor} size={88} />
            </span>
          )}
          <p className={styles.text}>{t(term.text)}</p>
          <div className={styles.links}>
            <Link href={`/info#terme-${key}`} onClick={close}>
              {t("Voir dans le glossaire")} →
            </Link>
            {lesson && (
              <Link href={`/info/${lesson.key}`} onClick={close}>
                {t("La leçon qui en parle")} : {t(lesson.title)} →
              </Link>
            )}
          </div>
        </div>
      )}
    </Sheet>
  );
}
