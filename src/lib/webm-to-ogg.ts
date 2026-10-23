import {
  BlobSource,
  BufferTarget,
  EncodedAudioPacketSource,
  EncodedPacketSink,
  Input,
  OggOutputFormat,
  Output,
  WEBM,
} from "mediabunny";

// Troca so o container: os pacotes Opus saem do WebM e entram no Ogg sem
// decodificar nem recodificar. Copia manual em vez da API de conversao, que
// carregaria toda a parte de transcode no bundle.
export async function remuxWebmToOgg(blob: Blob): Promise<Blob> {
  const input = new Input({ source: new BlobSource(blob), formats: [WEBM] });
  const track = await input.getPrimaryAudioTrack();
  if (!track || (await track.getCodec()) !== "opus") {
    throw new Error("remux: no opus track");
  }
  const decoderConfig = await track.getDecoderConfig();
  if (!decoderConfig) throw new Error("remux: no decoder config");

  const target = new BufferTarget();
  const output = new Output({ format: new OggOutputFormat(), target });
  const source = new EncodedAudioPacketSource("opus");
  output.addAudioTrack(source);
  await output.start();
  const sink = new EncodedPacketSink(track);
  let packet = await sink.getFirstPacket();
  let isFirst = true;
  while (packet) {
    await source.add(packet, isFirst ? { decoderConfig } : undefined);
    isFirst = false;
    packet = await sink.getNextPacket(packet);
  }
  await output.finalize();
  if (!target.buffer) throw new Error("remux: no output");
  return new Blob([target.buffer], { type: "audio/ogg" });
}
