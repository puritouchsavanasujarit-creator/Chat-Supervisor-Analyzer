import { handleApiRequest } from '../server/api.ts';
import { setGeminiConfig } from '../server/gemini.ts';
import {
  createMemoryStore,
  demoStore,
  normalizeStore,
  type StateStore,
  type StoreData,
} from '../server/store.ts';

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T>(): Promise<T | null>;
  run(): Promise<unknown>;
}

interface D1DatabaseLike {
  prepare(sql: string): D1PreparedStatement;
}

interface Env {
  ASSETS?: { fetch(request: Request): Promise<Response> };
  DB?: D1DatabaseLike;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
}

const STORE_ID = 'state';
const CREATE_TABLE_SQL =
  'CREATE TABLE IF NOT EXISTS qa_store (id TEXT PRIMARY KEY, doc TEXT NOT NULL)';

let tableReady: Promise<unknown> | null = null;
const memoryStore = createMemoryStore();

function ensureTable(db: D1DatabaseLike): Promise<unknown> {
  if (!tableReady) {
    tableReady = db.prepare(CREATE_TABLE_SQL).run();
  }
  return tableReady;
}

function createD1Store(db: D1DatabaseLike): StateStore {
  async function save(store: StoreData): Promise<void> {
    await ensureTable(db);
    await db
      .prepare(
        'INSERT INTO qa_store (id, doc) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET doc = excluded.doc'
      )
      .bind(STORE_ID, JSON.stringify(store))
      .run();
  }

  return {
    async load(): Promise<StoreData> {
      try {
        await ensureTable(db);
        const row = await db
          .prepare('SELECT doc FROM qa_store WHERE id = ?')
          .bind(STORE_ID)
          .first<{ doc: string }>();
        if (row?.doc) {
          return normalizeStore(JSON.parse(row.doc));
        }
      } catch (error) {
        console.error('Could not read store from D1, falling back to demo data:', error);
      }

      const seeded = demoStore();
      await save(seeded).catch(() => undefined);
      return seeded;
    },

    async save(store: StoreData): Promise<void> {
      try {
        await save(store);
      } catch (error) {
        console.error('Could not persist store to D1:', error);
      }
    },
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    setGeminiConfig({ apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL });

    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      const method = request.method.toUpperCase();
      const result = await handleApiRequest({
        method,
        pathname: url.pathname,
        body: method === 'GET' ? {} : await readJsonBody(request),
        store: env.DB ? createD1Store(env.DB) : memoryStore,
      });

      return result ? json(result.body, result.status) : json({ error: 'ไม่พบ API ที่ร้องขอ' }, 404);
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not found', { status: 404 });
  },
};
