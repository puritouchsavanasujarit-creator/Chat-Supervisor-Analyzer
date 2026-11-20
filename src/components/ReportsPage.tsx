import React, { useMemo, useState } from 'react';
import { FileText, Search } from 'lucide-react';
import type { QAAuditRecord, QualityLevel, ScenarioType } from '../types/qa.ts';
import { SCENARIO_CONFIGS, SCENARIO_MAP } from '../constants/qaConfig.ts';
import { AnalysisReportView } from './AnalysisReportView.tsx';

export const ReportsPage: React.FC<{
  audits: QAAuditRecord[];
  selectedAuditId: string | null;
  onSelectAuditId: (id: string) => void;
  onGoToCoaching: (agentName: string) => void;
  onStartAudit: () => void;
}> = ({ audits, selectedAuditId, onSelectAuditId, onGoToCoaching, onStartAudit }) => {
  const [query, setQuery] = useState('');
  const [scenarioFilter, setScenarioFilter] = useState<ScenarioType | 'all'>('all');
  const [qualityFilter, setQualityFilter] = useState<QualityLevel | 'all'>('all');

  const filtered = useMemo(() => {
    return audits.filter((a) => {
      const q = query.trim().toLowerCase();
      const matchQ =
        !q ||
        a.agentName.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q) ||
        a.employeeCode.toLowerCase().includes(q);
      const matchScenario = scenarioFilter === 'all' || a.detectedScenario === scenarioFilter;
      const matchQuality = qualityFilter === 'all' || a.analysis.overall.qualityLevel === qualityFilter;
      return matchQ && matchScenario && matchQuality;
    });
  }, [audits, query, scenarioFilter, qualityFilter]);

  const activeRecord =
    filtered.find((a) => a.id === selectedAuditId) ??
    audits.find((a) => a.id === selectedAuditId) ??
    filtered[0] ??
    null;

  if (audits.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
        <FileText className="w-8 h-8 text-slate-400 mx-auto" />
        <h3 className="text-base font-bold text-slate-900">ยังไม่มีรายงานผล QA</h3>
        <p className="text-sm text-slate-500">เริ่มต้นตรวจสอบบทสนทนาแรกเพื่อสร้างรายงานวิเคราะห์ฉบับเต็ม</p>
        <button
          type="button"
          onClick={onStartAudit}
          className="px-4 py-2 text-xs font-semibold text-white bg-violet-700 rounded-lg hover:bg-violet-800"
        >
          ไปหน้าตรวจสอบบทสนทนา
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* Left List Selector */}
      <div className="xl:col-span-4 bg-white border border-slate-200 rounded-xl p-4 space-y-3 no-print">
        <div className="text-sm font-bold text-slate-900">เลือกรายงานผล QA ({filtered.length})</div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาชื่อพนักงานหรือรหัส..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <select
            value={scenarioFilter}
            onChange={(e) => setScenarioFilter(e.target.value as ScenarioType | 'all')}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700"
          >
            <option value="all">ทุกสถานการณ์</option>
            {SCENARIO_CONFIGS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>

          <select
            value={qualityFilter}
            onChange={(e) => setQualityFilter(e.target.value as QualityLevel | 'all')}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700"
          >
            <option value="all">ทุกระดับคุณภาพ</option>
            <option value="ดีเยี่ยม">ดีเยี่ยม</option>
            <option value="ดี">ดี</option>
            <option value="พอใช้">พอใช้</option>
            <option value="ต้องปรับปรุง">ต้องปรับปรุง</option>
            <option value="วิกฤต">วิกฤต</option>
          </select>
        </div>

        <div className="divide-y divide-slate-100 max-h-[640px] overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">ไม่พบรายงานที่ตรงกับเงื่อนไข</p>
          ) : (
            filtered.map((item) => {
              const isActive = activeRecord?.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectAuditId(item.id)}
                  className={`w-full text-left py-3 px-2.5 rounded-lg transition-colors ${
                    isActive ? 'bg-violet-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm font-semibold truncate ${isActive ? 'text-violet-800' : 'text-slate-900'}`}>
                      {item.agentName}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-900 tabular-nums shrink-0">
                      {item.analysis.overall.percentage}%
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="truncate">{SCENARIO_MAP[item.detectedScenario]?.label}</span>
                    <span className="font-mono tabular-nums shrink-0">{item.auditDate}</span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-500">
                    {item.analysis.overall.qualityLevel} · พบ {item.analysis.problemDetection.length} ปัญหา
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Full Report Detail */}
      <div className="xl:col-span-8">
        {activeRecord ? (
          <AnalysisReportView record={activeRecord} onGoToCoaching={onGoToCoaching} />
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-sm text-slate-500">
            เลือกรายงานทางด้านซ้ายเพื่ออ่านผลวิเคราะห์ QA ฉบับเต็ม
          </div>
        )}
      </div>
    </div>
  );
};
