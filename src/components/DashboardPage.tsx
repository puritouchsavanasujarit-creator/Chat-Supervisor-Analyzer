import React, { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Search } from 'lucide-react';
import type { AgentProfile, QAAuditRecord, QASettings } from '../types/qa.ts';
import { computeAgentStats, computeDashboardStats } from '../utils/qaAnalytics.ts';
import { CriteriaBarChart, MonthlyTrendChart } from './Charts.tsx';

export const DashboardPage: React.FC<{
  audits: QAAuditRecord[];
  agents: AgentProfile[];
  settings: QASettings;
  onStartAudit: () => void;
  onSelectAgent: (agentId: string) => void;
  onSelectReport: (auditId: string) => void;
}> = ({ audits, agents, settings, onStartAudit, onSelectAgent, onSelectReport }) => {
  const [agentQuery, setAgentQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');

  const stats = useMemo(
    () => computeDashboardStats(audits, agents, settings.passThresholdPercent),
    [audits, agents, settings.passThresholdPercent]
  );

  const agentRows = useMemo(() => {
    return agents
      .map((a) => computeAgentStats(a, audits, settings.passThresholdPercent))
      .filter((row) => {
        const matchQuery =
          !agentQuery.trim() ||
          row.agent.name.toLowerCase().includes(agentQuery.trim().toLowerCase()) ||
          row.agent.employeeCode.toLowerCase().includes(agentQuery.trim().toLowerCase());
        const matchTeam = teamFilter === 'all' || row.agent.team === teamFilter;
        return matchQuery && matchTeam;
      })
      .sort((a, b) => b.avgPercentage - a.avgPercentage);
  }, [agents, audits, settings.passThresholdPercent, agentQuery, teamFilter]);

  const teams = useMemo(() => Array.from(new Set(agents.map((a) => a.team))), [agents]);

  return (
    <div className="space-y-6">
      {/* Top KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">คะแนน QA เฉลี่ยทั้งทีม</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-slate-900 font-mono tabular-nums">
              {stats.avgPercentage}%
            </span>
            <span
              className={`inline-flex items-center gap-0.5 text-xs font-semibold font-mono tabular-nums ${
                stats.improvementTrendDelta >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {stats.improvementTrendDelta >= 0 ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5" />
              )}
              {stats.improvementTrendDelta >= 0 ? '+' : ''}
              {stats.improvementTrendDelta}% เทียบเดือนก่อน
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500">Improvement Trend รายเดือน</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">QA Pass Rate (เกณฑ์ ≥ {settings.passThresholdPercent}%)</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-violet-700 font-mono tabular-nums">
              {stats.passRate}%
            </span>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              ผ่าน {audits.filter((a) => a.analysis.overall.percentage >= settings.passThresholdPercent).length} / {stats.totalAudits} เคส
            </span>
          </div>
          <div className="mt-2.5 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-600 rounded-full"
              style={{ width: `${Math.min(100, stats.passRate)}%` }}
            />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">จำนวนแชทที่ตรวจแล้ว</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-slate-900 font-mono tabular-nums">
              {stats.totalAudits}
            </span>
            <button
              type="button"
              onClick={onStartAudit}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors whitespace-nowrap"
            >
              + ตรวจบทสนทนาเพิ่ม
            </button>
          </div>
          <div className="mt-2 text-xs text-slate-500">ครอบคลุม {stats.scenarioBreakdown.filter((s) => s.count > 0).length} ประเภทสถานการณ์</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">จำนวนพนักงาน & Coaching Status</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-slate-900 font-mono tabular-nums">
              {stats.totalAgents} <span className="text-sm font-normal text-slate-500">คน</span>
            </span>
            <span className="text-xs text-slate-600 font-mono tabular-nums">
              ผ่าน {stats.coachingCounts['ผ่านเกณฑ์แล้ว']} · ฝึก {stats.coachingCounts['กำลัง Coaching']} · รอ {stats.coachingCounts['รอดำเนินการ']}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500">สถานะการพัฒนาพนักงานในทีม</div>
        </div>
      </div>

      {/* Main Analytics Row: Monthly Trend + 8-Criteria Score */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">เปรียบเทียบคะแนน QA รายเดือน</h2>
              <p className="text-xs text-slate-500 mt-0.5">แสดงแนวโน้มคะแนนเฉลี่ยและจำนวนแชทที่ตรวจในแต่ละเดือน</p>
            </div>
          </div>
          <MonthlyTrendChart data={stats.monthlyTrend} />
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
          <div className="mb-4">
            <h2 className="text-base font-bold text-slate-900">คะแนนเฉลี่ยตามเกณฑ์ QA ทั้ง 8 ข้อ</h2>
            <p className="text-xs text-slate-500 mt-0.5">คำนวณเฉพาะบทสนทนาที่มีหลักฐานเพียงพอสำหรับเกณฑ์นั้น</p>
          </div>
          <CriteriaBarChart criteria={stats.criteriaAverages} />
        </div>
      </div>

      {/* Team Score + Top 5 Problems + Coaching Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">คะแนนรายทีม</h2>
            <p className="text-xs text-slate-500 mt-0.5">เปรียบเทียบคุณภาพและอัตราผ่านเกณฑ์แยกตามทีม</p>
          </div>

          <div className="divide-y divide-slate-100">
            {stats.teamPerformance.map((t) => (
              <div key={t.team} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-900">{t.team}</span>
                  <span className="font-mono text-xs text-slate-600 tabular-nums">
                    {t.avgPercentage}% · Pass {t.passRate}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>พนักงาน {t.agentCount} คน · ตรวจแล้ว {t.auditCount} แชท</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full"
                    style={{ width: `${Math.min(100, t.avgPercentage)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 mb-2.5">Coaching Status ของทีม</h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="text-lg font-bold text-emerald-800 font-mono tabular-nums">
                  {stats.coachingCounts['ผ่านเกณฑ์แล้ว']}
                </div>
                <div className="text-[11px] font-medium text-emerald-700">ผ่านเกณฑ์แล้ว</div>
              </div>
              <div className="p-2.5 bg-violet-50 border border-violet-200 rounded-lg">
                <div className="text-lg font-bold text-violet-800 font-mono tabular-nums">
                  {stats.coachingCounts['กำลัง Coaching']}
                </div>
                <div className="text-[11px] font-medium text-violet-700">กำลัง Coaching</div>
              </div>
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="text-lg font-bold text-amber-800 font-mono tabular-nums">
                  {stats.coachingCounts['รอดำเนินการ']}
                </div>
                <div className="text-[11px] font-medium text-amber-700">รอดำเนินการ</div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
          <div className="mb-4">
            <h2 className="text-base font-bold text-slate-900">Top 5 ปัญหาที่พบบ่อยจากการตรวจแชท</h2>
            <p className="text-xs text-slate-500 mt-0.5">จัดลำดับตามความถี่และระดับความรุนแรงที่ตรวจพบจากหลักฐานจริง</p>
          </div>

          {stats.aggregatedProblems.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">ยังไม่มีปัญหาที่ตรวจพบในระบบ</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {stats.aggregatedProblems.slice(0, 5).map((p, idx) => (
                <div key={p.title} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-mono text-xs text-slate-400 tabular-nums">0{idx + 1}.</span>
                      <span className="font-semibold text-slate-900 truncate">{p.title}</span>
                    </div>
                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5">
                      <span>เกณฑ์: {p.relatedCriterion}</span>
                      <span aria-hidden="true">·</span>
                      <span>ระดับ: {p.severity}</span>
                      <span aria-hidden="true">·</span>
                      <span>พนักงานที่พบ: {p.affectedAgents.join(', ')}</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right font-mono tabular-nums">
                    <div className="text-sm font-bold text-slate-900">{p.count} เคส</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Individual Agent Score Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">คะแนนรายบุคคล (Individual QA Ranking)</h2>
            <p className="text-xs text-slate-500 mt-0.5">คลิกชื่อพนักงานเพื่อดูรายงานวิเคราะห์และแผนพัฒนาเชิงลึก</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={agentQuery}
                onChange={(e) => setAgentQuery(e.target.value)}
                placeholder="ค้นหาชื่อหรือรหัส..."
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 w-44"
              />
            </div>
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="all">ทุกทีม</option>
              {teams.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                <th className="py-2.5 pr-4">พนักงาน</th>
                <th className="py-2.5 px-3">ทีม</th>
                <th className="py-2.5 px-3 text-right">แชทที่ตรวจ</th>
                <th className="py-2.5 px-3 text-right">คะแนนเฉลี่ย</th>
                <th className="py-2.5 px-3 text-right">Pass Rate</th>
                <th className="py-2.5 px-3">สถานะ Coaching</th>
                <th className="py-2.5 pl-3 text-right">รายงานล่าสุด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {agentRows.map((row) => (
                <tr key={row.agent.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 pr-4">
                    <button
                      type="button"
                      onClick={() => onSelectAgent(row.agent.id)}
                      className="text-left group"
                    >
                      <div className="font-semibold text-slate-900 group-hover:text-violet-700 transition-colors">
                        {row.agent.name}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">{row.agent.employeeCode}</div>
                    </button>
                  </td>
                  <td className="py-2.5 px-3 text-xs text-slate-600">{row.agent.team}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-xs tabular-nums text-slate-700">
                    {row.auditCount}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums">
                    <span
                      className={
                        row.auditCount === 0
                          ? 'text-slate-400'
                          : row.avgPercentage >= settings.passThresholdPercent
                            ? 'text-emerald-700'
                            : 'text-rose-700'
                      }
                    >
                      {row.auditCount > 0 ? `${row.avgPercentage}%` : '-'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-xs tabular-nums text-slate-700">
                    {row.auditCount > 0 ? `${row.passRate}%` : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-xs font-medium text-slate-700">
                    {row.agent.coachingStatus}
                  </td>
                  <td className="py-2.5 pl-3 text-right text-xs">
                    {row.scoreHistory.length > 0 ? (
                      <button
                        type="button"
                        onClick={() =>
                          onSelectReport(row.scoreHistory[row.scoreHistory.length - 1].id)
                        }
                        className="font-medium text-indigo-600 hover:text-indigo-800 whitespace-nowrap"
                      >
                        ดูรายงานล่าสุด
                      </button>
                    ) : (
                      <span className="text-slate-400">ยังไม่มี</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
