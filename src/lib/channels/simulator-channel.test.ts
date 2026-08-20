import { describe, expect, it, vi } from "vitest";

vi.mock("../simulator-emitter", () => ({ emitToSession: vi.fn() }));

import { emitToSession } from "../simulator-emitter";
import { SimulatorChannel } from "./simulator-channel";

describe("SimulatorChannel.sendMessage", () => {
  const channel = new SimulatorChannel();

  it("content com buttons cai para texto puro, ignorando os botões", async () => {
    await channel.sendMessage("session_1", {
      content: "escolha uma opção",
      buttons: [{ id: "new_activity_suggestion", title: "Nova atividade" }],
    });
    expect(emitToSession).toHaveBeenCalledWith(
      "session_1",
      expect.objectContaining({ type: "message", text: "escolha uma opção" }),
    );
  });

  it("string pura continua funcionando", async () => {
    await channel.sendMessage("session_1", "oi");
    expect(emitToSession).toHaveBeenCalledWith(
      "session_1",
      expect.objectContaining({ type: "message", text: "oi" }),
    );
  });
});
