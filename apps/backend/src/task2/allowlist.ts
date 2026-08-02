import allowlistData from './allowlist.json' with { type: 'json' };

export interface AllowlistEntry {
  source: string;
  sourceStatus: string;
  isCollected: boolean;
}

export const allowlist: readonly AllowlistEntry[] = allowlistData as AllowlistEntry[];
