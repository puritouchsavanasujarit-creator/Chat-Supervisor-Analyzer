import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  ClipboardCheck,
  Download,
  FileSearch,
  GraduationCap,
  History,
  Menu,
  MessageSquarePlus,
  Settings,
  Users,
  X,
} from 'lucide-react';
import type { AgentProfile, PageId, QAAuditRecord, QASettings } from './types/qa.ts';
import { DEFAULT_SETTINGS, INITIAL_AGENTS } from './constants/qaConfig.ts';
import { INITIAL_AUDITS } from './data/demoData.ts';
import { exportAuditsToCsv } from './utils/exportUtils.ts';
import { DashboardPage } from './components/DashboardPage.tsx';
import { ChatAuditPage } from './components/ChatAuditPage.tsx';
import { ReportsPage } from './components/ReportsPage.tsx';
import { AgentsPage } from './components/AgentsPage.tsx';
import { ProblemsPage } from './components/ProblemsPage.tsx';
import { CoachingPage } from './components/CoachingPage.tsx';
import { HistoryPage } from './components/HistoryPage.tsx';
import { SettingsPage } from './components/SettingsPage.tsx';

interface NavItem {
  id: PageId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'audit', label: 'ตรวจสอบบทสนทนา', icon: MessageSquarePlus },
  { id: 'reports', label: 'รายงานผล QA', icon: FileSearch },
  { id: 'agents', label: 'วิเคราะห์พนักงาน', icon: Users },
  { id: 'problems', label: 'วิเคราะห์ปัญหาทีม', icon: AlertTriangle },
  { id: 'coaching', label: 'Coaching & Training', icon: GraduationCap },
  { id: 'history', label: 'ประวัติการตรวจ', icon: History },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function App() {
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [audits, setAudits] = useState<QAAuditRecord[]>(INITIAL_AUDITS);
  const [agents, setAgents] = useState<AgentProfile[]>(INITIAL_AGENTS);
  const [settings, setSettings] = useState<QASettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedReportId, setSelectedReportId] = useState<string | null>(
    INITIAL_AUDITS[0]?.id ?? null
  );
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(
    INITIAL_AGENTS[0]?.id ?? null
  );
  const [coachTargetAgent, setCoachTargetAgent] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/state');
        if (!res.ok) return;
        const data = (await res.json()) as {
          audits: QAAuditRecord[];
          agents: AgentProfile[];
          settings: QASettings;
        };
        if (!active) return;
        if (Array.isArray(data.audits)) setAudits(data.audits);
        if (Array.isArray(data.agents)) setAgents(data.agents);
        if (data.settings) setSettings(data.settings);
        if (data.audits?.[0]) setSelectedReportId(data.audits[0].id);
      } catch (err) {
        console.warn('Could not fetch backend state, using local demo state:', err);
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const currentNav = NAV_ITEMS.find((n) => n.id === activePage) ?? NAV_ITEMS[0];

  const handleNavigate = (page: PageId) => {
    setActivePage(page);
    setMobileMenuOpen(false);
  };

  const handleOpenReport = (auditId: string) => {
    setSelectedReportId(auditId);
    handleNavigate('reports');
  };

  const handleOpenAgent = (agentId: string) => {
    setSelectedAgentId(agentId);
    handleNavigate('agents');
  };

  const handleOpenCoaching = (agentName: string) => {
    setCoachTargetAgent(agentName);
    handleNavigate('coaching');
  };

  const handleAuditCompleted = (record: QAAuditRecord) => {
    setAudits((prev) => [record, ...prev]);
    setSelectedReportId(record.id);
  };

  const handleDeleteAudit = async (id: string) => {
    await fetch(`/api/audits/${id}`, { method: 'DELETE' });
    setAudits((prev) => prev.filter((a) => a.id !== id));
  };

  const handleUpdateAgent = async (id: string, patch: Partial<AgentProfile>) => {
    const res = await fetch(`/api/agents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const data = (await res.json()) as { agent: AgentProfile };
      setAgents((prev) => prev.map((a) => (a.id === id ? data.agent : a)));
    }
  };

  const handleAddAgent = async (input: {
    name: string;
    employeeCode: string;
    team: string;
    role: string;
  }) => {
    const res = await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (res.ok) {
      const data = (await res.json()) as { agent: AgentProfile };
      setAgents((prev) => [...prev, data.agent]);
    }
  };

  const handleSaveSettings = async (next: QASettings) => {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    });
    if (res.ok) {
      const data = (await res.json()) as { settings: QASettings };
      setSettings(data.settings);
    }
  };

  const handleResetDemoData = async () => {
    const res = await fetch('/api/reset', { method: 'POST' });
    if (res.ok) {
      const data = (await res.json()) as {
        audits: QAAuditRecord[];
        agents: AgentProfile[];
        settings: QASettings;
      };
      setAudits(data.audits);
      setAgents(data.agents);
      setSettings(data.settings);
      setSelectedReportId(data.audits[0]?.id ?? null);
      setSelectedAgentId(data.agents[0]?.id ?? null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 bg-white border-r border-slate-200 sticky top-0 h-screen">
        <div className="h-16 px-5 flex items-center gap-2.5 border-b border-slate-200">
          <div className="w-8 h-8 rounded-lg bg-violet-700 text-white flex items-center justify-center shrink-0">
            <ClipboardCheck className="w-4 h-4" />
          </div>
          <span className="font-bold text-base tracking-tight text-slate-900 whitespace-nowrap">
            Chat QA Analyzer
          </span>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="เมนูหลัก">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                  active
                    ? 'bg-violet-50 text-violet-800 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${active ? 'text-violet-700' : 'text-slate-400'}`}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 text-xs text-slate-500">
          <div className="font-medium text-slate-700 truncate">{settings.defaultAuditorName}</div>
          <div className="mt-0.5 tabular-nums">
            พนักงาน {agents.length} คน · แชทที่ตรวจ {audits.length} เคส
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-64 max-w-[80vw] bg-white h-full border-r border-slate-200 flex flex-col z-10">
            <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200">
              <span className="font-bold text-base text-slate-900">Chat QA Analyzer</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-500 hover:text-slate-900"
                aria-label="ปิดเมนู"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left ${
                      active
                        ? 'bg-violet-50 text-violet-800 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg"
              aria-label="เปิดเมนูนำทาง"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-400 hidden sm:inline whitespace-nowrap">
                Chat QA Analyzer
              </span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <h1 className="font-bold text-slate-900 truncate">{currentNav.label}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => exportAuditsToCsv(audits, 'chat-qa-all-reports.csv')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('audit')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-violet-700 rounded-lg hover:bg-violet-800 transition-colors whitespace-nowrap shrink-0"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              ตรวจแชทใหม่
            </button>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {isLoading ? (
            <div className="space-y-4 animate-pulse">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-28 bg-white border border-slate-200 rounded-xl" />
                ))}
              </div>
              <div className="h-72 bg-white border border-slate-200 rounded-xl" />
            </div>
          ) : (
            <>
              {activePage === 'dashboard' && (
                <DashboardPage
                  audits={audits}
                  agents={agents}
                  settings={settings}
                  onStartAudit={() => handleNavigate('audit')}
                  onSelectAgent={handleOpenAgent}
                  onSelectReport={handleOpenReport}
                />
              )}
              {activePage === 'audit' && (
                <ChatAuditPage
                  agents={agents}
                  settings={settings}
                  onAuditCompleted={handleAuditCompleted}
                  onGoToCoaching={handleOpenCoaching}
                />
              )}
              {activePage === 'reports' && (
                <ReportsPage
                  audits={audits}
                  selectedAuditId={selectedReportId}
                  onSelectAuditId={setSelectedReportId}
                  onGoToCoaching={handleOpenCoaching}
                  onStartAudit={() => handleNavigate('audit')}
                />
              )}
              {activePage === 'agents' && (
                <AgentsPage
                  agents={agents}
                  audits={audits}
                  settings={settings}
                  selectedAgentId={selectedAgentId}
                  onSelectAgentId={setSelectedAgentId}
                  onUpdateAgent={handleUpdateAgent}
                  onSelectReport={handleOpenReport}
                  onGoToCoaching={handleOpenCoaching}
                />
              )}
              {activePage === 'problems' && (
                <ProblemsPage
                  audits={audits}
                  settings={settings}
                  onSelectReport={handleOpenReport}
                />
              )}
              {activePage === 'coaching' && (
                <CoachingPage
                  agents={agents}
                  audits={audits}
                  settings={settings}
                  preselectedAgentName={coachTargetAgent}
                />
              )}
              {activePage === 'history' && (
                <HistoryPage
                  audits={audits}
                  onSelectReport={handleOpenReport}
                  onDeleteAudit={handleDeleteAudit}
                />
              )}
              {activePage === 'settings' && (
                <SettingsPage
                  settings={settings}
                  agents={agents}
                  onSaveSettings={handleSaveSettings}
                  onAddAgent={handleAddAgent}
                  onResetDemoData={handleResetDemoData}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
