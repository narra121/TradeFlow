export interface ByteTotals {
  js: number;
  css: number;
  font: number;
  fontFiles: Set<string>;
  other: number;
}

export function createByteCounter(base: string): {
  bytes: ByteTotals;
  onResponse: (res: { url(): string; body(): Promise<Buffer> }) => void;
  settled(): Promise<void>;
};
