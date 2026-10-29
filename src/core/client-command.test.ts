import { describe, expect, it } from "vitest";
import {
  buildClientCommandMetadata,
  parseClientCommand,
} from "./client-command";

describe("parseClientCommand", () => {
  it("le o comando salvo pelo servidor", () => {
    const metadata = buildClientCommandMetadata({
      action: "open_create_activity",
      payload: {},
      replyTo: "ext-1",
    });
    expect(parseClientCommand(metadata)).toEqual({
      action: "open_create_activity",
      payload: {},
      replyTo: "ext-1",
    });
  });

  it("mantem o prefill", () => {
    const parsed = parseClientCommand({
      command: {
        action: "open_create_activity",
        payload: { prefill: "entrevista de emprego" },
        replyTo: null,
      },
    });
    expect(parsed?.payload).toEqual({ prefill: "entrevista de emprego" });
  });

  it("le as actions de suporte e nivel", () => {
    for (const action of ["open_support", "open_level"] as const) {
      expect(
        parseClientCommand({ command: { action, payload: {}, replyTo: "x" } }),
      ).toEqual({ action, payload: {}, replyTo: "x" });
    }
  });

  it("ignora action desconhecida", () => {
    expect(
      parseClientCommand({
        command: { action: "do_something", payload: {}, replyTo: null },
      }),
    ).toBeNull();
  });

  it("ignora payload invalido", () => {
    expect(
      parseClientCommand({
        command: {
          action: "open_create_activity",
          payload: { prefill: 42 },
          replyTo: null,
        },
      }),
    ).toBeNull();
  });

  it("ignora metadata sem comando", () => {
    expect(parseClientCommand(null)).toBeNull();
    expect(parseClientCommand({ file_name: "a.pdf" })).toBeNull();
  });
});
