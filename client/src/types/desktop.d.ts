export {};

declare global {
  interface Window {
    pegasus?: {
      desktop?: boolean;
      platform?: string;
    };
  }
}

