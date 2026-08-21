export type FormattedMessageButton = { id: string; label: string };

// text é obrigatório: usado sempre para persistência (Message.content) e por
// canais sem suporte a áudio/interativo/template. audioPath, templateName e
// interactive são camadas opcionais de apresentação, decididas por cada canal.
export type FormattedMessage = {
  text: string;
  audioPath?: string;
  templateName?: string | null;
  interactive?: { body: string; buttons: FormattedMessageButton[] };
};
