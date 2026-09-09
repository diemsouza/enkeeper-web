import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/src/lib/supabase-browser";

export function useRealtimeMessages(
  userId: string,
  onEvent: () => void,
  onReady?: () => void,
): void {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    let cancelled = false;
    const supabase = createSupabaseBrowserClient();
    let channel: RealtimeChannel | null = null;

    async function connect(): Promise<void> {
      let token: string;
      try {
        const res = await fetch("/api/app/realtime-token", {
          credentials: "include",
        });
        if (!res.ok) {
          console.error("[realtime] falha ao buscar token", res.status);
          return;
        }
        if (cancelled) return;
        ({ token } = (await res.json()) as { token: string });
      } catch (error) {
        console.error("[realtime] erro ao buscar token", error);
        return;
      }
      if (cancelled) return;

      if (channel) {
        await supabase.removeChannel(channel);
        channel = null;
      }

      supabase.realtime.setAuth(token);

      channel = supabase
        .channel(`messages-${userId}`, { config: { private: true } })
        .on("broadcast", { event: "INSERT" }, (payload) => onEventRef.current())
        .on("broadcast", { event: "UPDATE" }, (payload) => onEventRef.current())
        .subscribe((status, err) => {
          if (status === "SUBSCRIBED") {
            onReadyRef.current?.();
            return;
          }
          if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT" ||
            status === "CLOSED"
          ) {
            console.error("[realtime] subscribe status", status, err);
          }
        });
    }

    void connect();

    function handleReconnect(): void {
      if (cancelled) return;
      onEventRef.current();
      void connect();
    }

    function handleVisibilityChange(): void {
      if (document.visibilityState === "visible") handleReconnect();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleReconnect);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleReconnect);
      supabase.removeAllChannels();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
}
