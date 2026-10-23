import { describe, expect, it } from "vitest";
import {
  audioExtensionForMime,
  baseMimeType,
  isAcceptedVoiceNote,
  isInaudibleTranscription,
  normalizeVoiceCommandText,
} from "./voice-note";
import { resolveCommand } from "../lib/commands";

describe("audioExtensionForMime", () => {
  it("mapeia AAC em MP4 para m4a", () => {
    expect(audioExtensionForMime("audio/mp4")).toBe("m4a");
    expect(audioExtensionForMime("audio/x-m4a")).toBe("m4a");
  });

  it("ignora parametros de codec", () => {
    expect(audioExtensionForMime("audio/ogg; codecs=opus")).toBe("ogg");
    expect(audioExtensionForMime("audio/webm;codecs=opus")).toBe("webm");
  });

  it("cai no subtipo quando nao conhece o MIME", () => {
    expect(audioExtensionForMime("audio/wav")).toBe("wav");
  });
});

describe("baseMimeType", () => {
  it("tira parametros e normaliza caixa", () => {
    expect(baseMimeType("Audio/OGG; codecs=opus")).toBe("audio/ogg");
  });
});

describe("isInaudibleTranscription", () => {
  it("vazia ou so pontuacao e inaudivel", () => {
    expect(isInaudibleTranscription("")).toBe(true);
    expect(isInaudibleTranscription("  ...  ")).toBe(true);
    expect(isInaudibleTranscription("♪ ♪")).toBe(true);
  });

  it("qualquer letra conta como resposta", () => {
    expect(isInaudibleTranscription("I")).toBe(false);
    expect(isInaudibleTranscription("é")).toBe(false);
  });
});

describe("isAcceptedVoiceNote", () => {
  it("aceita Ogg e MP4 dentro do limite", () => {
    expect(isAcceptedVoiceNote("audio/ogg;codecs=opus", 50_000)).toBe(true);
    expect(isAcceptedVoiceNote("audio/mp4", 200_000)).toBe(true);
  });

  it("recusa WebM, arquivo vazio e acima do limite", () => {
    expect(isAcceptedVoiceNote("audio/webm", 50_000)).toBe(false);
    expect(isAcceptedVoiceNote("audio/ogg", 0)).toBe(false);
    expect(isAcceptedVoiceNote("audio/ogg", 5 * 1024 * 1024)).toBe(false);
  });
});

describe("normalizeVoiceCommandText", () => {
  it("tira pontuacao das pontas e deixa minusculo", () => {
    expect(normalizeVoiceCommandText("Menu.")).toBe("menu");
    expect(normalizeVoiceCommandText("  Pausar 2!  ")).toBe("pausar 2");
    expect(normalizeVoiceCommandText("¿Ajuda?")).toBe("ajuda");
  });

  it("preserva pontuacao do meio", () => {
    expect(normalizeVoiceCommandText("I'm fine.")).toBe("i'm fine");
  });

  it("transcricao normalizada resolve o mesmo comando do digitado", () => {
    expect(resolveCommand(normalizeVoiceCommandText("Menu."))).toBe("help");
    expect(resolveCommand(normalizeVoiceCommandText("Praticar!"))).toBe(
      "practice_now",
    );
    expect(resolveCommand("Menu.")).toBeNull();
  });
});
