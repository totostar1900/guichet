/** Case-insensitive « contains » over several fields — the toolbar's search, applied server-side. */
export function textMatch(q: string | undefined, ...hay: (string | undefined | null)[]): boolean {
  const ql = (q ?? "").trim().toLowerCase();
  if (!ql) return true;
  return hay.some((h) => (h ?? "").toLowerCase().includes(ql));
}
