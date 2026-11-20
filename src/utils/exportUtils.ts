import type { QAAuditRecord } from '../types/qa.ts';
import { SCENARIO_MAP } from '../constants/qaConfig.ts';

function escapeCsvCell(val: string | number | null | undefined): string {
  const s = val === null || val === undefined ? '' : String(val);
  if (s.includes('"') || s.includes(',') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function exportAuditsToCsv(audits: QAAuditRecord[], filename = 'chat-qa-reports.csv'): void {
  const headers = [
    'รหัสรายงาน',
    'วันที่ตรวจ',
    'ชื่อพนักงาน',
    'รหัสพนักงาน',
    'ทีม',
    'ผู้ตรวจ QA',
    'ประเภทสถานการณ์',
    'คะแนนที่ได้',
    'คะแนนเต็มที่ประเมินได้',
    'เปอร์เซ็นต์ (%)',
    'ระดับคุณภาพ',
    'ความถูกต้องของข้อมูล (20)',
    'มารยาทและความสุภาพ (15)',
    'ความครบถ้วนของคำตอบ (15)',
    'ทักษะการสื่อสาร (10)',
    'การแก้ไขปัญหาและข้อร้องเรียน (10)',
    'การยืนยันคำสั่งซื้อ (15)',
    'ความรวดเร็วในการตอบ (10)',
    'การปิดการสนทนา (5)',
    'ปัญหาที่ตรวจพบ',
    'สรุปผลการประเมิน',
  ];

  const rows = audits.map((a) => {
    const mapScore = (key: string) => {
      const item = a.analysis.scoreBreakdown.find((b) => b.key === key);
      if (!item || !item.evaluable || item.score === null) return 'ไม่สามารถประเมินได้';
      return `${item.score}/${item.maxScore}`;
    };

    const problems = a.analysis.problemDetection
      .map((p) => `[${p.severity}] ${p.title}`)
      .join(' | ');

    return [
      a.id,
      a.auditDate,
      a.agentName,
      a.employeeCode,
      a.team,
      a.auditorName,
      SCENARIO_MAP[a.detectedScenario]?.label ?? a.detectedScenario,
      a.analysis.overall.totalScore,
      a.analysis.overall.maxEvaluableScore,
      a.analysis.overall.percentage,
      a.analysis.overall.qualityLevel,
      mapScore('accuracy'),
      mapScore('politeness'),
      mapScore('completeness'),
      mapScore('communication'),
      mapScore('problem_solving'),
      mapScore('order_confirmation'),
      mapScore('response_speed'),
      mapScore('closing'),
      problems || 'ไม่พบปัญหาสำคัญ',
      a.analysis.overall.summary,
    ]
      .map(escapeCsvCell)
      .join(',');
  });

  // Add UTF-8 BOM so Thai renders cleanly in Microsoft Excel
  const csvContent = '\uFEFF' + [headers.map(escapeCsvCell).join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportSingleReportMarkdown(audit: QAAuditRecord): void {
  const { analysis } = audit;
  const lines: string[] = [
    `# รายงานผลการประเมินคุณภาพแชท (Chat QA Report)`,
    `- **รหัสรายงาน:** ${audit.id}`,
    `- **พนักงาน:** ${audit.agentName} (${audit.employeeCode || '-'}) · ${audit.team}`,
    `- **วันที่ตรวจ:** ${audit.auditDate} · **ผู้ตรวจ:** ${audit.auditorName}`,
    `- **ประเภทสถานการณ์:** ${analysis.scenarioAnalysis.scenarioLabel} (${analysis.scenarioAnalysis.specificSkillName})`,
    '',
    `## A. Overall Score`,
    `- **คะแนนรวม:** ${analysis.overall.totalScore} / ${analysis.overall.maxEvaluableScore} (${analysis.overall.percentage}%)`,
    `- **ระดับคุณภาพ:** ${analysis.overall.qualityLevel}`,
    `- **สรุป:** ${analysis.overall.summary}`,
    '',
    `## B. Score Breakdown`,
    ...analysis.scoreBreakdown.map(
      (b) =>
        `### ${b.name} — ${b.evaluable && b.score !== null ? `${b.score}/${b.maxScore}` : 'ไม่สามารถประเมินได้'}\n- เหตุผล: ${b.evaluable ? b.reason : b.unavailableReason}\n- หลักฐาน: ${b.evidence.join(' / ') || '-'}\n- จุดปรับปรุง: ${b.improvement}`
    ),
    '',
    `## C. Problem Detection`,
    ...(analysis.problemDetection.length > 0
      ? analysis.problemDetection.map(
          (p) => `- **[${p.severity}] ${p.title}** (${p.category}): "${p.evidenceQuote}" → ผลกระทบ: ${p.impact}`
        )
      : ['- ไม่พบปัญหาสำคัญจากหลักฐานในบทสนทนา']),
    '',
    `## D. Improvement`,
    ...analysis.improvements.map(
      (imp) => `- **${imp.skillToDevelop}**: ${imp.behaviorToAdjust} (วิธีพัฒนา: ${imp.developmentMethod})`
    ),
    '',
    `## E. Solution`,
    `- **วิธีแก้ปัญหา:** ${analysis.solution.resolutionSteps.join(' | ')}`,
    `- **ตัวอย่างข้อความที่เหมาะสม:** ${analysis.solution.recommendedPhrases.join(' | ')}`,
    `- **ตัวอย่างข้อความที่ควรหลีกเลี่ยง:** ${analysis.solution.phrasesToAvoid.join(' | ')}`,
    '',
    `## F. Coaching Plan`,
    `- **เป้าหมาย:** ${analysis.coachingPlan.goal}`,
    `- **ระยะเวลา:** ${analysis.coachingPlan.duration}`,
    `- **แบบฝึกหัด:** ${analysis.coachingPlan.exercises.join(' | ')}`,
    `- **วิธีติดตามผล:** ${analysis.coachingPlan.followUpMethod}`,
    '',
    `## G. Summary`,
    `- **จุดแข็ง:** ${analysis.summary.strengths.join(', ')}`,
    `- **จุดอ่อน:** ${analysis.summary.weaknesses.join(', ')}`,
    `- **3 สิ่งที่ควรปรับปรุงอันดับแรก:** ${analysis.summary.top3Priorities.join(' / ')}`,
  ];

  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `QA-Report-${audit.id}-${audit.agentName}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
