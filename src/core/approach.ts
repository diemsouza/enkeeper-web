import { Approach, ApproachConfidence, Activity } from "@prisma/client";

export type { Approach, ApproachConfidence };

export const getEffectiveApproach = (
  a: Pick<Activity, "approach" | "approachOverride">,
): Approach => a.approachOverride ?? a.approach;
