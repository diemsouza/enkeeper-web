export type OutMessage =
  | string
  | { delay: number }
  | { audioPath: string };
