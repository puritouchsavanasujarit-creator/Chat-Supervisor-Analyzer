import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { AgentProfile, QAAuditRecord, QASettings, ScenarioType } from './src/types/qa.ts';
import { DEFAULT_SETTINGS, INITIAL_AGENTS } from './src/constants/qaConfig.ts';
import { INITIAL_AUDITS } from './src/data/demoData.ts';
import { analyzeChatWithGemini, generateAICoachPlan } from './server/qaEngine.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface StoreData {
  audits: QAAuditRecord[];
  agents: AgentProfile[];
  settings: QASettings;
}

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'qa-store.json');

function loadStore(): StoreData {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as StoreData;
      if (parsed && Array.isArray(parsed.audits) && Array.isArray(parsed.agents)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load store file, falling back to demo data:', err);
  }
  return {
    audits: structuredClone(INITIAL_AUDITS),
    agents: structuredClone(INITIAL_AGENTS),
    settings: structuredClone(DEFAULT_SETTINGS),
  };
}

function saveStore(store: StoreData): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not persist store to disk:', err);
  }
}

let store: StoreData = loadStore();

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  // Health & Initial State
  app.get('/api/state', (_req, res) => {
    res.json(store);
  });

  // Analyze Chat via Gemini AI
  app.post('/api/qa/analyze', async (req, res) => {
    try {
      const {
        agentId,
        agentName,
        employeeCode,
        team,
        auditDate,
        auditorName,
        scenarioInput,
        importMethod,
        transcript,
      } = req.body as {
        agentId?: string;
        agentName: string;
        employeeCode?: string;
        team?: string;
        auditDate: string;
        auditorName: string;
        scenarioInput: ScenarioType | 'auto';
        importMethod?: 'paste' | 'csv' | 'txt' | 'excel';
        transcript: string;
      };

      if (!agentName?.trim() || !transcript?.trim()) {
        res.status(400).json({ error: 'กรุณาระบุชื่อพนักงานและบทสนทนาที่ต้องการตรวจสอบ' });
        return;
      }

      const result = await analyzeChatWithGemini({
        agentName: agentName.trim(),
        employeeCode: employeeCode?.trim() ?? '',
        auditDate: auditDate || new Date().toISOString().slice(0, 10),
        auditorName: auditorName || store.settings.defaultAuditorName,
        scenarioInput: scenarioInput || 'auto',
        transcript: transcript.trim(),
        criteriaWeights: store.settings.criteriaWeights,
      });

      const matchedAgent =
        store.agents.find((a) => a.id === agentId || a.name === agentName.trim()) ?? null;

      const record: QAAuditRecord = {
        id: `AUD-${new Date().getFullYear()}-${String(store.audits.length + 1).padStart(3, '0')}`,
        agentId: matchedAgent?.id ?? `custom-${Date.now()}`,
        agentName: agentName.trim(),
        employeeCode: employeeCode?.trim() || matchedAgent?.employeeCode || '-',
        team: team?.trim() || matchedAgent?.team || 'ทีม Customer Service',
        auditDate: auditDate || new Date().toISOString().slice(0, 10),
        auditorName: auditorName || store.settings.defaultAuditorName,
        scenarioInput: scenarioInput || 'auto',
        detectedScenario: result.detectedScenario,
        importMethod: importMethod || 'paste',
        rawTranscript: transcript.trim(),
        analysis: result.analysis,
        createdAt: new Date().toISOString(),
      };

      store.audits.unshift(record);
      saveStore(store);

      res.json({ record });
    } catch (error) {
      console.error('Error in /api/qa/analyze:', error);
      const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการวิเคราะห์บทสนทนา';
      res.status(500).json({ error: message });
    }
  });

  // Generate AI Coach Plan for Trainers
  app.post('/api/qa/coach', async (req, res) => {
    try {
      const { agentName, team, avgPercentage, weaknesses, frequentProblems, focusTopic } =
        req.body as {
          agentName: string;
          team: string;
          avgPercentage: number;
          weaknesses: string[];
          frequentProblems: string[];
          focusTopic?: string;
        };

      if (!agentName?.trim()) {
        res.status(400).json({ error: 'กรุณาเลือกพนักงานที่ต้องการสร้างแผน Coaching' });
        return;
      }

      const plan = await generateAICoachPlan({
        agentName,
        team,
        avgPercentage: Number(avgPercentage) || 0,
        weaknesses: Array.isArray(weaknesses) ? weaknesses : [],
        frequentProblems: Array.isArray(frequentProblems) ? frequentProblems : [],
        focusTopic,
      });

      res.json({ plan });
    } catch (error) {
      console.error('Error in /api/qa/coach:', error);
      const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการสร้างแผน AI Coach';
      res.status(500).json({ error: message });
    }
  });

  // Delete an audit record
  app.delete('/api/audits/:id', (req, res) => {
    const { id } = req.params;
    store.audits = store.audits.filter((a) => a.id !== id);
    saveStore(store);
    res.json({ ok: true });
  });

  // Update agent coaching status & note
  app.patch('/api/agents/:id', (req, res) => {
    const { id } = req.params;
    const { coachingStatus, trainerNote, team, role } = req.body as Partial<AgentProfile>;
    const idx = store.agents.findIndex((a) => a.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'ไม่พบข้อมูลพนักงาน' });
      return;
    }
    store.agents[idx] = {
      ...store.agents[idx],
      ...(coachingStatus ? { coachingStatus } : {}),
      ...(trainerNote !== undefined ? { trainerNote } : {}),
      ...(team ? { team } : {}),
      ...(role ? { role } : {}),
    };
    saveStore(store);
    res.json({ agent: store.agents[idx] });
  });

  // Add new agent
  app.post('/api/agents', (req, res) => {
    const { name, employeeCode, team, role } = req.body as Partial<AgentProfile>;
    if (!name?.trim()) {
      res.status(400).json({ error: 'กรุณาระบุชื่อพนักงาน' });
      return;
    }
    const newAgent: AgentProfile = {
      id: `agent-${Date.now()}`,
      name: name.trim(),
      employeeCode: employeeCode?.trim() || `CS-${store.agents.length + 101}`,
      team: team?.trim() || 'ทีม Inbound & Sales',
      role: role?.trim() || 'Chat Agent',
      coachingStatus: 'รอดำเนินการ',
      trainerNote: '',
    };
    store.agents.push(newAgent);
    saveStore(store);
    res.json({ agent: newAgent });
  });

  // Update Settings
  app.put('/api/settings', (req, res) => {
    const nextSettings = req.body as QASettings;
    store.settings = {
      ...store.settings,
      ...nextSettings,
    };
    saveStore(store);
    res.json({ settings: store.settings });
  });

  // Reset Demo Data
  app.post('/api/reset', (_req, res) => {
    store = {
      audits: structuredClone(INITIAL_AUDITS),
      agents: structuredClone(INITIAL_AGENTS),
      settings: structuredClone(DEFAULT_SETTINGS),
    };
    saveStore(store);
    res.json(store);
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
