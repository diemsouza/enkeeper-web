import { MEDIA_INLINE_PARAM } from "@/src/lib/constants";

// A signed URL do Supabase e cross-origin e o html-to-image falha em silencio ao embuti-la;
// o clone usa a rota de media em modo inline (bytes same-origin) sem tocar no DOM vivo.
async function createExportClone(node: HTMLElement): Promise<HTMLElement> {
  const clone = node.cloneNode(true) as HTMLElement;
  const images = Array.from(clone.querySelectorAll("img"));
  for (const img of images) {
    const url = new URL(img.src, window.location.href);
    url.searchParams.set(MEDIA_INLINE_PARAM, "1");
    img.removeAttribute("srcset");
    img.src = url.toString();
  }
  Object.assign(clone.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: `${node.offsetWidth}px`,
  });
  node.after(clone);
  await Promise.all(images.map((img) => img.decode()));
  return clone;
}

export async function exportBubbleAsPng(
  node: HTMLElement,
  messageId: string,
): Promise<void> {
  let clone: HTMLElement | null = null;
  try {
    const { toPng, getFontEmbedCSS } = await import("html-to-image");
    clone = await createExportClone(node);
    const width = node.offsetWidth;
    const fontEmbedCSS = await getFontEmbedCSS(clone);
    // O clone vai para um SVG do tamanho do proprio no, onde max-width em % encolheria a bolha.
    const options = {
      pixelRatio: 3,
      width,
      height: clone.offsetHeight,
      fontEmbedCSS,
      style: {
        width: `${width}px`,
        maxWidth: "none",
        minWidth: "0",
        margin: "0",
        position: "static",
      },
    };
    // Na 1a renderizacao o data URL da imagem ainda nao foi decodificado dentro do SVG e sai em branco.
    if (clone.querySelector("img")) await toPng(clone, options);
    const dataUrl = await toPng(clone, options);
    const link = document.createElement("a");
    link.download = `fluizer-${messageId}.png`;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error("Falha ao exportar bolha", error);
  } finally {
    clone?.remove();
  }
}
