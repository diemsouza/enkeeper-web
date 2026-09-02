export type FormattedMessageButton = {
  id: string;
  label: string;
  type?: "reply" | "link";
  url?: string;
};

// text é obrigatório: usado sempre para persistência (Message.content) e por
// canais sem suporte a áudio/interativo/template. audioPath, imagePath,
// templateName e interactive são camadas opcionais de apresentação, decididas
// por cada canal. imagePath: envia a imagem com o text como caption, na mesma
// mensagem (diferente do audioPath, que vai como mensagem separada).
export type FormattedMessage = {
  text: string;
  audioPath?: string;
  imagePath?: string;
  templateName?: string | null;
  interactive?: { body: string; buttons: FormattedMessageButton[] };
};
