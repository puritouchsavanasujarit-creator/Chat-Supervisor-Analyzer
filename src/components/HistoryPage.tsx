import React, { useMemo, useState } from 'react';
import { Download, Eye, FileText, Search, Trash2 } from 'lucide-react';
import type { QAAuditRecord, ScenarioType } from '../types/qa.ts';
import { SCENARIO_CONFIGS, SCENARIO_MAP } from '../constants/qaConfig.ts';
import { exportAuditsToCsv, exportSingleReportMarkdown } from '../utils/exportUtils.ts';

export const HistoryPage: React.FC<{
  audits: QAAuditRecord[];
  onSelectReport: (auditId: string) => void;
  onDeleteAudit: (auditId: string) => Promise<void>;
}> = ({ audits, onSelectReport, onDeleteAudit }) => {
  const [query, setQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [scenarioFilter, setScenarioFilter] = useState<ScenarioType | 'all'>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return audits
      .filter((a) => {
        const q = query.trim().toLowerCase();
        const matchQ =
          !q ||
          a.agentName.toLowerCase().includes(q) ||
          a.employeeCode.toLowerCase().includes(q) ||
          a.auditorName.toLowerCase().includes(q) ||
          a.id.toLowerCase().includes(q);
        const matchFrom = !dateFrom || a.auditDate >= dateFrom;
        const matchTo = !dateTo || a.auditDate <= dateTo;
        const matchSc = scenarioFilter === 'all' || a.detectedScenario === scenarioFilter;
        return matchQ && matchFrom && matchTo && matchSc;
      })
      .sort((a, b) => b.auditDate.localeCompare(a.auditDate));
  }, [audits, query, dateFrom, dateTo, scenarioFilter]);

  const handleResetFilters = () => {
    setQuery('');
    setDateFrom('');
    setDateTo('');
    setScenarioFilter('all');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">ประวัติการตรวจ QA ทั้งหมด ({filtered.length})</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ค้นหาตามพนักงาน กรองตามช่วงวันที่และประเภทสถานการณ์ พร้อมส่งออกเป็นไฟล์ CSV หรือรายงานฉบับเต็ม
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => exportAuditsToCsv(filtered, 'chat-qa-history.csv')}
              disabled={filtered.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV ({filtered.length} รายการ)
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-4 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาชื่อพนักงาน รหัส หรือผู้ตรวจ..."
              className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div className="lg:col-span-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              aria-label="ตั้งแต่วันที่"
              className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div className="lg:col-span-2">
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              aria-label="ถึงวันที่"
              className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div className="lg:col-span-3">
            <select
              value={scenarioFilter}
              onChange={(e) => setScenarioFilter(e.target.value as ScenarioType | 'all')}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-700"
            >
              <option value="all">ทุกประเภทแชท</option>
              {SCENARIO_CONFIGS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-1">
            <button
              type="button"
              onClick={handleResetFilters}
              className="w-full px-3 py-2 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              ล้าง
            </button>
          </div>
        </div>

        {/* History Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                <th className="py-2.5 pr-3">รหัส</th>
                <th className="py-2.5 px-3">วันที่ตรวจ</th>
                <th className="py-2.5 px-3">พนักงาน</th>
                <th className="py-2.5 px-3">ประเภทแชท</th>
                <th className="py-2.5 px-3">ผู้ตรวจ</th>
                <th className="py-2.5 px-3 text-right">คะแนน</th>
                <th className="py-2.5 px-3">คุณภาพ</th>
                <th className="py-2.5 px-3 text-right">ปัญหา</th>
                <th className="py-2.5 pl-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-sm text-slate-500">
                    ไม่พบประวัติการตรวจตามเงื่อนไขที่ค้นหา
                  </td>
                </tr>
              ) : (
                filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 pr-3 font-mono text-xs text-slate-600 whitespace-nowrap">{a.id}</td>
                    <td className="py-3 px-3 font-mono text-xs tabular-nums text-slate-700 whitespace-nowrap">
                      {a.auditDate}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900 text-sm">{a.agentName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {a.employeeCode} · {a.team}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-700">
                      {SCENARIO_MAP[a.detectedScenario]?.label}
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-600">{a.auditorName}</td>
                    <td className="py-3 px-3 text-right font-mono text-xs font-bold tabular-nums text-slate-900 whitespace-nowrap">
                      {a.analysis.overall.totalScore}/{a.analysis.overall.maxEvaluableScore} ({a.analysis.overall.percentage}%)
                    </td>
                    <td className="py-3 px-3 text-xs font-medium text-slate-700 whitespace-nowrap">
                      {a.analysis.overall.qualityLevel}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs tabular-nums text-slate-700">
                      {a.analysis.problemDetection.length}
                    </td>
                    <td className="py-3 pl-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSelectReport(a.id)}
                          title="ดูรายงานเต็ม"
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => exportSingleReportMarkdown(a)}
                          title="Export รายงาน"
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        {confirmDeleteId === a.id ? (
                          <button
                            type="button"
                            onClick={async () => {
                              await onDeleteAudit(a.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-2 py-1 text-[11px] font-semibold text-white bg-rose-600 rounded hover:bg-rose-700"
                          >
                            ยืนยันลบ
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(a.id)}
                            title="ลบรายการ"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
