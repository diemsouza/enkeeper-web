import { describe, expect, it } from "vitest";
import {
  audioExtensionForMime,
  baseMimeType,
  isAcceptedVoiceNote,
  isInaudibleTranscription,
} from "./voice-note";

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
