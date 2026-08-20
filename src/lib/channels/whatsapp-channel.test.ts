import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../vendors/whatsapp.vendor", () => ({
  sendWhatsAppMessage: vi.fn().mockResolvedValue("wamid_text"),
  sendWhatsAppTemplate: vi.fn().mockResolvedValue("wamid_template"),
  uploadWhatsAppMedia: vi.fn(),
  sendWhatsAppAudio: vi.fn(),
  sendWhatsAppInteractiveButtons: vi.fn().mockResolvedValue("wamid_interactive"),
}));
vi.mock("../../vendors/storage.vendor", () => ({ downloadFile: vi.fn() }));
vi.mock("../../vendors/tts.vendor", () => ({ TTS_MIME_TYPE: "audio/ogg" }));

import {
  sendWhatsAppInteractiveButtons,
  sendWhatsAppMessage,
} from "../../vendors/whatsapp.vendor";
import { WhatsAppChannel } from "./whatsapp-channel";

describe("WhatsAppChannel.sendMessage", () => {
  const channel = new WhatsAppChannel();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("texto puro chama sendWhatsAppMessage", async () => {
    const result = await channel.sendMessage("5511999999999", "oi");
    expect(sendWhatsAppMessage).toHaveBeenCalledWith("5511999999999", "oi");
    expect(result).toEqual({ externalId: "wamid_text" });
  });

  it("content com buttons chama a rota interativa", async () => {
    const result = await channel.sendMessage("5511999999999", {
      content: "escolha uma opção",
      buttons: [{ id: "new_activity_suggestion", title: "Nova atividade" }],
    });
    expect(sendWhatsAppInteractiveButtons).toHaveBeenCalledWith(
      "5511999999999",
      "escolha uma opção",
      [{ id: "new_activity_suggestion", title: "Nova atividade" }],
    );
    expect(result).toEqual({ externalId: "wamid_interactive" });
  });
});
