import { Level } from "../lib/prisma";

export type TtsPace = "slow" | "normal";

export function getTtsPace(level: Level): TtsPace {
  return level === Level.basic ? "slow" : "normal";
}
