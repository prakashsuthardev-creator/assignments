export type SyncStatus = 'success' | 'failure' | 'skipped';

export interface SyncResult {
  provider: string;
  status: SyncStatus;
  recordsSaved: number;
  message: string;
}

export interface NormalizedRecord {
  id: string;
  source: string;
  sourceId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  eventDate: string | null;
  amount: number | null;
  status: string | null;
  updatedAt: string;
  rawData: Record<string, unknown>;
}

export interface CursorState {
  provider: string;
  cursor: string;
  updatedAt: number;
}

export interface SyncStore {
  upsertRecord(record: NormalizedRecord): Promise<NormalizedRecord>;
  getCursor(provider: string): Promise<CursorState | undefined>;
  setCursor(provider: string, cursor: string, updatedAt: number): Promise<void>;
  listRecords(): Promise<NormalizedRecord[]>;
}
