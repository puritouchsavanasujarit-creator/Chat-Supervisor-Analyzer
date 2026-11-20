export type PageId =
  | 'dashboard'
  | 'audit'
  | 'reports'
  | 'agents'
  | 'problems'
  | 'coaching'
  | 'history'
  | 'settings';

export type CriterionKey =
  | 'accuracy'
  | 'politeness'
  | 'completeness'
  | 'communication'
  | 'problem_solving'
  | 'order_confirmation'
  | 'response_speed'
  | 'closing';

export type ScenarioType =
  | 'product_inquiry'
  | 'order_placement'
  | 'shipping_inquiry'
  | 'product_complaint'
  | 'hesitant_customer';

export type SeverityLevel = 'Critical' | 'High' | 'Medium' | 'Low';

export type QualityLevel = 'ดีเยี่ยม' | 'ดี' | 'พอใช้' | 'ต้องปรับปรุง' | 'วิกฤต';

export type CoachingStatus = 'รอดำเนินการ' | 'กำลัง Coaching' | 'ผ่านเกณฑ์แล้ว';

export interface QACriterionConfig {
  key: CriterionKey;
  order: number;
  name: string;
  maxScore: number;
  description: string;
  watchFor: string;
}

export interface ScenarioConfig {
  id: ScenarioType;
  label: string;
  specificSkill: string;
  description: string;
  keyCheckpoints: string[];
}

export interface CriterionEvaluation {
  key: CriterionKey;
  name: string;
  maxScore: number;
  evaluable: boolean;
  score: number | null;
  unavailableReason: string;
  reason: string;
  evidence: string[];
  improvement: string;
}

export interface DetectedProblem {
  id: string;
  title: string;
  category: string;
  severity: SeverityLevel;
  evidenceQuote: string;
  impact: string;
  relatedCriterion: string;
}

export interface ImprovementItem {
  skillToDevelop: string;
  behaviorToAdjust: string;
  reason: string;
  developmentMethod: string;
}

export interface SolutionSection {
  resolutionSteps: string[];
  recommendedPhrases: string[];
  phrasesToAvoid: string[];
  chatTechniques: string[];
  preSendChecklist: string[];
}

export interface CoachingPlanSection {
  goal: string;
  skillsToPractice: string[];
  exercises: string[];
  duration: string;
  metrics: string[];
  followUpMethod: string;
}

export interface SummarySection {
  strengths: string[];
  weaknesses: string[];
  problemsFound: string[];
  top3Priorities: string[];
  recommendedCoachingApproach: string;
}

export interface ScenarioSkillEvaluation {
  scenarioType: ScenarioType;
  scenarioLabel: string;
  specificSkillName: string;
  assessment: string;
  evidence: string[];
  recommendation: string;
}

export interface AuditAnalysisResult {
  overall: {
    totalScore: number;
    maxEvaluableScore: number;
    configuredTotalMaxScore: number;
    evaluableCount: number;
    totalCriteriaCount: number;
    percentage: number;
    qualityLevel: QualityLevel;
    summary: string;
    hasTimestamps: boolean;
    timestampNote: string;
  };
  scenarioAnalysis: ScenarioSkillEvaluation;
  scoreBreakdown: CriterionEvaluation[];
  problemDetection: DetectedProblem[];
  improvements: ImprovementItem[];
  solution: SolutionSection;
  coachingPlan: CoachingPlanSection;
  summary: SummarySection;
  aiLimitations: string[];
}

export interface QAAuditRecord {
  id: string;
  agentId: string;
  agentName: string;
  employeeCode: string;
  team: string;
  auditDate: string; // YYYY-MM-DD
  auditorName: string;
  scenarioInput: ScenarioType | 'auto';
  detectedScenario: ScenarioType;
  importMethod: 'paste' | 'csv' | 'txt' | 'excel';
  rawTranscript: string;
  analysis: AuditAnalysisResult;
  createdAt: string;
}

export interface AgentProfile {
  id: string;
  name: string;
  employeeCode: string;
  team: string;
  role: string;
  coachingStatus: CoachingStatus;
  trainerNote: string;
}

export interface QASettings {
  defaultAuditorName: string;
  passThresholdPercent: number;
  criteriaWeights: Record<CriterionKey, number>;
}

export interface AICoachExercise {
  title: string;
  customerMessage: string;
  context: string;
  goal: string;
  sampleIdealReply: string;
}

export interface AICoachRoleplay {
  scenarioTitle: string;
  customerPersona: string;
  difficulty: 'ระดับเริ่มต้น' | 'ระดับกลาง' | 'ระดับสูง';
  openingMessage: string;
  keyObjectives: string[];
  evaluationTips: string[];
}

export interface AICoachDialogueExample {
  topic: string;
  badExample: string;
  goodExample: string;
  explanation: string;
}

export interface AICoachQuizItem {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface AICoachPlanResponse {
  agentName: string;
  generatedAt: string;
  problemAnalysis: {
    coreIssues: string[];
    rootCauses: string[];
    evidenceSummary: string;
  };
  individualPlan: {
    goal: string;
    duration: string;
    milestones: string[];
    kpiTargets: string[];
  };
  exercises: AICoachExercise[];
  roleplayScenarios: AICoachRoleplay[];
  dialogueExamples: AICoachDialogueExample[];
  quiz: AICoachQuizItem[];
  checklist: string[];
  trainerGuidance: {
    coachingTone: string;
    sessionStructure: string[];
    followUpQuestions: string[];
    redFlagsToWatch: string[];
  };
}
