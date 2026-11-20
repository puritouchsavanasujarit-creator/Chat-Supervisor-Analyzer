import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { handleApiRequest } from './server/api.ts';
import { normalizeStore, type StateStore, type StoreData } from './server/store.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'qa-store.json');

function readStoreFile(): StoreData {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return normalizeStore(JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')));
    }
  } catch (err) {
    console.warn('Failed to load store file, falling back to demo data:', err);
  }
  return normalizeStore(null);
}

function writeStoreFile(store: StoreData): void {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not persist store to disk:', err);
  }
}

let cachedStore: StoreData | null = null;

const fileStore: StateStore = {
  async load() {
    if (!cachedStore) cachedStore = readStoreFile();
    return cachedStore;
  },
  async save(store) {
    cachedStore = store;
    writeStoreFile(store);
  },
};

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  // Single API implementation shared with the Cloudflare Worker (server/api.ts).
  app.all('/api/*', async (req, res) => {
    try {
      const result = await handleApiRequest({
        method: req.method.toUpperCase(),
        pathname: new URL(req.originalUrl, 'http://localhost').pathname,
        body: (req.body ?? {}) as Record<string, unknown>,
        store: fileStore,
      });

      if (!result) {
        res.status(404).json({ error: 'ไม่พบ API ที่ร้องขอ' });
        return;
      }
      res.status(result.status).json(result.body);
    } catch (error) {
      console.error('Unhandled API error:', error);
      const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในระบบ';
      res.status(500).json({ error: message });
    }
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT || 3000);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Chat QA Analyzer server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
