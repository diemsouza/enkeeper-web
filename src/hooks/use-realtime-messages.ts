import { useEffect, useRef } from "react";
import type {
  RealtimeChannel,
  REALTIME_SUBSCRIBE_STATES,
} from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/src/lib/supabase-browser";

type BroadcastRow = Record<string, unknown>;

type BroadcastPayload = {
  payload?: { record?: BroadcastRow; old_record?: BroadcastRow };
};

type SubscribeStatus = `${REALTIME_SUBSCRIBE_STATES}`;

const RECONNECT_BACKOFF_MS = [2_000, 5_000, 10_000, 30_000];
// Token do canal expira em 1h (src/core/realtime-token.ts): renova antes
// pro servidor nao derrubar o canal com a aba aberta.
const TOKEN_REFRESH_MS = 50 * 60 * 1000;

async function fetchRealtimeToken(): Promise<string | null> {
  try {
    const res = await fetch("/api/app/realtime-token", {
      credentials: "include",
    });
    if (!res.ok) {
      console.error("[realtime] falha ao buscar token", res.status);
      return null;
    }
    const { token } = (await res.json()) as { token: string };
    return token;
  } catch (error) {
    console.error("[realtime] erro ao buscar token", error);
    return null;
  }
}

export function useRealtimeMessages(
  userId: string,
  onEvent: (record: BroadcastRow | undefined) => void,
  onReconnect: () => void,
  onReady?: () => void,
): void {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const onReconnectRef = useRef(onReconnect);
  onReconnectRef.current = onReconnect;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    let cancelled = false;
    const supabase = createSupabaseBrowserClient();
    const topic = `messages-${userId}`;
    let activeChannel: RealtimeChannel | null = null;
    let connecting: Promise<void> | null = null;
    let retryAttempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let tokenTimer: ReturnType<typeof setTimeout> | null = null;

    function scheduleReconnect(): void {
      if (cancelled || retryTimer) return;
      const wait =
        RECONNECT_BACKOFF_MS[
          Math.min(retryAttempt, RECONNECT_BACKOFF_MS.length - 1)
        ];
      retryAttempt += 1;
      retryTimer = setTimeout(() => {
        retryTimer = null;
        void connect();
      }, wait);
    }

    function scheduleTokenRefresh(): void {
      if (tokenTimer) clearTimeout(tokenTimer);
      tokenTimer = setTimeout(async () => {
        tokenTimer = null;
        const token = await fetchRealtimeToken();
        if (cancelled) return;
        if (!token) {
          scheduleReconnect();
          return;
        }
        await supabase.realtime.setAuth(token);
        scheduleTokenRefresh();
      }, TOKEN_REFRESH_MS);
    }

    // Broadcast nao guarda historico: o que foi transmitido com o canal fora
    // do ar se perde, entao todo SUBSCRIBED busca as mensagens de novo.
    function handleStatus(
      channel: RealtimeChannel,
      status: SubscribeStatus,
      err?: Error,
    ): void {
      if (cancelled || channel !== activeChannel) return;
      if (status === "SUBSCRIBED") {
        retryAttempt = 0;
        onReadyRef.current?.();
        onReconnectRef.current();
        return;
      }
      console.error("[realtime] subscribe status", status, err);
      scheduleReconnect();
    }

    // supabase.channel() devolve o canal existente do mesmo topico, e um
    // canal ja inscrito lanca erro no subscribe(): remove todos antes.
    async function removeTopicChannels(): Promise<void> {
      activeChannel = null;
      const existing = supabase
        .getChannels()
        .filter((c) => c.topic === `realtime:${topic}`);
      await Promise.all(existing.map((c) => supabase.removeChannel(c)));
    }

    async function openChannel(): Promise<void> {
      const token = await fetchRealtimeToken();
      if (cancelled) return;
      if (!token) {
        scheduleReconnect();
        return;
      }
      await removeTopicChannels();
      if (cancelled) return;
      await supabase.realtime.setAuth(token);
      scheduleTokenRefresh();

      const handleBroadcast = (payload: BroadcastPayload): void => {
        onEventRef.current(payload?.payload?.record);
      };
      const channel = supabase
        .channel(topic, { config: { private: true } })
        .on("broadcast", { event: "INSERT" }, handleBroadcast)
        .on("broadcast", { event: "UPDATE" }, handleBroadcast);
      activeChannel = channel;
      channel.subscribe((status, err) => handleStatus(channel, status, err));
    }

    async function connect(): Promise<void> {
      if (connecting) return connecting;
      connecting = openChannel();
      try {
        await connecting;
      } finally {
        connecting = null;
      }
    }

    void connect();

    function handleReconnect(): void {
      if (cancelled) return;
      void connect();
    }

    function handleVisibilityChange(): void {
      if (document.visibilityState === "visible") handleReconnect();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleReconnect);

    return () => {
      cancelled = true;
      activeChannel = null;
      if (retryTimer) clearTimeout(retryTimer);
      if (tokenTimer) clearTimeout(tokenTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleReconnect);
      supabase.removeAllChannels();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
}
