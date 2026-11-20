import React, { useMemo, useState } from 'react';
import { Check, Search, Sparkles } from 'lucide-react';
import type { AgentProfile, CoachingStatus, QAAuditRecord, QASettings } from '../types/qa.ts';
import { computeAgentStats } from '../utils/qaAnalytics.ts';
import { CriteriaBarChart } from './Charts.tsx';

export const AgentsPage: React.FC<{
  agents: AgentProfile[];
  audits: QAAuditRecord[];
  settings: QASettings;
  selectedAgentId: string | null;
  onSelectAgentId: (id: string) => void;
  onUpdateAgent: (id: string, patch: Partial<AgentProfile>) => Promise<void>;
  onSelectReport: (auditId: string) => void;
  onGoToCoaching: (agentName: string) => void;
}> = ({
  agents,
  audits,
  settings,
  selectedAgentId,
  onSelectAgentId,
  onUpdateAgent,
  onSelectReport,
  onGoToCoaching,
}) => {
  const [query, setQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<CoachingStatus | 'all'>('all');
  const [noteDraft, setNoteDraft] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  const teams = useMemo(() => Array.from(new Set(agents.map((a) => a.team))), [agents]);

  const agentStatsList = useMemo(() => {
    return agents
      .map((a) => computeAgentStats(a, audits, settings.passThresholdPercent))
      .filter((item) => {
        const q = query.trim().toLowerCase();
        const matchQ =
          !q ||
          item.agent.name.toLowerCase().includes(q) ||
          item.agent.employeeCode.toLowerCase().includes(q);
        const matchTeam = teamFilter === 'all' || item.agent.team === teamFilter;
        const matchStatus = statusFilter === 'all' || item.agent.coachingStatus === statusFilter;
        return matchQ && matchTeam && matchStatus;
      });
  }, [agents, audits, settings.passThresholdPercent, query, teamFilter, statusFilter]);

  const activeStats =
    agentStatsList.find((s) => s.agent.id === selectedAgentId) ??
    agents
      .map((a) => computeAgentStats(a, audits, settings.passThresholdPercent))
      .find((s) => s.agent.id === selectedAgentId) ??
    agentStatsList[0] ??
    null;

  const activeAudits = useMemo(() => {
    if (!activeStats) return [];
    return audits
      .filter((a) => a.agentId === activeStats.agent.id || a.agentName === activeStats.agent.name)
      .sort((a, b) => b.auditDate.localeCompare(a.auditDate));
  }, [audits, activeStats]);

  const handleSaveCoaching = async (status: CoachingStatus, note: string) => {
    if (!activeStats) return;
    await onUpdateAgent(activeStats.agent.id, {
      coachingStatus: status,
      trainerNote: note,
    });
    setNoteDraft(null);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* Left Agent Directory */}
      <div className="xl:col-span-4 bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">รายชื่อพนักงาน ({agentStatsList.length})</h2>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาชื่อหรือรหัสพนักงาน..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700"
          >
            <option value="all">ทุกทีม</option>
            {teams.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as CoachingStatus | 'all')}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700"
          >
            <option value="all">ทุกสถานะ Coaching</option>
            <option value="ผ่านเกณฑ์แล้ว">ผ่านเกณฑ์แล้ว</option>
            <option value="กำลัง Coaching">กำลัง Coaching</option>
            <option value="รอดำเนินการ">รอดำเนินการ</option>
          </select>
        </div>

        <div className="divide-y divide-slate-100 max-h-[640px] overflow-y-auto pr-1">
          {agentStatsList.map((s) => {
            const isActive = activeStats?.agent.id === s.agent.id;
            return (
              <button
                key={s.agent.id}
                type="button"
                onClick={() => {
                  onSelectAgentId(s.agent.id);
                  setNoteDraft(null);
                }}
                className={`w-full text-left py-3 px-2.5 rounded-lg transition-colors ${
                  isActive ? 'bg-violet-50' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm font-semibold truncate ${isActive ? 'text-violet-800' : 'text-slate-900'}`}>
                    {s.agent.name}
                  </span>
                  <span className="font-mono text-xs font-bold tabular-nums text-slate-900 shrink-0">
                    {s.auditCount > 0 ? `${s.avgPercentage}%` : '-'}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="truncate">{s.agent.team}</span>
                  <span className="tabular-nums shrink-0">{s.auditCount} แชท</span>
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500">
                  สถานะ: {s.agent.coachingStatus}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Individual Performance Detail */}
      <div className="xl:col-span-8 space-y-6">
        {activeStats ? (
          <>
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="text-xs text-slate-500 font-mono">
                    {activeStats.agent.employeeCode} · {activeStats.agent.team} · {activeStats.agent.role}
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mt-1">{activeStats.agent.name}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => onGoToCoaching(activeStats.agent.name)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-violet-700 rounded-lg hover:bg-violet-800 transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  เปิด AI Coach สำหรับพนักงานคนนี้
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-xs text-slate-500">คะแนน QA เฉลี่ย</div>
                  <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-violet-700">
                    {activeStats.auditCount > 0 ? `${activeStats.avgPercentage}%` : '-'}
                  </div>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-xs text-slate-500">จำนวนแชทที่ตรวจ</div>
                  <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900">
                    {activeStats.auditCount}
                  </div>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-xs text-slate-500">QA Pass Rate</div>
                  <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900">
                    {activeStats.auditCount > 0 ? `${activeStats.passRate}%` : '-'}
                  </div>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-xs text-slate-500">ตรวจล่าสุด</div>
                  <div className="mt-1.5 text-sm font-semibold font-mono tabular-nums text-slate-800">
                    {activeStats.latestAuditDate ?? 'ยังไม่มีข้อมูล'}
                  </div>
                </div>
              </div>

              {/* Strengths, Weaknesses, Frequent Problems */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs">
                <div className="p-4 border border-slate-200 rounded-lg space-y-2">
                  <div className="font-bold text-emerald-700 text-sm">จุดแข็ง</div>
                  {activeStats.topStrengths.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1 text-slate-700">
                      {activeStats.topStrengths.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-400">ยังไม่มีข้อมูลจากการตรวจแชท</p>
                  )}
                </div>

                <div className="p-4 border border-slate-200 rounded-lg space-y-2">
                  <div className="font-bold text-rose-700 text-sm">จุดอ่อน</div>
                  {activeStats.topWeaknesses.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1 text-slate-700">
                      {activeStats.topWeaknesses.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-400">ยังไม่มีจุดอ่อนที่บันทึกไว้</p>
                  )}
                </div>

                <div className="p-4 border border-slate-200 rounded-lg space-y-2">
                  <div className="font-bold text-amber-700 text-sm">ปัญหาที่พบบ่อย</div>
                  {activeStats.frequentProblems.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1 text-slate-700">
                      {activeStats.frequentProblems.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-500">ยังไม่พบปัญหาซ้ำจากการตรวจ</p>
                  )}
                </div>
              </div>
            </div>

            {/* 8-Criteria Performance & Coaching Status Update */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="text-base font-bold text-slate-900 mb-4">คะแนนเฉลี่ยรายเกณฑ์ของพนักงาน</h3>
                <CriteriaBarChart criteria={activeStats.criteriaAverages} />
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">แผนพัฒนา & ผลการ Coaching</h3>
                  {savedNotice && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                      <Check className="w-3.5 h-3.5" /> บันทึกแล้ว
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    สถานะ Coaching ปัจจุบัน
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['รอดำเนินการ', 'กำลัง Coaching', 'ผ่านเกณฑ์แล้ว'] as CoachingStatus[]).map((st) => {
                      const active = activeStats.agent.coachingStatus === st;
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() =>
                            handleSaveCoaching(st, noteDraft ?? activeStats.agent.trainerNote)
                          }
                          className={`px-2.5 py-2 text-xs font-medium rounded-lg border transition-colors ${
                            active
                              ? 'bg-violet-700 text-white border-violet-700'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {st}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    บันทึกผลการ Coaching / แผนพัฒนาของ Trainer
                  </label>
                  <textarea
                    rows={4}
                    value={noteDraft ?? activeStats.agent.trainerNote}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder="บันทึกผลการติดตามและแผนพัฒนาเฉพาะบุคคล..."
                    className="w-full p-3 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 leading-relaxed"
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        handleSaveCoaching(
                          activeStats.agent.coachingStatus,
                          noteDraft ?? activeStats.agent.trainerNote
                        )
                      }
                      className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      บันทึกผลการ Coaching
                    </button>
                  </div>
                </div>

                {activeAudits[0]?.analysis.coachingPlan && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                    <div className="font-semibold text-slate-800">แผน Coaching จากรายงานล่าสุด:</div>
                    <p className="text-slate-700">{activeAudits[0].analysis.coachingPlan.goal}</p>
                    <p className="text-slate-500">
                      ระยะเวลา: {activeAudits[0].analysis.coachingPlan.duration}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Score History Table */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="text-base font-bold text-slate-900 mb-4">ประวัติคะแนนการตรวจแชทของ {activeStats.agent.name}</h3>
              {activeAudits.length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">ยังไม่มีประวัติการตรวจสำหรับพนักงานคนนี้</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                        <th className="py-2 pr-3">รหัสรายงาน</th>
                        <th className="py-2 px-3">วันที่ตรวจ</th>
                        <th className="py-2 px-3">สถานการณ์</th>
                        <th className="py-2 px-3 text-right">คะแนน</th>
                        <th className="py-2 px-3">ระดับ</th>
                        <th className="py-2 pl-3 text-right">เปิดรายงาน</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeAudits.map((a) => (
                        <tr key={a.id} className="hover:bg-slate-50">
                          <td className="py-2.5 pr-3 font-mono text-xs text-slate-600">{a.id}</td>
                          <td className="py-2.5 px-3 font-mono text-xs tabular-nums text-slate-700">
                            {a.auditDate}
                          </td>
                          <td className="py-2.5 px-3 text-xs text-slate-700">
                            {a.analysis.scenarioAnalysis.scenarioLabel}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-xs font-bold tabular-nums text-slate-900">
                            {a.analysis.overall.totalScore}/{a.analysis.overall.maxEvaluableScore} ({a.analysis.overall.percentage}%)
                          </td>
                          <td className="py-2.5 px-3 text-xs font-medium text-slate-700">
                            {a.analysis.overall.qualityLevel}
                          </td>
                          <td className="py-2.5 pl-3 text-right text-xs">
                            <button
                              type="button"
                              onClick={() => onSelectReport(a.id)}
                              className="font-semibold text-indigo-600 hover:text-indigo-800"
                            >
                              ดูรายละเอียด
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-sm text-slate-500">
            เลือกพนักงานทางด้านซ้ายเพื่อดูรายงานวิเคราะห์รายบุคคล
          </div>
        )}
      </div>
    </div>
  );
};
