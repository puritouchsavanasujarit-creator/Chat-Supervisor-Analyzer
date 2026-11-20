import React, { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Clock,
  FileSpreadsheet,
  FileText,
  Loader2,
  Sparkles,
  Upload,
} from 'lucide-react';
import type { AgentProfile, QAAuditRecord, QASettings, ScenarioType } from '../types/qa.ts';
import { SAMPLE_TRANSCRIPTS, SCENARIO_CONFIGS } from '../constants/qaConfig.ts';
import { detectTimestampsInText, parseChatFile } from '../utils/chatParser.ts';
import { AnalysisReportView } from './AnalysisReportView.tsx';

type ImportTab = 'paste' | 'csv' | 'txt' | 'excel';

export const ChatAuditPage: React.FC<{
  agents: AgentProfile[];
  settings: QASettings;
  onAuditCompleted: (record: QAAuditRecord) => void;
  onGoToCoaching: (agentName: string) => void;
}> = ({ agents, settings, onAuditCompleted, onGoToCoaching }) => {
  const [selectedAgentId, setSelectedAgentId] = useState<string>(agents[0]?.id ?? 'custom');
  const [customAgentName, setCustomAgentName] = useState<string>('');
  const [employeeCode, setEmployeeCode] = useState<string>(agents[0]?.employeeCode ?? '');
  const [team, setTeam] = useState<string>(agents[0]?.team ?? 'ทีม Inbound & Sales');
  const [auditDate, setAuditDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [auditorName, setAuditorName] = useState<string>(settings.defaultAuditorName);
  const [scenarioInput, setScenarioInput] = useState<ScenarioType | 'auto'>('auto');
  const [importMethod, setImportMethod] = useState<ImportTab>('paste');
  const [transcript, setTranscript] = useState<string>('');
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [latestResult, setLatestResult] = useState<QAAuditRecord | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeAgentName = useMemo(() => {
    if (selectedAgentId === 'custom') return customAgentName.trim();
    return agents.find((a) => a.id === selectedAgentId)?.name ?? '';
  }, [selectedAgentId, customAgentName, agents]);

  const hasTimestamps = useMemo(() => detectTimestampsInText(transcript), [transcript]);

  const handleAgentSelect = (id: string) => {
    setSelectedAgentId(id);
    if (id === 'custom') {
      setEmployeeCode('');
      setTeam('ทีม Customer Service');
    } else {
      const found = agents.find((a) => a.id === id);
      if (found) {
        setEmployeeCode(found.employeeCode);
        setTeam(found.team);
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg('');
    try {
      const mode: 'csv' | 'txt' | 'excel' =
        importMethod === 'csv' || file.name.toLowerCase().endsWith('.csv')
          ? 'csv'
          : importMethod === 'excel' || /\.(xlsx|xls)$/i.test(file.name)
            ? 'excel'
            : 'txt';
      const parsed = await parseChatFile(file, mode);
      setTranscript(parsed.transcript);
      setUploadStatus(`${file.name} — ${parsed.summaryNote}`);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? `ไม่สามารถอ่านไฟล์ได้: ${err.message}` : 'เกิดข้อผิดพลาดในการอ่านไฟล์'
      );
    }
    e.target.value = '';
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!activeAgentName) {
      setErrorMsg('กรุณาเลือกพนักงานหรือระบุชื่อพนักงานที่ต้องการตรวจสอบ');
      return;
    }
    if (!transcript.trim()) {
      setErrorMsg('กรุณาวางบทสนทนา หรืออัปโหลดไฟล์แชทก่อนกด Analyze Chat');
      return;
    }

    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/qa/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedAgentId === 'custom' ? undefined : selectedAgentId,
          agentName: activeAgentName,
          employeeCode,
          team,
          auditDate,
          auditorName,
          scenarioInput,
          importMethod,
          transcript,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการวิเคราะห์บทสนทนา');
      }
      setLatestResult(data.record);
      onAuditCompleted(data.record);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'ไม่สามารถวิเคราะห์บทสนทนาได้');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleAnalyze} className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">ตรวจสอบบทสนทนาด้วย AI (Chat Audit)</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ประเมินผลตามเกณฑ์ QA 8 ข้อ (100 คะแนน) อิงหลักฐานจากข้อความจริงในบทสนทนาเท่านั้น
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">ทดลองใส่ตัวอย่างแชท:</span>
            {SAMPLE_TRANSCRIPTS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setTranscript(s.transcript);
                  setScenarioInput(s.scenario);
                  setImportMethod('paste');
                  setUploadStatus('');
                }}
                className="px-2.5 py-1 text-xs font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-md hover:bg-violet-100 transition-colors whitespace-nowrap"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Agent & Audit Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              ชื่อพนักงาน <span className="text-rose-600">*</span>
            </label>
            <select
              value={selectedAgentId}
              onChange={(e) => handleAgentSelect(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.employeeCode})
                </option>
              ))}
              <option value="custom">+ ระบุชื่อพนักงานใหม่</option>
            </select>
            {selectedAgentId === 'custom' && (
              <input
                type="text"
                value={customAgentName}
                onChange={(e) => setCustomAgentName(e.target.value)}
                placeholder="พิมพ์ชื่อ-นามสกุลพนักงาน..."
                className="mt-2 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              รหัสพนักงาน (ถ้ามี)
            </label>
            <input
              type="text"
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              placeholder="เช่น CS-101"
              className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              วันที่ตรวจ
            </label>
            <input
              type="date"
              value={auditDate}
              onChange={(e) => setAuditDate(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              ผู้ตรวจ QA
            </label>
            <input
              type="text"
              value={auditorName}
              onChange={(e) => setAuditorName(e.target.value)}
              placeholder="ชื่อหัวหน้าทีม / QA"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </div>

        {/* Scenario Selector & Import Channel Tabs */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
          <div className="lg:col-span-5">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              ประเภทสถานการณ์ (Chat Scenario)
            </label>
            <select
              value={scenarioInput}
              onChange={(e) => setScenarioInput(e.target.value as ScenarioType | 'auto')}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="auto">ให้ AI จัดประเภทอัตโนมัติ (แนะนำ)</option>
              {SCENARIO_CONFIGS.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.label} — ทักษะ: {sc.specificSkill}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-7">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              ช่องทางนำเข้าบทสนทนา
            </label>
            <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(
                [
                  { id: 'paste', label: 'Paste Chat', icon: FileText },
                  { id: 'csv', label: 'Upload CSV', icon: FileSpreadsheet },
                  { id: 'txt', label: 'Upload TXT', icon: Upload },
                  { id: 'excel', label: 'Upload Excel', icon: FileSpreadsheet },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const active = importMethod === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setImportMethod(tab.id);
                      if (tab.id !== 'paste') {
                        fileInputRef.current?.click();
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-white text-violet-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,.xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        {/* File Upload Dropbar when non-paste tab is active */}
        {importMethod !== 'paste' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border border-dashed border-violet-300 bg-violet-50/40">
            <div className="text-xs text-slate-700">
              <div className="font-semibold text-violet-900">
                รองรับไฟล์ {importMethod.toUpperCase()} (ระบบจะแปลงข้อความเป็นบทสนทนาในช่องด้านล่างให้อัตโนมัติ)
              </div>
              {uploadStatus ? (
                <div className="text-emerald-700 font-medium mt-0.5">{uploadStatus}</div>
              ) : (
                <div className="text-slate-500 mt-0.5">
                  แนะนำคอลัมน์ เช่น time / sender / message หรือข้อความบรรทัดต่อบรรทัด
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 text-xs font-semibold text-violet-700 bg-white border border-violet-200 rounded-lg hover:bg-violet-50 whitespace-nowrap shrink-0"
            >
              เลือกไฟล์จากเครื่อง
            </button>
          </div>
        )}

        {/* Chat Transcript Input */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
            <label className="text-xs font-semibold text-slate-700">
              เนื้อหาบทสนทนา (สามารถวางแชทหรือแก้ไขข้อความที่นำเข้าจากไฟล์ได้)
            </label>
            <div className="flex items-center gap-1.5 text-xs">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {transcript.trim() ? (
                hasTimestamps ? (
                  <span className="text-emerald-700 font-medium">
                    ตรวจพบ Timestamp — ระบบจะประเมินเกณฑ์ความเร็วในการตอบด้วย
                  </span>
                ) : (
                  <span className="text-amber-700 font-medium">
                    ไม่พบ Timestamp — ระบบจะงดประเมินความเร็วในการตอบตามกฎ AI QA
                  </span>
                )
              ) : (
                <span className="text-slate-400">รอรับข้อความบทสนทนา</span>
              )}
            </div>
          </div>

          <textarea
            rows={9}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder={`วางบทสนทนาที่นี่ เช่น\n[10:02] ลูกค้า: สอบถามราคาสินค้า...\n[10:03] พนักงาน: สวัสดีค่ะ ยินดีให้บริการค่ะ...`}
            className="w-full p-3.5 text-sm border border-slate-200 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 leading-relaxed"
          />
        </div>

        {errorMsg && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
          <p className="text-xs text-slate-500">
            ระบบจะวิเคราะห์จากหลักฐานในบทสนทนาเท่านั้น และบันทึกผลลงในประวัติการตรวจอัตโนมัติ
          </p>
          <button
            type="submit"
            disabled={isAnalyzing}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-violet-700 rounded-lg hover:bg-violet-800 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                กำลังวิเคราะห์บทสนทนาด้วย AI...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Analyze Chat
              </>
            )}
          </button>
        </div>
      </form>

      {/* Immediate AI Analysis Output */}
      {latestResult && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">
              ผลการวิเคราะห์ QA ล่าสุด ({latestResult.id})
            </h3>
          </div>
          <AnalysisReportView record={latestResult} onGoToCoaching={onGoToCoaching} />
        </div>
      )}
    </div>
  );
};
