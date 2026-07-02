import { EventEmitter } from "events";

// globalThis garante que o mesmo Map é compartilhado entre os bundles de route handlers do Next.js
const g = globalThis as typeof globalThis & {
  __simulatorEmitters?: Map<string, EventEmitter>;
};
if (!g.__simulatorEmitters) {
  g.__simulatorEmitters = new Map<string, EventEmitter>();
}

export function getEmitter(channelId: string): EventEmitter {
  if (!g.__simulatorEmitters!.has(channelId)) {
    g.__simulatorEmitters!.set(channelId, new EventEmitter());
  }
  return g.__simulatorEmitters!.get(channelId)!;
}

export function emitToSession(channelId: string, data: object): void {
  getEmitter(channelId).emit("message", data);
}
