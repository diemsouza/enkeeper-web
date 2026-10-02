type RealtimeConfig = { url: string; serviceKey: string };

function getRealtimeConfig(): RealtimeConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_KEY não configurados",
    );
  }

  return { url, serviceKey };
}

// Broadcast pela REST API do Realtime: o servidor nao mantem socket aberto.
// A service key passa pela policy do canal privado.
export async function broadcastRealtimeEvent(params: {
  topic: string;
  event: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const { url, serviceKey } = getRealtimeConfig();

  const res = await fetch(`${url}/realtime/v1/api/broadcast`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [
        {
          topic: params.topic,
          event: params.event,
          payload: params.payload ?? {},
          private: true,
        },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Erro ao enviar broadcast do realtime (${res.status}): ${text || "unknown"}`,
    );
  }
}
