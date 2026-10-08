import { canPracticeToday } from "./limits";

export type PracticePillState = {
  isVisible: boolean;
  intensiveUntil: string | null;
  isLimitReached: boolean;
};

export function resolvePracticePillState(input: {
  hasActiveActivity: boolean;
  intensiveUntil: Date | null;
  practiceCount: number;
  intensiveCount: number;
}): PracticePillState {
  return {
    isVisible: input.hasActiveActivity,
    intensiveUntil: input.intensiveUntil?.toISOString() ?? null,
    isLimitReached: !canPracticeToday(
      input.practiceCount,
      input.intensiveCount,
      true,
    ),
  };
}

export function isPracticePillActive(
  state: PracticePillState,
  now: number,
): boolean {
  if (state.isLimitReached) return false;
  if (!state.intensiveUntil) return true;
  return new Date(state.intensiveUntil).getTime() <= now;
}
