import React, { useState } from 'react';
import { Check, Plus, RotateCcw } from 'lucide-react';
import type { AgentProfile, CriterionKey, QASettings } from '../types/qa.ts';
import { CRITERIA_WEIGHT_PRESETS, DEFAULT_CRITERIA } from '../constants/qaConfig.ts';

export const SettingsPage: React.FC<{
  settings: QASettings;
  agents: AgentProfile[];
  onSaveSettings: (next: QASettings) => Promise<void>;
  onAddAgent: (agent: {
    name: string;
    employeeCode: string;
    team: string;
    role: string;
  }) => Promise<void>;
  onResetDemoData: () => Promise<void>;
}> = ({ settings, agents, onSaveSettings, onAddAgent, onResetDemoData }) => {
  const [draft, setDraft] = useState<QASettings>(settings);
  const [savedFlag, setSavedFlag] = useState(false);

  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newTeam, setNewTeam] = useState('ทีม Inbound & Sales');
  const [newRole, setNewRole] = useState('Chat Agent');
  const [confirmReset, setConfirmReset] = useState(false);

  const totalConfiguredWeight = (Object.values(draft.criteriaWeights) as number[]).reduce(
    (s, n) => s + Number(n || 0),
    0
  );

  const handleWeightChange = (key: CriterionKey, val: number) => {
    setDraft((prev) => ({
      ...prev,
      criteriaWeights: {
        ...prev.criteriaWeights,
        [key]: Math.max(0, Math.min(100, val)),
      },
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveSettings(draft);
    setSavedFlag(true);
    setTimeout(() => setSavedFlag(false), 2000);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await onAddAgent({
      name: newName.trim(),
      employeeCode: newCode.trim(),
      team: newTeam,
      role: newRole,
    });
    setNewName('');
    setNewCode('');
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">ตั้งค่าเกณฑ์การประเมิน QA และระบบ</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ปรับน้ำหนักคะแนนทั้ง 8 เกณฑ์ (แนะนำรวม 100 คะแนน) และเกณฑ์การผ่านคุณภาพ
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setDraft((p) => ({
                  ...p,
                  criteriaWeights: { ...CRITERIA_WEIGHT_PRESETS.standardPrompt.weights },
                }))
              }
              className="px-3 py-1.5 text-xs font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100"
            >
              ใช้ค่าเริ่มต้นระบบ (10/15)
            </button>
            <button
              type="button"
              onClick={() =>
                setDraft((p) => ({
                  ...p,
                  criteriaWeights: { ...CRITERIA_WEIGHT_PRESETS.csvTemplate.weights },
                }))
              }
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100"
            >
              ใช้ค่าน้ำหนัก CSV ทีม (15/10)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              ชื่อผู้ตรวจ QA เริ่มต้น
            </label>
            <input
              type="text"
              value={draft.defaultAuditorName}
              onChange={(e) => setDraft((p) => ({ ...p, defaultAuditorName: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              เกณฑ์ผ่าน QA Pass Rate (%)
            </label>
            <input
              type="number"
              min={50}
              max={100}
              value={draft.passThresholdPercent}
              onChange={(e) =>
                setDraft((p) => ({ ...p, passThresholdPercent: Number(e.target.value) || 80 }))
              }
              className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">น้ำหนักคะแนนทั้ง 8 เกณฑ์</h3>
            <span
              className={`font-mono text-xs font-bold tabular-nums ${
                totalConfiguredWeight === 100 ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              คะแนนเต็มรวม: {totalConfiguredWeight} คะแนน
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {DEFAULT_CRITERIA.map((c) => (
              <div
                key={c.key}
                className="flex items-center justify-between gap-4 p-3 rounded-lg border border-slate-200 bg-slate-50/50"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900">
                    {c.order}. {c.name}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">{c.description}</div>
                </div>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={draft.criteriaWeights[c.key] ?? c.maxScore}
                  onChange={(e) => handleWeightChange(c.key, Number(e.target.value))}
                  className="w-20 px-2.5 py-1.5 text-sm font-mono text-right border border-slate-200 rounded-lg bg-white shrink-0"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          {savedFlag && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
              <Check className="w-4 h-4" /> บันทึกการตั้งค่าแล้ว
            </span>
          )}
          <button
            type="submit"
            className="px-5 py-2 text-sm font-semibold text-white bg-violet-700 rounded-lg hover:bg-violet-800 transition-colors"
          >
            บันทึกการตั้งค่า
          </button>
        </div>
      </form>

      {/* Add New Agent */}
      <form onSubmit={handleAdd} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            จัดการรายชื่อพนักงานในทีม ({agents.length} คน)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            เพิ่มพนักงานใหม่เข้าสู่ระบบเพื่อให้เลือกตรวจแชทและติดตามผลได้ทันที
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อ-สกุลพนักงาน</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="เช่น สุชาดา ใจดี"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">รหัสพนักงาน</label>
            <input
              type="text"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="CS-113"
              className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">ทีม</label>
            <select
              value={newTeam}
              onChange={(e) => setNewTeam(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
            >
              <option value="ทีม Inbound & Sales">ทีม Inbound & Sales</option>
              <option value="ทีม After-Sales & Claim">ทีม After-Sales & Claim</option>
              <option value="ทีม Logistics & Tracking">ทีม Logistics & Tracking</option>
            </select>
          </div>
          <div>
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4" />
              เพิ่มพนักงาน
            </button>
          </div>
        </div>
      </form>

      {/* Reset Demo Data */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">รีเซ็ตข้อมูลทดลอง (Demo Data)</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            คืนค่าประวัติการตรวจ รายชื่อพนักงาน 12 คน และการตั้งค่ากลับเป็นชุดข้อมูลเริ่มต้น
          </p>
        </div>
        {confirmReset ? (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={async () => {
                await onResetDemoData();
                setConfirmReset(false);
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-700"
            >
              ยืนยันรีเซ็ตข้อมูลทั้งหมด
            </button>
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className="px-3 py-2 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              ยกเลิก
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            รีเซ็ต Demo Data
          </button>
        )}
      </div>
    </div>
  );
};
