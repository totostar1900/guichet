"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Keeps desk pages current: Supabase Realtime on intents/events when
 * configured, a plain 20 s refresh otherwise. Server components re-render with
 * fresh data on router.refresh(), so no client state is duplicated.
 */
export function DeskLive({ supabaseUrl, anonKey }: { supabaseUrl?: string; anonKey?: string }) {
  const router = useRouter();
  useEffect(() => {
    if (supabaseUrl && anonKey) {
      let stop = () => {};
      import("@supabase/supabase-js").then(({ createClient }) => {
        const sb = createClient(supabaseUrl, anonKey);
        const ch = sb
          .channel("desk-live")
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "intents" }, () => router.refresh())
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "events" }, () => router.refresh())
          .subscribe();
        stop = () => {
          sb.removeChannel(ch);
        };
      });
      return () => stop();
    }
    const t = setInterval(() => router.refresh(), 20_000);
    return () => clearInterval(t);
  }, [router, supabaseUrl, anonKey]);
  return null;
}
