export type FormattedMessageButton = {
  id: string;
  label: string;
  type?: "reply" | "link";
  url?: string;
};

// text é obrigatório: usado sempre para persistência (Message.content) e por
// canais sem suporte a áudio/interativo/template. audioMediaId, imageMediaId,
// templateName e interactive são camadas opcionais de apresentação, decididas
// por cada canal. imageMediaId: envia a imagem com o text como caption, na mesma
// mensagem (diferente do audioMediaId, que vai como mensagem separada).
export type FormattedMessage = {
  text: string;
  audioMediaId?: string;
  imageMediaId?: string;
  templateName?: string | null;
  templateBodyParams?: string[];
  templateButtonUrlParam?: string;
  interactive?: {
    body: string;
    buttons: FormattedMessageButton[];
    // Botoes sao opcoes de resposta; cada canal decide como renderizar.
    // WhatsApp limita reply buttons a 3 e o titulo a 20 chars, entao la
    // o canal anexa a lista numerada ao text em vez de mandar botoes.
    isOptionList?: boolean;
    // Estado da selecao de uma lista de opcoes, escrito pela avaliacao da
    // resposta. Ausentes = pendente.
    disabled?: boolean;
    selectedId?: string;
  };
};
