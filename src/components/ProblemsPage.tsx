import React, { useMemo, useState } from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import type { QAAuditRecord, QASettings, SeverityLevel } from '../types/qa.ts';
import { SCENARIO_CONFIGS } from '../constants/qaConfig.ts';
import { computeDashboardStats } from '../utils/qaAnalytics.ts';

export const ProblemsPage: React.FC<{
  audits: QAAuditRecord[];
  settings: QASettings;
  onSelectReport: (auditId: string) => void;
}> = ({ audits, settings, onSelectReport }) => {
  const [severityFilter, setSeverityFilter] = useState<SeverityLevel | 'all'>('all');
  const [criterionFilter, setCriterionFilter] = useState<string>('all');

  const stats = useMemo(
    () => computeDashboardStats(audits, [], settings.passThresholdPercent),
    [audits, settings.passThresholdPercent]
  );

  const allProblems = useMemo(() => {
    const list: Array<{
      auditId: string;
      agentName: string;
      auditDate: string;
      scenarioLabel: string;
      title: string;
      category: string;
      severity: SeverityLevel;
      evidenceQuote: string;
      impact: string;
      relatedCriterion: string;
    }> = [];

    for (const a of audits) {
      for (const p of a.analysis.problemDetection) {
        list.push({
          auditId: a.id,
          agentName: a.agentName,
          auditDate: a.auditDate,
          scenarioLabel: a.analysis.scenarioAnalysis.scenarioLabel,
          title: p.title,
          category: p.category,
          severity: p.severity,
          evidenceQuote: p.evidenceQuote,
          impact: p.impact,
          relatedCriterion: p.relatedCriterion,
        });
      }
    }
    return list;
  }, [audits]);

  const criteriaOptions = useMemo(
    () => Array.from(new Set(allProblems.map((p) => p.relatedCriterion))),
    [allProblems]
  );

  const filteredProblems = useMemo(() => {
    return allProblems.filter((p) => {
      const matchSev = severityFilter === 'all' || p.severity === severityFilter;
      const matchCrit = criterionFilter === 'all' || p.relatedCriterion === criterionFilter;
      return matchSev && matchCrit;
    });
  }, [allProblems, severityFilter, criterionFilter]);

  const severityCounts = useMemo(() => {
    return {
      Critical: allProblems.filter((p) => p.severity === 'Critical').length,
      High: allProblems.filter((p) => p.severity === 'High').length,
      Medium: allProblems.filter((p) => p.severity === 'Medium').length,
      Low: allProblems.filter((p) => p.severity === 'Low').length,
    };
  }, [allProblems]);

  return (
    <div className="space-y-6">
      {/* Severity Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-semibold text-rose-700">Critical · วิกฤต</div>
          <div className="mt-1 text-3xl font-bold font-mono tabular-nums text-slate-900">
            {severityCounts.Critical}
          </div>
          <div className="mt-1 text-xs text-slate-500">ต้องแก้ไขเร่งด่วนทันที</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-semibold text-orange-700">High · สูง</div>
          <div className="mt-1 text-3xl font-bold font-mono tabular-nums text-slate-900">
            {severityCounts.High}
          </div>
          <div className="mt-1 text-xs text-slate-500">กระทบความถูกต้องและออเดอร์</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-semibold text-amber-700">Medium · ปานกลาง</div>
          <div className="mt-1 text-3xl font-bold font-mono tabular-nums text-slate-900">
            {severityCounts.Medium}
          </div>
          <div className="mt-1 text-xs text-slate-500">ควรจัด Coaching ประจำสัปดาห์</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-semibold text-slate-600">Low · ต่ำ</div>
          <div className="mt-1 text-3xl font-bold font-mono tabular-nums text-slate-900">
            {severityCounts.Low}
          </div>
          <div className="mt-1 text-xs text-slate-500">ปรับปรุงด้านภาษาและความกระชับ</div>
        </div>
      </div>

      {/* 5 Chat Scenarios & Specific Skills Matrix */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">วิเคราะห์คุณภาพและทักษะเฉพาะตาม 5 สถานการณ์แชท</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            วัดความสามารถเฉพาะด้านของแต่ละสถานการณ์เพื่อกำหนดหัวข้ออบรมทีม
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                <th className="py-2.5 pr-4">ประเภทสถานการณ์</th>
                <th className="py-2.5 px-3">ทักษะเฉพาะที่วัด</th>
                <th className="py-2.5 px-3 text-right">จำนวนเคส</th>
                <th className="py-2.5 px-3 text-right">คะแนนเฉลี่ย</th>
                <th className="py-2.5 pl-3">จุดตรวจสอบสำคัญ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {SCENARIO_CONFIGS.map((cfg) => {
                const stat = stats.scenarioBreakdown.find((s) => s.scenario === cfg.id);
                return (
                  <tr key={cfg.id} className="hover:bg-slate-50">
                    <td className="py-3 pr-4 font-semibold text-slate-900">{cfg.label}</td>
                    <td className="py-3 px-3 text-xs font-medium text-violet-700">{cfg.specificSkill}</td>
                    <td className="py-3 px-3 text-right font-mono text-xs tabular-nums text-slate-700">
                      {stat?.count ?? 0}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs font-bold tabular-nums text-slate-900">
                      {(stat?.count ?? 0) > 0 ? `${stat?.avgPercentage}%` : '-'}
                    </td>
                    <td className="py-3 pl-3 text-xs text-slate-600">{cfg.keyCheckpoints[0]}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Problem Log with Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">รายการปัญหาที่ตรวจพบทั้งหมด ({filteredProblems.length})</h2>
            <p className="text-xs text-slate-500 mt-0.5">อ้างอิงข้อความจริงจากบทสนทนาและเกณฑ์ QA ที่เกี่ยวข้อง</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as SeverityLevel | 'all')}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700"
            >
              <option value="all">ทุกระดับความรุนแรง</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <select
              value={criterionFilter}
              onChange={(e) => setCriterionFilter(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700"
            >
              <option value="all">ทุกเกณฑ์ QA</option>
              {criteriaOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredProblems.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">
            <AlertTriangle className="w-6 h-6 text-slate-400 mx-auto mb-2" />
            ไม่พบรายการปัญหาตามเงื่อนไขที่เลือก
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredProblems.map((p, i) => (
              <div key={`${p.auditId}-${i}`} className="py-4 first:pt-0 last:pb-0 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                    <span className="font-semibold text-sm text-slate-900">{p.title}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
                    <span className="font-semibold text-slate-800">{p.severity}</span>
                    <span aria-hidden="true">·</span>
                    <span>{p.relatedCriterion}</span>
                    <span aria-hidden="true">·</span>
                    <button
                      type="button"
                      onClick={() => onSelectReport(p.auditId)}
                      className="font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      เปิดรายงาน {p.auditId}
                    </button>
                  </div>
                </div>

                <div className="text-xs text-slate-600 flex flex-wrap items-center gap-2">
                  <span>พนักงาน: <strong className="text-slate-800">{p.agentName}</strong></span>
                  <span aria-hidden="true">·</span>
                  <span>สถานการณ์: {p.scenarioLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{p.auditDate}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800">
                    <span className="font-semibold text-slate-500 block mb-0.5">หลักฐานข้อความ:</span>
                    “{p.evidenceQuote}”
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
                    <span className="font-semibold text-slate-500 block mb-0.5">ผลกระทบที่อาจเกิดขึ้น:</span>
                    {p.impact}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
