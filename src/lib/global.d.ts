export {};

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: Record<string, unknown>[];
  }
}
