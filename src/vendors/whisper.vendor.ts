export async function transcribeAudio(buffer: Buffer, mimeType: string): Promise<string> {
  const ext = mimeType.split("/")[1]?.split(";")[0] ?? "ogg";
  const formData = new FormData();
  formData.append("file", new Blob([new Uint8Array(buffer)], { type: mimeType }), `audio.${ext}`);
  formData.append("model", "whisper-1");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: formData,
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Whisper API error ${res.status}: ${detail}`);
  }

  const data = (await res.json()) as { text: string };
  return data.text;
}
