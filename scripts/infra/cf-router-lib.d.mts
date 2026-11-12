export interface RouterConfig {
  distribution: string;
  fn: string;
  site: string;
  host: string;
  bucket: string;
}

export const ENVS: Record<'dev' | 'prod', RouterConfig>;
export const DEFAULT_PROBE_SLUG: string;

export interface RouterDeps {
  envName: 'dev' | 'prod';
  cfg: RouterConfig;
  aws: (args: string[], opts?: { allowFail?: boolean }) => any;
  fetchImpl: (url: string, init?: unknown) => Promise<{ status: number; text(): Promise<string>; headers: { get(name: string): string | null } }>;
  readFile: (path: string) => string;
  writeFile: (path: string, data: string) => void;
  ensureDir: (dir: string) => void;
  tmp: (name: string, data: string) => string;
  sleep: (ms: number) => Promise<void>;
  log: (message: string) => void;
  now: () => Date;
  routerPath: string;
  backupDir: string;
  probeSlug?: string;
  postDeployWaitMs?: number;
  waitDeployed: () => void;
}

export function createRouter(deps: RouterDeps): {
  preflight(): void;
  missingObjects(): string[];
  requiredKeys(): string[];
  plan(): { ready: boolean; missing: string[] };
  apply(): Promise<{ backupFile: string }>;
  revert(backupFile: string): void;
  verify(): Promise<number>;
  saveBackup(): { file: string; dist: any };
};
