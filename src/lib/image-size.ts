export type ImageSize = { width: number; height: number };

async function decodeImageSize(img: HTMLImageElement): Promise<ImageSize | null> {
  try {
    await img.decode();
  } catch {
    return null;
  }
  if (img.naturalWidth <= 0 || img.naturalHeight <= 0) return null;
  return { width: img.naturalWidth, height: img.naturalHeight };
}

// Pre-carrega a imagem para saber o tamanho antes de renderizar a bolha.
// Falha ou demora alem do limite devolve null (a bolha cresce ao carregar).
export async function loadImageSize(
  url: string,
  timeoutMs: number,
): Promise<ImageSize | null> {
  const img = new Image();
  img.src = url;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), timeoutMs);
  });
  const size = await Promise.race([decodeImageSize(img), timeout]);
  clearTimeout(timer);
  return size;
}
