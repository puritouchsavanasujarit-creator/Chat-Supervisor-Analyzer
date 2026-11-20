import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  CheckSquare,
  GraduationCap,
  HelpCircle,
  Loader2,
  MessageSquare,
  Sparkles,
  Users,
} from 'lucide-react';
import type {
  AICoachPlanResponse,
  AgentProfile,
  QAAuditRecord,
  QASettings,
} from '../types/qa.ts';
import { computeAgentStats } from '../utils/qaAnalytics.ts';

export const CoachingPage: React.FC<{
  agents: AgentProfile[];
  audits: QAAuditRecord[];
  settings: QASettings;
  preselectedAgentName?: string | null;
}> = ({ agents, audits, settings, preselectedAgentName }) => {
  const [selectedAgentId, setSelectedAgentId] = useState<string>(() => {
    if (preselectedAgentName) {
      const found = agents.find((a) => a.name === preselectedAgentName);
      if (found) return found.id;
    }
    return agents[1]?.id ?? agents[0]?.id ?? '';
  });

  useEffect(() => {
    if (preselectedAgentName) {
      const found = agents.find((a) => a.name === preselectedAgentName);
      if (found) setSelectedAgentId(found.id);
    }
  }, [preselectedAgentName, agents]);

  const [focusTopic, setFocusTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [coachPlan, setCoachPlan] = useState<AICoachPlanResponse | null>(null);

  // Interactive states for exercises, quiz, checklist
  const [exerciseReplies, setExerciseReplies] = useState<Record<number, string>>({});
  const [showSampleReply, setShowSampleReply] = useState<Record<number, boolean>>({});
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [checklistState, setChecklistState] = useState<Record<number, boolean>>({});

  const selectedAgent = useMemo(
    () => agents.find((a) => a.id === selectedAgentId) ?? agents[0],
    [agents, selectedAgentId]
  );

  const agentStats = useMemo(() => {
    if (!selectedAgent) return null;
    return computeAgentStats(selectedAgent, audits, settings.passThresholdPercent);
  }, [selectedAgent, audits, settings.passThresholdPercent]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent || !agentStats) return;
    setErrorMsg('');
    setIsGenerating(true);

    try {
      const res = await fetch('/api/qa/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName: selectedAgent.name,
          team: selectedAgent.team,
          avgPercentage: agentStats.avgPercentage,
          weaknesses: agentStats.topWeaknesses,
          frequentProblems: agentStats.frequentProblems,
          focusTopic: focusTopic.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'ไม่สามารถสร้างชุด Coaching ด้วย AI ได้');
      }
      setCoachPlan(data.plan);
      setExerciseReplies({});
      setShowSampleReply({});
      setQuizAnswers({});
      setChecklistState({});
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการสร้างแผน Coaching');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Coach Generator Panel */}
      <form onSubmit={handleGenerate} className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">AI Coach สำหรับหัวหน้าทีม QA และ Trainer</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              สร้างแผนพัฒนาเฉพาะบุคคล แบบฝึกหัด Roleplay บทสนทนาตัวอย่าง แบบทดสอบ และคำแนะนำการสอนงานจากข้อมูล QA จริง
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
          <div className="lg:col-span-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              เลือกพนักงานที่ต้องการ Coaching
            </label>
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.employeeCode}) · {a.coachingStatus}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-5">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              หัวข้อที่ Trainer ต้องการเน้นเป็นพิเศษ (ไม่บังคับ)
            </label>
            <input
              type="text"
              value={focusTopic}
              onChange={(e) => setFocusTopic(e.target.value)}
              placeholder="เช่น การรับมือลูกค้าร้องเรียน หรือ การทวนออเดอร์ก่อนปิดการขาย"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div className="lg:col-span-3">
            <button
              type="submit"
              disabled={isGenerating}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-violet-700 rounded-lg hover:bg-violet-800 disabled:opacity-60 transition-colors whitespace-nowrap"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  กำลังสร้างแผน Coaching...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  สร้างชุด Coaching ด้วย AI
                </>
              )}
            </button>
          </div>
        </div>

        {/* Agent Context Snapshot */}
        {agentStats && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="font-semibold text-slate-600">คะแนนเฉลี่ยปัจจุบัน: </span>
              <span className="font-mono font-bold text-slate-900 tabular-nums">
                {agentStats.auditCount > 0 ? `${agentStats.avgPercentage}%` : 'ยังไม่มีข้อมูลตรวจ'}
              </span>
              <div className="text-slate-500 mt-0.5">ตรวจแล้ว {agentStats.auditCount} บทสนทนา · {agentStats.agent.team}</div>
            </div>
            <div>
              <span className="font-semibold text-slate-600 block mb-0.5">จุดอ่อนจากผลตรวจล่าสุด:</span>
              <span className="text-slate-700">
                {agentStats.topWeaknesses.length > 0
                  ? agentStats.topWeaknesses.slice(0, 2).join(', ')
                  : 'ยังไม่พบจุดอ่อนสำคัญ'}
              </span>
            </div>
            <div>
              <span className="font-semibold text-slate-600 block mb-0.5">ปัญหาที่พบบ่อย:</span>
              <span className="text-slate-700">
                {agentStats.frequentProblems.length > 0
                  ? agentStats.frequentProblems.slice(0, 2).join(', ')
                  : 'ยังไม่พบปัญหาซ้ำ'}
              </span>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}
      </form>

      {/* AI Coach Output (8 modules) */}
      {!coachPlan ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-2">
          <GraduationCap className="w-8 h-8 text-violet-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">พร้อมสร้างชุดเครื่องมือ Coaching เฉพาะบุคคล</h3>
          <p className="text-sm text-slate-500 max-w-xl mx-auto">
            เลือกพนักงานด้านบนแล้วกดปุ่ม “สร้างชุด Coaching ด้วย AI” เพื่อรับบทวิเคราะห์ปัญหา แผนพัฒนา แบบฝึกตอบแชท สถานการณ์ Roleplay แบบทดสอบ และคำแนะนำสำหรับ Trainer
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 1. Problem Analysis & 2. Individual Development Plan */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
              <h3 className="text-base font-bold text-slate-900">
                1. วิเคราะห์ปัญหาของพนักงาน ({coachPlan.agentName})
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">{coachPlan.problemAnalysis.evidenceSummary}</p>
              <div className="text-xs space-y-2 pt-1">
                <div>
                  <div className="font-semibold text-slate-700 mb-1">ประเด็นปัญหาหลัก</div>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                    {coachPlan.problemAnalysis.coreIssues.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="font-semibold text-slate-700 mb-1">สาเหตุรากฐาน</div>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                    {coachPlan.problemAnalysis.rootCauses.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
              <h3 className="text-base font-bold text-slate-900">2. แผนพัฒนาเฉพาะบุคคล</h3>
              <div className="p-3 bg-violet-50 border border-violet-200 rounded-lg text-xs">
                <span className="font-semibold text-violet-900">เป้าหมาย: </span>
                <span className="text-violet-800">{coachPlan.individualPlan.goal}</span>
                <div className="text-violet-700 mt-1 font-medium">
                  ระยะเวลา: {coachPlan.individualPlan.duration}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="font-semibold text-slate-700 mb-1">แผนงานรายสัปดาห์</div>
                  <ul className="list-disc list-inside space-y-1 text-slate-700">
                    {coachPlan.individualPlan.milestones.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="font-semibold text-slate-700 mb-1">KPI เป้าหมาย</div>
                  <ul className="list-disc list-inside space-y-1 text-slate-700">
                    {coachPlan.individualPlan.kpiTargets.map((k, i) => (
                      <li key={i}>{k}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Interactive Chat Exercises */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-violet-600" />
              3. แบบฝึกตอบแชท (ทดลองพิมพ์คำตอบและเทียบกับแนวทางที่เหมาะสม)
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {coachPlan.exercises.map((ex, i) => (
                <div key={i} className="p-4 border border-slate-200 rounded-lg space-y-3 text-xs">
                  <div className="font-bold text-sm text-slate-900">{ex.title}</div>
                  <div className="text-slate-500">บริบท: {ex.context}</div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800">
                    <span className="font-semibold text-slate-600 block mb-0.5">ข้อความจากลูกค้า:</span>
                    “{ex.customerMessage}”
                  </div>
                  <div className="text-indigo-700 font-medium">เป้าหมายการฝึก: {ex.goal}</div>
                  <textarea
                    rows={3}
                    value={exerciseReplies[i] ?? ''}
                    onChange={(e) =>
                      setExerciseReplies((prev) => ({ ...prev, [i]: e.target.value }))
                    }
                    placeholder="ให้พนักงานทดลองพิมพ์คำตอบตรงนี้..."
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <div className="flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() =>
                        setShowSampleReply((prev) => ({ ...prev, [i]: !prev[i] }))
                      }
                      className="text-xs font-semibold text-violet-700 hover:text-violet-900"
                    >
                      {showSampleReply[i] ? 'ซ่อนคำตอบตัวอย่าง' : 'ดูแนวทางคำตอบที่เหมาะสม'}
                    </button>
                  </div>
                  {showSampleReply[i] && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900">
                      <span className="font-semibold block mb-0.5">ตัวอย่างคำตอบที่เหมาะสม:</span>
                      {ex.sampleIdealReply}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 4. Roleplay Scenarios & 5. Dialogue Examples */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-violet-600" />
                4. สถานการณ์จำลอง (Roleplay Scenarios)
              </h3>
              <div className="space-y-3">
                {coachPlan.roleplayScenarios.map((rp, i) => (
                  <div key={i} className="p-4 border border-slate-200 rounded-lg space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm text-slate-900">{rp.scenarioTitle}</span>
                      <span className="font-semibold text-violet-700">{rp.difficulty}</span>
                    </div>
                    <p className="text-slate-600">บทบาทลูกค้า: {rp.customerPersona}</p>
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-slate-800">
                      เปิดบทสนทนา: “{rp.openingMessage}”
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">เป้าหมายที่ต้องทำให้ได้:</span>
                      <ul className="list-disc list-inside text-slate-600 mt-0.5">
                        {rp.keyObjectives.map((obj, idx) => (
                          <li key={idx}>{obj}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-violet-600" />
                5. บทสนทนาตัวอย่าง (เปรียบเทียบควรเลี่ยง vs ควรใช้)
              </h3>
              <div className="space-y-3">
                {coachPlan.dialogueExamples.map((dlg, i) => (
                  <div key={i} className="p-4 border border-slate-200 rounded-lg space-y-2 text-xs">
                    <div className="font-bold text-sm text-slate-900">{dlg.topic}</div>
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-900">
                      <span className="font-semibold">ควรหลีกเลี่ยง: </span>“{dlg.badExample}”
                    </div>
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-emerald-900">
                      <span className="font-semibold">เหมาะสมกว่า: </span>“{dlg.goodExample}”
                    </div>
                    <p className="text-slate-600">เหตุผล: {dlg.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 6. Interactive Quiz & 7. Checklist & 8. Trainer Guidance */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-violet-600" />
                6. แบบทดสอบความเข้าใจหลัง Coaching
              </h3>
              <div className="space-y-4">
                {coachPlan.quiz.map((q, qIdx) => {
                  const chosen = quizAnswers[qIdx];
                  const answered = chosen !== undefined;
                  return (
                    <div key={qIdx} className="p-4 border border-slate-200 rounded-lg space-y-2 text-xs">
                      <div className="font-semibold text-sm text-slate-900">
                        {qIdx + 1}. {q.question}
                      </div>
                      <div className="space-y-1.5">
                        {q.options.map((opt, oIdx) => {
                          const isSelected = chosen === oIdx;
                          const isCorrect = oIdx === q.correctIndex;
                          let cls = 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50';
                          if (answered) {
                            if (isCorrect) cls = 'border-emerald-300 bg-emerald-50 text-emerald-900 font-semibold';
                            else if (isSelected) cls = 'border-rose-300 bg-rose-50 text-rose-900';
                          }
                          return (
                            <button
                              key={oIdx}
                              type="button"
                              onClick={() =>
                                setQuizAnswers((prev) => ({ ...prev, [qIdx]: oIdx }))
                              }
                              className={`w-full text-left px-3 py-2 rounded-md border transition-colors ${cls}`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                      {answered && (
                        <div className="pt-1 text-slate-700 flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>เฉลย: {q.explanation}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-6 space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-violet-600" />
                  7. Checklist ปฏิบัติงานสำหรับพนักงาน
                </h3>
                <div className="space-y-2 text-xs">
                  {coachPlan.checklist.map((item, i) => (
                    <label key={i} className="flex items-start gap-2 cursor-pointer text-slate-700">
                      <input
                        type="checkbox"
                        checked={Boolean(checklistState[i])}
                        onChange={() =>
                          setChecklistState((prev) => ({ ...prev, [i]: !prev[i] }))
                        }
                        className="mt-0.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                      />
                      <span className={checklistState[i] ? 'line-through text-slate-400' : ''}>
                        {item}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3 text-xs">
                <h3 className="text-base font-bold text-slate-900">8. คำแนะนำสำหรับ Trainer (Coaching Guide)</h3>
                <p className="text-slate-700">
                  <span className="font-semibold text-slate-900">น้ำเสียงการสอนงาน: </span>
                  {coachPlan.trainerGuidance.coachingTone}
                </p>
                <div>
                  <div className="font-semibold text-slate-800 mb-1">ลำดับขั้นตอนการสอนงาน</div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-700">
                    {coachPlan.trainerGuidance.sessionStructure.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ol>
                </div>
                <div>
                  <div className="font-semibold text-slate-800 mb-1">คำถามชวนคิดระหว่าง Coaching</div>
                  <ul className="list-disc list-inside space-y-1 text-slate-700">
                    {coachPlan.trainerGuidance.followUpQuestions.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
