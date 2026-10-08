export async function exportBubbleAsPng(
  node: HTMLElement,
  messageId: string,
): Promise<void> {
  try {
    const { toPng } = await import("html-to-image");
    const width = node.offsetWidth;
    // O clone vai para um SVG do tamanho do proprio no, onde max-width em % encolheria a bolha.
    const dataUrl = await toPng(node, {
      pixelRatio: 3,
      width,
      height: node.offsetHeight,
      style: {
        width: `${width}px`,
        maxWidth: "none",
        minWidth: "0",
        margin: "0",
      },
    });
    const link = document.createElement("a");
    link.download = `fluizer-${messageId}.png`;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error("Falha ao exportar bolha", error);
  }
}
