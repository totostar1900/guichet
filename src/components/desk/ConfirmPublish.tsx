"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useT } from "@/i18n/client";
import { Sheet } from "@/components/mobile/Sheet";
import styles from "./ConfirmPublish.module.css";

/**
 * La dernière lecture avant qu'une chose devienne publique.
 *
 * Elle ne demande pas « êtes-vous sûr ». Une question posée à chaque geste
 * entre dans le rythme du clic en une semaine, coûte une seconde à chaque fois
 * et n'attrape rien : le desk portait déjà deux window.confirm dont personne ne
 * sait dire le texte. Celle-ci redit ce qui va se passer, avec les chiffres,
 * dans les termes de l'opérateur. Ce n'est plus un ralentisseur, c'est une
 * relecture, et une relecture attrape des erreurs qu'un ralentisseur ne voit
 * pas.
 *
 * La règle qui l'empêche de se répandre partout : elle doit nommer la chose par
 * son titre et son public par un nombre. Si le code ne sait pas produire ces
 * deux faits, la boîte est du théâtre et ne s'ajoute pas.
 *
 * `typed` : le mot à recopier, pour ce qui quitte la plateforme et ne se
 * rattrape pas. `preview` : voir exactement ce que le client verra, qui vaut
 * mieux que le bouton lui-même.
 */
export function ConfirmPublish({
  form,
  label,
  title,
  lines,
  confirmLabel,
  typed,
  preview,
  className = "btn sm primary",
  disabled,
  pending,
}: {
  /** l'identifiant du formulaire que le bouton de confirmation envoie */
  form: string;
  label: string;
  title: string;
  /** ce qui va se passer, une ligne par conséquence */
  lines: string[];
  confirmLabel: string;
  typed?: string;
  preview?: { href: string; label: string };
  className?: string;
  disabled?: boolean;
  pending?: boolean;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState("");
  const id = useId();
  const locked = Boolean(typed) && word.trim().toLowerCase() !== (typed ?? "").toLowerCase();

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)} disabled={disabled || pending}>
        {pending ? "…" : label}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={title}>
        <ul className={styles.lines}>
          {lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        {preview && (
          <Link href={preview.href} target="_blank" rel="noreferrer" className={styles.preview}>
            {preview.label}
          </Link>
        )}
        {typed && (
          <label className={styles.typed} htmlFor={id}>
            {t("Recopiez « {w} » pour confirmer", { w: typed })}
            <input id={id} value={word} onChange={(e) => setWord(e.target.value)} autoComplete="off" spellCheck={false} />
          </label>
        )}
        <div className={styles.row}>
          <button type="button" className="btn ghost" onClick={() => setOpen(false)}>
            {t("Annuler")}
          </button>
          <button type="submit" form={form} className="btn primary" disabled={locked} onClick={() => setOpen(false)}>
            {confirmLabel}
          </button>
        </div>
      </Sheet>
    </>
  );
}
