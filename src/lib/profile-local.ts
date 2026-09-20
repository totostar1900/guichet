import { useSyncExternalStore } from "react";
import type { FinancialProfile } from "@/data/profile";

/**
 * A visitor's financial profile, before any account: kept on this device
 * only, for information. Signing in offers to keep it in the file.
 */
const KEY = "guichet:profile";
const EVENT = "guichet:profile:change";

const raw = () => {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
};
const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
};

/** The profile on this device, or none; empty on the server so the page hydrates the same. */
export function useLocalProfile(): FinancialProfile | undefined {
  const s = useSyncExternalStore(subscribe, raw, () => "");
  if (!s) return undefined;
  try {
    const p = JSON.parse(s) as FinancialProfile;
    return p && p.kind && p.answers ? p : undefined;
  } catch {
    return undefined;
  }
}

export function writeLocalProfile(p: FinancialProfile | null): void {
  try {
    if (p) localStorage.setItem(KEY, JSON.stringify(p));
    else localStorage.removeItem(KEY);
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // storage unavailable: the profile lives for this page only
  }
}
