import type { AgentProfile, QAAuditRecord, QASettings, ScenarioType } from '../src/types/qa.ts';
import { analyzeChatWithClaude, generateAICoachPlan } from './qaEngine.ts';
import { demoStore, type StateStore } from './store.ts';

export interface ApiRequest {
  method: string;
  pathname: string;
  body: Record<string, unknown>;
  store: StateStore;
}

export interface ApiResponse {
  status: number;
  body: unknown;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Single implementation of the HTTP API, shared by the Express dev server
 * (server.ts) and the Cloudflare Worker (worker/index.ts).
 * Returns null when the path is not an API route.
 */
export async function handleApiRequest(request: ApiRequest): Promise<ApiResponse | null> {
  const { method, pathname, body, store } = request;

  if (pathname === '/api/state' && method === 'GET') {
    return { status: 200, body: await store.load() };
  }

  if (pathname === '/api/qa/analyze' && method === 'POST') {
    try {
      const state = await store.load();
      const agentName = asString(body.agentName);
      const transcript = asString(body.transcript);
      if (!agentName || !transcript) {
        return { status: 400, body: { error: 'กรุณาระบุชื่อพนักงานและบทสนทนาที่ต้องการตรวจสอบ' } };
      }

      const employeeCode = asString(body.employeeCode);
      const auditDate = asString(body.auditDate, today());
      const auditorName = asString(body.auditorName, state.settings.defaultAuditorName);
      const scenarioInput = (asString(body.scenarioInput, 'auto') as ScenarioType | 'auto') || 'auto';

      const result = await analyzeChatWithClaude({
        agentName,
        employeeCode,
        auditDate,
        auditorName,
        scenarioInput,
        transcript,
        criteriaWeights: state.settings.criteriaWeights,
      });

      const matchedAgent =
        state.agents.find((a) => a.id === body.agentId || a.name === agentName) ?? null;

      const record: QAAuditRecord = {
        id: `AUD-${new Date().getFullYear()}-${String(state.audits.length + 1).padStart(3, '0')}`,
        agentId: matchedAgent?.id ?? `custom-${Date.now()}`,
        agentName,
        employeeCode: employeeCode || matchedAgent?.employeeCode || '-',
        team: asString(body.team) || matchedAgent?.team || 'ทีม Customer Service',
        auditDate,
        auditorName,
        scenarioInput,
        detectedScenario: result.detectedScenario,
        importMethod: (asString(body.importMethod, 'paste') as QAAuditRecord['importMethod']) || 'paste',
        rawTranscript: transcript,
        analysis: result.analysis,
        createdAt: new Date().toISOString(),
      };

      state.audits.unshift(record);
      await store.save(state);
      return { status: 200, body: { record } };
    } catch (error) {
      console.error('Error in /api/qa/analyze:', error);
      return {
        status: 500,
        body: { error: errorMessage(error, 'เกิดข้อผิดพลาดในการวิเคราะห์บทสนทนา') },
      };
    }
  }

  if (pathname === '/api/qa/coach' && method === 'POST') {
    try {
      const agentName = asString(body.agentName);
      if (!agentName) {
        return { status: 400, body: { error: 'กรุณาเลือกพนักงานที่ต้องการสร้างแผน Coaching' } };
      }

      const plan = await generateAICoachPlan({
        agentName,
        team: asString(body.team, 'ทีม Customer Service'),
        avgPercentage: Number(body.avgPercentage) || 0,
        weaknesses: asStringArray(body.weaknesses),
        frequentProblems: asStringArray(body.frequentProblems),
        focusTopic: asString(body.focusTopic) || undefined,
      });

      return { status: 200, body: { plan } };
    } catch (error) {
      console.error('Error in /api/qa/coach:', error);
      return {
        status: 500,
        body: { error: errorMessage(error, 'เกิดข้อผิดพลาดในการสร้างแผน AI Coach') },
      };
    }
  }

  if (pathname.startsWith('/api/audits/') && method === 'DELETE') {
    const id = decodeURIComponent(pathname.slice('/api/audits/'.length));
    const state = await store.load();
    state.audits = state.audits.filter((audit) => audit.id !== id);
    await store.save(state);
    return { status: 200, body: { ok: true } };
  }

  if (pathname.startsWith('/api/agents/') && method === 'PATCH') {
    const id = decodeURIComponent(pathname.slice('/api/agents/'.length));
    const state = await store.load();
    const index = state.agents.findIndex((agent) => agent.id === id);
    if (index === -1) {
      return { status: 404, body: { error: 'ไม่พบข้อมูลพนักงาน' } };
    }

    const current = state.agents[index];
    state.agents[index] = {
      ...current,
      ...(body.coachingStatus
        ? { coachingStatus: body.coachingStatus as AgentProfile['coachingStatus'] }
        : {}),
      ...(body.trainerNote !== undefined ? { trainerNote: String(body.trainerNote) } : {}),
      ...(asString(body.team) ? { team: asString(body.team) } : {}),
      ...(asString(body.role) ? { role: asString(body.role) } : {}),
    };
    await store.save(state);
    return { status: 200, body: { agent: state.agents[index] } };
  }

  if (pathname === '/api/agents' && method === 'POST') {
    const name = asString(body.name);
    if (!name) {
      return { status: 400, body: { error: 'กรุณาระบุชื่อพนักงาน' } };
    }

    const state = await store.load();
    const newAgent: AgentProfile = {
      id: `agent-${Date.now()}`,
      name,
      employeeCode: asString(body.employeeCode) || `CS-${state.agents.length + 101}`,
      team: asString(body.team) || 'ทีม Inbound & Sales',
      role: asString(body.role) || 'Chat Agent',
      coachingStatus: 'รอดำเนินการ',
      trainerNote: '',
    };
    state.agents.push(newAgent);
    await store.save(state);
    return { status: 200, body: { agent: newAgent } };
  }

  if (pathname === '/api/settings' && method === 'PUT') {
    const state = await store.load();
    state.settings = { ...state.settings, ...(body as Partial<QASettings>) };
    await store.save(state);
    return { status: 200, body: { settings: state.settings } };
  }

  if (pathname === '/api/reset' && method === 'POST') {
    const reset = demoStore();
    await store.save(reset);
    return { status: 200, body: reset };
  }

  return null;
}
