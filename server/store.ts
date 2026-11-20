import type { AgentProfile, QAAuditRecord, QASettings } from '../src/types/qa.ts';
import { DEFAULT_SETTINGS, INITIAL_AGENTS } from '../src/constants/qaConfig.ts';
import { INITIAL_AUDITS } from '../src/data/demoData.ts';

export interface StoreData {
  audits: QAAuditRecord[];
  agents: AgentProfile[];
  settings: QASettings;
}

/** Storage backend: a JSON file on Node, a D1 row on Cloudflare Workers. */
export interface StateStore {
  load(): Promise<StoreData>;
  save(store: StoreData): Promise<void>;
}

export function demoStore(): StoreData {
  return {
    audits: structuredClone(INITIAL_AUDITS),
    agents: structuredClone(INITIAL_AGENTS),
    settings: structuredClone(DEFAULT_SETTINGS),
  };
}

export function normalizeStore(value: unknown): StoreData {
  const parsed = value as Partial<StoreData> | null;
  if (parsed && Array.isArray(parsed.audits) && Array.isArray(parsed.agents) && parsed.settings) {
    return parsed as StoreData;
  }
  return demoStore();
}

/** In-memory store, used as a fallback when no persistent backend is available. */
export function createMemoryStore(): StateStore {
  let current: StoreData | null = null;
  return {
    async load() {
      if (!current) current = demoStore();
      return current;
    },
    async save(store) {
      current = store;
    },
  };
}
