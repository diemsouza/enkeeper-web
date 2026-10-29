import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../vendors/whatsapp.vendor", () => ({
  sendWhatsAppMessage: vi.fn().mockResolvedValue("wamid_text"),
  sendWhatsAppTemplate: vi.fn().mockResolvedValue("wamid_template"),
  uploadWhatsAppMedia: vi.fn().mockResolvedValue("media_id"),
  sendWhatsAppAudio: vi.fn(),
  sendWhatsAppImage: vi.fn().mockResolvedValue("wamid_image"),
  sendWhatsAppInteractiveButtons: vi.fn().mockResolvedValue("wamid_interactive"),
  sendWhatsAppTypingIndicator: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../vendors/storage.vendor", () => ({
  downloadFile: vi.fn().mockResolvedValue(Buffer.from("png")),
}));
vi.mock("../../repo/media.repo", () => ({
  getMediaById: vi.fn().mockResolvedValue({
    id: "01JIMAGE",
    mediaPath: "question-image/01JIMAGE.png",
    contentType: "image/png",
  }),
}));

import { downloadFile } from "../../vendors/storage.vendor";
import {
  sendWhatsAppImage,
  uploadWhatsAppMedia,
  sendWhatsAppInteractiveButtons,
  sendWhatsAppMessage,
  sendWhatsAppTemplate,
  sendWhatsAppTypingIndicator,
} from "../../vendors/whatsapp.vendor";
import { WhatsAppChannel } from "./whatsapp-channel";

describe("WhatsAppChannel.sendMessage", () => {
  const channel = new WhatsAppChannel();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("texto puro chama sendWhatsAppMessage", async () => {
    const result = await channel.sendMessage("5511999999999", { text: "oi" });
    expect(sendWhatsAppMessage).toHaveBeenCalledWith("5511999999999", "oi");
    expect(result).toEqual({ externalId: "wamid_text" });
  });

  it("interactive chama a rota de botões", async () => {
    const result = await channel.sendMessage("5511999999999", {
      text: "escolha uma opção (texto puro)",
      interactive: {
        body: "escolha uma opção",
        buttons: [{ id: "new_activity_suggestion", label: "Nova atividade" }],
      },
    });
    expect(sendWhatsAppInteractiveButtons).toHaveBeenCalledWith(
      "5511999999999",
      "escolha uma opção",
      [{ id: "new_activity_suggestion", title: "Nova atividade" }],
    );
    expect(result).toEqual({ externalId: "wamid_interactive" });
  });

  it("interactive com isOptionList envia o text com lista numerada, sem botões", async () => {
    const result = await channel.sendMessage("5511999999999", {
      text: "Which word means happy?",
      interactive: {
        body: "Which word means happy?",
        buttons: [
          { id: "choice_option_1", label: "glad" },
          { id: "choice_option_2", label: "tired" },
        ],
        isOptionList: true,
      },
    });
    expect(sendWhatsAppMessage).toHaveBeenCalledWith(
      "5511999999999",
      "Which word means happy?\n\n1) glad\n2) tired",
    );
    expect(sendWhatsAppInteractiveButtons).not.toHaveBeenCalled();
    expect(result).toEqual({ externalId: "wamid_text" });
  });

  it("templateName tem prioridade sobre interactive e text", async () => {
    const result = await channel.sendMessage("5511999999999", {
      text: "texto livre",
      templateName: "nudge_d2",
      interactive: { body: "b", buttons: [] },
    });
    expect(sendWhatsAppTemplate).toHaveBeenCalledWith(
      "5511999999999",
      "nudge_d2",
      undefined,
      undefined,
    );
    expect(sendWhatsAppInteractiveButtons).not.toHaveBeenCalled();
    expect(sendWhatsAppMessage).not.toHaveBeenCalled();
    expect(result).toEqual({ externalId: "wamid_template" });
  });

  it("imageMediaId tem prioridade sobre interactive: imagem com lista numerada na legenda, sem botões", async () => {
    const result = await channel.sendMessage("5511999999999", {
      text: "O que a imagem mostra?",
      imageMediaId: "01JIMAGE",
      interactive: {
        body: "O que a imagem mostra?",
        buttons: [
          { id: "image_option_1", label: "run" },
          { id: "image_option_2", label: "sleep" },
        ],
        isOptionList: true,
      },
    });
    expect(sendWhatsAppImage).toHaveBeenCalledWith(
      "5511999999999",
      "media_id",
      "O que a imagem mostra?\n\n1) run\n2) sleep",
    );
    expect(downloadFile).toHaveBeenCalledWith({
      filePath: "question-image/01JIMAGE.png",
    });
    expect(uploadWhatsAppMedia).toHaveBeenCalledWith(
      expect.any(Buffer),
      "image/png",
    );
    expect(sendWhatsAppInteractiveButtons).not.toHaveBeenCalled();
    expect(sendWhatsAppMessage).not.toHaveBeenCalled();
    expect(result).toEqual({ externalId: "wamid_image" });
  });
});

describe("WhatsAppChannel.notifyTyping", () => {
  const channel = new WhatsAppChannel();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("com replyToMessageId envia o indicador ligado à mensagem recebida", async () => {
    await channel.notifyTyping("user_1", { replyToMessageId: "wamid_in" });
    expect(sendWhatsAppTypingIndicator).toHaveBeenCalledWith("wamid_in");
  });

  it("sem replyToMessageId não chama a Cloud API", async () => {
    await channel.notifyTyping("user_1");
    expect(sendWhatsAppTypingIndicator).not.toHaveBeenCalled();
  });

  it("falha na Cloud API não propaga", async () => {
    vi.mocked(sendWhatsAppTypingIndicator).mockRejectedValueOnce(
      new Error("boom"),
    );
    await expect(
      channel.notifyTyping("user_1", { replyToMessageId: "wamid_in" }),
    ).resolves.toBeUndefined();
  });
});
