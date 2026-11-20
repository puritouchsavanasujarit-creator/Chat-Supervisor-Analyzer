import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Download,
  FileText,
  Lightbulb,
  MessageSquareQuote,
  Printer,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import type { QAAuditRecord, SeverityLevel } from '../types/qa.ts';
import { exportAuditsToCsv, exportSingleReportMarkdown } from '../utils/exportUtils.ts';

function getQualityTextColor(level: string): string {
  switch (level) {
    case 'ดีเยี่ยม':
    case 'ดี':
      return 'text-emerald-700';
    case 'พอใช้':
      return 'text-amber-700';
    default:
      return 'text-rose-700';
  }
}

function getSeverityStyle(sev: SeverityLevel): { text: string; bg: string; label: string } {
  switch (sev) {
    case 'Critical':
      return { text: 'text-rose-800', bg: 'bg-rose-50 border-rose-200', label: 'Critical · วิกฤต' };
    case 'High':
      return { text: 'text-orange-800', bg: 'bg-orange-50 border-orange-200', label: 'High · สูง' };
    case 'Medium':
      return { text: 'text-amber-800', bg: 'bg-amber-50 border-amber-200', label: 'Medium · ปานกลาง' };
    default:
      return { text: 'text-slate-700', bg: 'bg-slate-50 border-slate-200', label: 'Low · ต่ำ' };
  }
}

export const AnalysisReportView: React.FC<{
  record: QAAuditRecord;
  onGoToCoaching?: (agentName: string) => void;
}> = ({ record, onGoToCoaching }) => {
  const { analysis } = record;
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});
  const [showTranscript, setShowTranscript] = useState(false);

  const toggleCheck = (idx: number) => {
    setCheckedItems((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="space-y-8">
      {/* Header Metadata & Export Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
              <span>{record.id}</span>
              <span aria-hidden="true">·</span>
              <span>วันที่ตรวจ {record.auditDate}</span>
              <span aria-hidden="true">·</span>
              <span>ผู้ตรวจ: {record.auditorName}</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              {record.agentName}{' '}
              <span className="text-sm font-normal text-slate-500 font-mono">
                ({record.employeeCode || '-'}) · {record.team}
              </span>
            </h2>
            <p className="text-sm text-slate-600">
              สถานการณ์: <span className="font-semibold text-violet-700">{analysis.scenarioAnalysis.scenarioLabel}</span>
              {' · '}ทักษะเฉพาะ: <span className="font-medium text-slate-800">{analysis.scenarioAnalysis.specificSkillName}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 no-print shrink-0">
            {onGoToCoaching && (
              <button
                type="button"
                onClick={() => onGoToCoaching(record.agentName)}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 transition-colors whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                สร้างแผน Coaching ด้วย AI
              </button>
            )}
            <button
              type="button"
              onClick={() => exportAuditsToCsv([record], `${record.id}-${record.agentName}.csv`)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => exportSingleReportMarkdown(record)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              <FileText className="w-3.5 h-3.5" />
              Export รายงาน
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              พิมพ์รายงาน
            </button>
          </div>
        </div>

        {/* A. Overall Score */}
        <div className="pt-6">
          <div className="text-xs font-semibold text-violet-700 mb-3">A. Overall Score · ผลการประเมินภาพรวม</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-xs text-slate-500">คะแนนรวมที่ทำได้</div>
              <div className="mt-1 flex items-baseline gap-1.5 font-mono tabular-nums">
                <span className="text-3xl font-bold text-slate-900">{analysis.overall.totalScore}</span>
                <span className="text-sm text-slate-500">/ {analysis.overall.maxEvaluableScore}</span>
              </div>
              <div className="mt-1 text-xs text-slate-500 tabular-nums">
                ประเมินได้ {analysis.overall.evaluableCount} จาก {analysis.overall.totalCriteriaCount} เกณฑ์
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-xs text-slate-500">เปอร์เซ็นต์ & ระดับคุณภาพ</div>
              <div className="mt-1 flex items-baseline gap-2.5 font-mono tabular-nums">
                <span className="text-3xl font-bold text-violet-700">{analysis.overall.percentage}%</span>
                <span className={`text-sm font-semibold ${getQualityTextColor(analysis.overall.qualityLevel)}`}>
                  {analysis.overall.qualityLevel}
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-600 rounded-full"
                  style={{ width: `${Math.min(100, analysis.overall.percentage)}%` }}
                />
              </div>
            </div>

            <div className="md:col-span-2 space-y-2">
              <div className="text-sm font-semibold text-slate-900">สรุปผลการประเมินจากหลักฐาน</div>
              <p className="text-sm text-slate-700 leading-relaxed">{analysis.overall.summary}</p>
              <div className="text-xs text-slate-500 pt-1">
                หมายเหตุข้อมูลเวลา: {analysis.overall.timestampNote}
              </div>
            </div>
          </div>

          {analysis.aiLimitations.length > 0 && (
            <div className="mt-4 p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                ข้อจำกัดของหลักฐานในการประเมิน (AI Rules)
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-amber-800">
                {analysis.aiLimitations.map((lim, idx) => (
                  <li key={idx}>{lim}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Scenario Specific Evaluation + Collapsible Raw Transcript */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-indigo-600">
              การวิเคราะห์ทักษะเฉพาะสถานการณ์ ({analysis.scenarioAnalysis.scenarioLabel})
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              ทักษะที่วัด: {analysis.scenarioAnalysis.specificSkillName}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowTranscript((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors no-print self-start"
          >
            <MessageSquareQuote className="w-3.5 h-3.5" />
            {showTranscript ? 'ซ่อนบทสนทนาต้นฉบับ' : 'ดูบทสนทนาต้นฉบับ'}
            {showTranscript ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
        <p className="text-sm text-slate-700 leading-relaxed">{analysis.scenarioAnalysis.assessment}</p>
        <div className="text-xs text-slate-600">
          <span className="font-semibold text-slate-800">จุดตรวจสอบสำคัญ:</span> {analysis.scenarioAnalysis.recommendation}
        </div>

        {showTranscript && (
          <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-xs font-semibold text-slate-600 mb-2">บทสนทนาต้นฉบับที่ใช้ประเมิน</div>
            <pre className="whitespace-pre-wrap text-xs text-slate-800 font-sans leading-relaxed">
              {record.rawTranscript}
            </pre>
          </div>
        )}
      </div>

      {/* B. Score Breakdown */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="text-xs font-semibold text-violet-700 mb-1">B. Score Breakdown · คะแนนรายเกณฑ์ทั้ง 8 ข้อ</div>
        <h3 className="text-base font-bold text-slate-900 mb-5">รายละเอียดคะแนนและหลักฐานอ้างอิงจากบทสนทนา</h3>

        <div className="divide-y divide-slate-100">
          {analysis.scoreBreakdown.map((item, idx) => {
            const pct = item.evaluable && item.score !== null ? Math.round((item.score / item.maxScore) * 100) : 0;
            return (
              <div key={item.key} className="py-4 first:pt-0 last:pb-0 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400 tabular-nums">0{idx + 1}.</span>
                    <span className="font-semibold text-slate-900 text-sm">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {item.evaluable && item.score !== null ? (
                      <>
                        <div className="w-28 h-2 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                          <div
                            className={`h-full rounded-full ${
                              pct >= 80 ? 'bg-indigo-600' : pct >= 60 ? 'bg-amber-500' : 'bg-rose-600'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                          {item.score} / {item.maxScore}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs font-semibold text-amber-700">ไม่สามารถประเมินได้ (งดคิดคะแนน)</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs leading-relaxed">
                  <div>
                    <div className="font-semibold text-slate-500 mb-0.5">เหตุผลที่ได้คะแนน</div>
                    <p className="text-slate-700">
                      {item.evaluable ? item.reason : item.unavailableReason}
                    </p>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-500 mb-0.5">หลักฐานจากบทสนทนา</div>
                    {item.evidence.length > 0 ? (
                      <ul className="space-y-1 text-slate-700">
                        {item.evidence.map((ev, i) => (
                          <li key={i} className="bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200/80 text-slate-800">
                            “{ev}”
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-slate-400">ไม่มีข้อความอ้างอิงในบทสนทนา</p>
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-500 mb-0.5">จุดที่ควรปรับปรุง</div>
                    <p className="text-slate-700">{item.improvement}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* C. Problem Detection */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="text-xs font-semibold text-violet-700 mb-1">C. Problem Detection · การตรวจพบปัญหา</div>
        <h3 className="text-base font-bold text-slate-900 mb-4">ปัญหาและข้อบกพร่องที่พบพร้อมระดับความรุนแรง</h3>

        {analysis.problemDetection.length === 0 ? (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            <span>ไม่พบข้อบกพร่องหรือปัญหาสำคัญจากหลักฐานในบทสนทนานี้</span>
          </div>
        ) : (
          <div className="space-y-3">
            {analysis.problemDetection.map((prob) => {
              const sev = getSeverityStyle(prob.severity);
              return (
                <div key={prob.id} className="p-4 rounded-lg border border-slate-200 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className={`w-4 h-4 shrink-0 ${sev.text}`} />
                      <h4 className="font-semibold text-slate-900 text-sm">{prob.title}</h4>
                    </div>
                    <div className="flex items-center gap-2 text-xs shrink-0">
                      <span className="text-slate-500">{prob.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className={`font-semibold px-2 py-0.5 rounded border ${sev.bg} ${sev.text}`}>
                        {sev.label}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="font-semibold text-slate-500 block mb-0.5">หลักฐานข้อความจากแชท</span>
                      <p className="bg-slate-50 p-2 rounded border border-slate-200 text-slate-800">
                        “{prob.evidenceQuote}”
                      </p>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500 block mb-0.5">ผลกระทบที่อาจเกิดขึ้น</span>
                      <p className="text-slate-700">{prob.impact}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500 block mb-0.5">เกณฑ์ QA ที่เกี่ยวข้อง</span>
                      <p className="font-medium text-violet-700">{prob.relatedCriterion}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* D. Improvement & E. Solution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div>
            <div className="text-xs font-semibold text-violet-700 mb-1">D. Improvement · สิ่งที่ต้องปรับปรุง</div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-violet-600" />
              ทักษะและพฤติกรรมที่ต้องพัฒนา
            </h3>
          </div>
          <div className="space-y-4 divide-y divide-slate-100">
            {analysis.improvements.map((imp, i) => (
              <div key={i} className="pt-3 first:pt-0 space-y-1.5 text-xs">
                <div className="font-semibold text-sm text-slate-900">{imp.skillToDevelop}</div>
                <p className="text-slate-700">
                  <span className="font-semibold text-slate-600">พฤติกรรมที่ควรปรับ:</span> {imp.behaviorToAdjust}
                </p>
                <p className="text-slate-600">
                  <span className="font-semibold text-slate-600">เหตุผล:</span> {imp.reason}
                </p>
                <p className="text-indigo-700 font-medium">
                  วิธีการพัฒนา: {imp.developmentMethod}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div>
            <div className="text-xs font-semibold text-violet-700 mb-1">E. Solution · แนวทางแก้ไข</div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-violet-600" />
              ตัวอย่างข้อความและเทคนิคการตอบแชท
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <div className="font-semibold text-slate-700 mb-1">วิธีแก้ปัญหาเชิงขั้นตอน</div>
              <ol className="list-decimal list-inside space-y-1 text-slate-700">
                {analysis.solution.resolutionSteps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200">
                <div className="font-semibold text-emerald-800 mb-1">ตัวอย่างข้อความที่เหมาะสม</div>
                <ul className="space-y-1.5 text-emerald-900">
                  {analysis.solution.recommendedPhrases.map((p, i) => (
                    <li key={i}>• “{p}”</li>
                  ))}
                </ul>
              </div>
              <div className="p-3 rounded-lg bg-rose-50/70 border border-rose-200">
                <div className="font-semibold text-rose-800 mb-1">ตัวอย่างข้อความที่ควรหลีกเลี่ยง</div>
                <ul className="space-y-1.5 text-rose-900">
                  {analysis.solution.phrasesToAvoid.map((p, i) => (
                    <li key={i}>• “{p}”</li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              <div className="font-semibold text-slate-700 mb-1">เทคนิคการตอบแชท</div>
              <ul className="list-disc list-inside space-y-1 text-slate-700">
                {analysis.solution.chatTechniques.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>

            <div>
              <div className="font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-violet-600" />
                Checklist ก่อนส่งข้อความ (คลิกเพื่อตรวจสอบ)
              </div>
              <div className="space-y-1.5">
                {analysis.solution.preSendChecklist.map((item, i) => (
                  <label
                    key={i}
                    className="flex items-start gap-2 cursor-pointer text-slate-700 hover:text-slate-900"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(checkedItems[i])}
                      onChange={() => toggleCheck(i)}
                      className="mt-0.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    />
                    <span className={checkedItems[i] ? 'line-through text-slate-400' : ''}>{item}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* F. Coaching Plan & G. Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
          <div>
            <div className="text-xs font-semibold text-violet-700 mb-1">F. Coaching Plan · แผนพัฒนาพนักงาน</div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Target className="w-4 h-4 text-violet-600" />
              แผนการฝึกฝนและตัวชี้วัดติดตามผล
            </h3>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 bg-violet-50 border border-violet-200 rounded-lg">
              <span className="font-semibold text-violet-900">เป้าหมาย: </span>
              <span className="text-violet-800">{analysis.coachingPlan.goal}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="font-semibold text-slate-600 mb-1">ทักษะที่ต้องฝึก</div>
                <ul className="list-disc list-inside text-slate-700 space-y-0.5">
                  {analysis.coachingPlan.skillsToPractice.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="font-semibold text-slate-600 mb-1">ระยะเวลา</div>
                <p className="text-slate-800 font-medium">{analysis.coachingPlan.duration}</p>
              </div>
            </div>
            <div>
              <div className="font-semibold text-slate-600 mb-1">แบบฝึกหัดแนะนำ</div>
              <ul className="list-disc list-inside text-slate-700 space-y-0.5">
                {analysis.coachingPlan.exercises.map((ex, i) => (
                  <li key={i}>{ex}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="font-semibold text-slate-600 mb-1">ตัวชี้วัด (KPI)</div>
              <ul className="list-disc list-inside text-slate-700 space-y-0.5">
                {analysis.coachingPlan.metrics.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="font-semibold text-slate-600 mb-0.5">วิธีติดตามผล</div>
              <p className="text-slate-700">{analysis.coachingPlan.followUpMethod}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
          <div>
            <div className="text-xs font-semibold text-violet-700 mb-1">G. Summary · สรุปผลการตรวจสอบ</div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-violet-600" />
              จุดแข็ง จุดอ่อน และ 3 สิ่งที่ควรปรับปรุงอันดับแรก
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="font-semibold text-emerald-700 mb-1">จุดแข็ง</div>
                <ul className="list-disc list-inside text-slate-700 space-y-1">
                  {analysis.summary.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="font-semibold text-rose-700 mb-1">จุดอ่อน</div>
                <ul className="list-disc list-inside text-slate-700 space-y-1">
                  {analysis.summary.weaknesses.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              <div className="font-semibold text-slate-700 mb-1">3 สิ่งที่ควรปรับปรุงเป็นอันดับแรก</div>
              <ol className="list-decimal list-inside space-y-1 text-slate-800 font-medium">
                {analysis.summary.top3Priorities.slice(0, 3).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ol>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="font-semibold text-slate-700 mb-0.5">แนวทาง Coaching ที่แนะนำ</div>
              <p className="text-slate-700">{analysis.summary.recommendedCoachingApproach}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
