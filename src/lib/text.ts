/** Lower case without accents: what every search box compares, so « etat » finds « État » and « echeance » finds « Échéance ». */
export const fold = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Accent- and case-insensitive « contains » over several fields : the toolbar's search, applied server-side. */
export function textMatch(q: string | undefined, ...hay: (string | undefined | null)[]): boolean {
  const ql = fold((q ?? "").trim());
  if (!ql) return true;
  return hay.some((h) => fold(h ?? "").includes(ql));
}
