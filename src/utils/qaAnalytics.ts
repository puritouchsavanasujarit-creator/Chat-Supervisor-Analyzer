import type {
  AgentProfile,
  CriterionKey,
  DetectedProblem,
  QAAuditRecord,
  ScenarioType,
} from '../types/qa.ts';
import { DEFAULT_CRITERIA, SCENARIO_MAP } from '../constants/qaConfig.ts';

export interface CriterionAverage {
  key: CriterionKey;
  name: string;
  avgScore: number;
  maxScore: number;
  avgPercent: number;
  evaluatedCount: number;
}

export interface MonthlyTrendPoint {
  monthKey: string;
  monthLabel: string;
  avgPercentage: number;
  auditCount: number;
  passRate: number;
}

export interface AggregatedProblem {
  title: string;
  category: string;
  severity: DetectedProblem['severity'];
  relatedCriterion: string;
  count: number;
  latestExample: string;
  affectedAgents: string[];
}

export interface TeamPerformance {
  team: string;
  agentCount: number;
  auditCount: number;
  avgPercentage: number;
  passRate: number;
}

export interface AgentSummaryStats {
  agent: AgentProfile;
  auditCount: number;
  avgPercentage: number;
  passRate: number;
  latestAuditDate: string | null;
  topStrengths: string[];
  topWeaknesses: string[];
  frequentProblems: string[];
  criteriaAverages: CriterionAverage[];
  scoreHistory: { id: string; date: string; percentage: number; scenarioLabel: string }[];
}

const THAI_MONTHS: Record<string, string> = {
  '01': 'ม.ค.',
  '02': 'ก.พ.',
  '03': 'มี.ค.',
  '04': 'เม.ย.',
  '05': 'พ.ค.',
  '06': 'มิ.ย.',
  '07': 'ก.ค.',
  '08': 'ส.ค.',
  '09': 'ก.ย.',
  '10': 'ต.ค.',
  '11': 'พ.ย.',
  '12': 'ธ.ค.',
};

export function computeDashboardStats(
  audits: QAAuditRecord[],
  agents: AgentProfile[],
  passThreshold: number
) {
  const totalAudits = audits.length;
  const avgPercentage =
    totalAudits > 0
      ? Math.round(
          (audits.reduce((sum, a) => sum + a.analysis.overall.percentage, 0) / totalAudits) * 10
        ) / 10
      : 0;

  const passedCount = audits.filter((a) => a.analysis.overall.percentage >= passThreshold).length;
  const passRate = totalAudits > 0 ? Math.round((passedCount / totalAudits) * 1000) / 10 : 0;

  // Criteria averages
  const criteriaAverages: CriterionAverage[] = DEFAULT_CRITERIA.map((cfg) => {
    const items = audits
      .map((a) => a.analysis.scoreBreakdown.find((b) => b.key === cfg.key))
      .filter((b): b is NonNullable<typeof b> => Boolean(b && b.evaluable && b.score !== null));

    const evaluatedCount = items.length;
    const avgScore =
      evaluatedCount > 0
        ? Math.round((items.reduce((s, i) => s + (i.score ?? 0), 0) / evaluatedCount) * 10) / 10
        : 0;
    const avgPercent =
      evaluatedCount > 0
        ? Math.round(
            (items.reduce((s, i) => s + ((i.score ?? 0) / i.maxScore) * 100, 0) / evaluatedCount) *
              10
          ) / 10
        : 0;

    return {
      key: cfg.key,
      name: cfg.name,
      avgScore,
      maxScore: cfg.maxScore,
      avgPercent,
      evaluatedCount,
    };
  });

  // Monthly trend
  const byMonth = new Map<string, QAAuditRecord[]>();
  for (const a of audits) {
    const mk = a.auditDate.slice(0, 7);
    const list = byMonth.get(mk) ?? [];
    list.push(a);
    byMonth.set(mk, list);
  }

  const monthlyTrend: MonthlyTrendPoint[] = Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, list]) => {
      const [year, m] = monthKey.split('-');
      const avg =
        Math.round(
          (list.reduce((s, x) => s + x.analysis.overall.percentage, 0) / list.length) * 10
        ) / 10;
      const pCount = list.filter((x) => x.analysis.overall.percentage >= passThreshold).length;
      return {
        monthKey,
        monthLabel: `${THAI_MONTHS[m] ?? m} ${year.slice(2)}`,
        avgPercentage: avg,
        auditCount: list.length,
        passRate: Math.round((pCount / list.length) * 1000) / 10,
      };
    });

  // Improvement delta (latest month vs previous month)
  let improvementTrendDelta = 0;
  if (monthlyTrend.length >= 2) {
    const prev = monthlyTrend[monthlyTrend.length - 2].avgPercentage;
    const curr = monthlyTrend[monthlyTrend.length - 1].avgPercentage;
    improvementTrendDelta = Math.round((curr - prev) * 10) / 10;
  }

  // Top problems aggregated
  const problemMap = new Map<string, AggregatedProblem>();
  for (const audit of audits) {
    for (const p of audit.analysis.problemDetection) {
      const key = p.title.trim();
      const existing = problemMap.get(key);
      if (existing) {
        existing.count += 1;
        if (!existing.affectedAgents.includes(audit.agentName)) {
          existing.affectedAgents.push(audit.agentName);
        }
      } else {
        problemMap.set(key, {
          title: p.title,
          category: p.category,
          severity: p.severity,
          relatedCriterion: p.relatedCriterion,
          count: 1,
          latestExample: p.evidenceQuote,
          affectedAgents: [audit.agentName],
        });
      }
    }
  }

  const severityOrder: Record<DetectedProblem['severity'], number> = {
    Critical: 4,
    High: 3,
    Medium: 2,
    Low: 1,
  };

  const aggregatedProblems = Array.from(problemMap.values()).sort(
    (a, b) => b.count - a.count || severityOrder[b.severity] - severityOrder[a.severity]
  );

  // Team performance
  const teams = Array.from(new Set(agents.map((a) => a.team)));
  const teamPerformance: TeamPerformance[] = teams.map((team) => {
    const teamAgents = agents.filter((a) => a.team === team);
    const teamAudits = audits.filter((a) => a.team === team);
    const tAvg =
      teamAudits.length > 0
        ? Math.round(
            (teamAudits.reduce((s, x) => s + x.analysis.overall.percentage, 0) / teamAudits.length) *
              10
          ) / 10
        : 0;
    const tPass =
      teamAudits.length > 0
        ? Math.round(
            (teamAudits.filter((x) => x.analysis.overall.percentage >= passThreshold).length /
              teamAudits.length) *
              1000
          ) / 10
        : 0;
    return {
      team,
      agentCount: teamAgents.length,
      auditCount: teamAudits.length,
      avgPercentage: tAvg,
      passRate: tPass,
    };
  });

  // Coaching status counts
  const coachingCounts = {
    'ผ่านเกณฑ์แล้ว': agents.filter((a) => a.coachingStatus === 'ผ่านเกณฑ์แล้ว').length,
    'กำลัง Coaching': agents.filter((a) => a.coachingStatus === 'กำลัง Coaching').length,
    'รอดำเนินการ': agents.filter((a) => a.coachingStatus === 'รอดำเนินการ').length,
  };

  // Scenario distribution
  const scenarioBreakdown = (Object.keys(SCENARIO_MAP) as ScenarioType[]).map((sc) => {
    const list = audits.filter((a) => a.detectedScenario === sc);
    const avg =
      list.length > 0
        ? Math.round(
            (list.reduce((s, x) => s + x.analysis.overall.percentage, 0) / list.length) * 10
          ) / 10
        : 0;
    return {
      scenario: sc,
      label: SCENARIO_MAP[sc].label,
      specificSkill: SCENARIO_MAP[sc].specificSkill,
      count: list.length,
      avgPercentage: avg,
    };
  });

  return {
    totalAudits,
    totalAgents: agents.length,
    avgPercentage,
    passRate,
    improvementTrendDelta,
    criteriaAverages,
    monthlyTrend,
    aggregatedProblems,
    teamPerformance,
    coachingCounts,
    scenarioBreakdown,
  };
}

export function computeAgentStats(
  agent: AgentProfile,
  audits: QAAuditRecord[],
  passThreshold: number
): AgentSummaryStats {
  const agentAudits = audits
    .filter((a) => a.agentId === agent.id || a.agentName === agent.name)
    .sort((a, b) => b.auditDate.localeCompare(a.auditDate));

  const auditCount = agentAudits.length;
  const avgPercentage =
    auditCount > 0
      ? Math.round(
          (agentAudits.reduce((s, x) => s + x.analysis.overall.percentage, 0) / auditCount) * 10
        ) / 10
      : 0;

  const passed = agentAudits.filter((a) => a.analysis.overall.percentage >= passThreshold).length;
  const passRate = auditCount > 0 ? Math.round((passed / auditCount) * 1000) / 10 : 0;

  const strengthsSet = new Set<string>();
  const weaknessesSet = new Set<string>();
  const problemsSet = new Set<string>();

  for (const a of agentAudits) {
    a.analysis.summary.strengths.forEach((s) => strengthsSet.add(s));
    a.analysis.summary.weaknesses.forEach((w) => weaknessesSet.add(w));
    a.analysis.problemDetection.forEach((p) => problemsSet.add(`${p.title} (${p.severity})`));
  }

  const criteriaAverages: CriterionAverage[] = DEFAULT_CRITERIA.map((cfg) => {
    const items = agentAudits
      .map((a) => a.analysis.scoreBreakdown.find((b) => b.key === cfg.key))
      .filter((b): b is NonNullable<typeof b> => Boolean(b && b.evaluable && b.score !== null));

    const evaluatedCount = items.length;
    const avgScore =
      evaluatedCount > 0
        ? Math.round((items.reduce((s, i) => s + (i.score ?? 0), 0) / evaluatedCount) * 10) / 10
        : 0;
    const avgPercent =
      evaluatedCount > 0
        ? Math.round(
            (items.reduce((s, i) => s + ((i.score ?? 0) / i.maxScore) * 100, 0) / evaluatedCount) *
              10
          ) / 10
        : 0;

    return {
      key: cfg.key,
      name: cfg.name,
      avgScore,
      maxScore: cfg.maxScore,
      avgPercent,
      evaluatedCount,
    };
  });

  const scoreHistory = [...agentAudits]
    .sort((a, b) => a.auditDate.localeCompare(b.auditDate))
    .map((a) => ({
      id: a.id,
      date: a.auditDate,
      percentage: a.analysis.overall.percentage,
      scenarioLabel: SCENARIO_MAP[a.detectedScenario]?.label ?? a.detectedScenario,
    }));

  return {
    agent,
    auditCount,
    avgPercentage,
    passRate,
    latestAuditDate: agentAudits[0]?.auditDate ?? null,
    topStrengths: Array.from(strengthsSet).slice(0, 5),
    topWeaknesses: Array.from(weaknessesSet).slice(0, 5),
    frequentProblems: Array.from(problemsSet).slice(0, 5),
    criteriaAverages,
    scoreHistory,
  };
}
