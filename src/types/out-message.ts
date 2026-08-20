export type OutMessageButton = { id: string; title: string };

export type OutMessage =
  | string
  | { audioPath: string }
  | { content: string; buttons: OutMessageButton[] };
