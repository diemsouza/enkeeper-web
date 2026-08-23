import { describe, expect, it, vi } from "vitest";

vi.mock("../simulator-emitter", () => ({ emitToSession: vi.fn() }));

import { emitToSession } from "../simulator-emitter";
import { SimulatorChannel } from "./simulator-channel";

describe("SimulatorChannel.sendMessage", () => {
  const channel = new SimulatorChannel();

  it("interactive é repassado junto do texto", async () => {
    const interactive = {
      body: "escolha uma opção (interativo)",
      buttons: [{ id: "new_activity_suggestion", label: "Nova atividade" }],
    };
    await channel.sendMessage("session_1", {
      text: "escolha uma opção",
      interactive,
    });
    expect(emitToSession).toHaveBeenCalledWith(
      "session_1",
      expect.objectContaining({
        type: "message",
        text: "escolha uma opção",
        interactive,
      }),
    );
  });

  it("templateName é ignorado, usa text", async () => {
    await channel.sendMessage("session_1", {
      text: "texto livre",
      templateName: "nudge_d2",
    });
    expect(emitToSession).toHaveBeenCalledWith(
      "session_1",
      expect.objectContaining({ type: "message", text: "texto livre" }),
    );
  });

  it("texto puro continua funcionando", async () => {
    await channel.sendMessage("session_1", { text: "oi" });
    expect(emitToSession).toHaveBeenCalledWith(
      "session_1",
      expect.objectContaining({ type: "message", text: "oi" }),
    );
  });
});
