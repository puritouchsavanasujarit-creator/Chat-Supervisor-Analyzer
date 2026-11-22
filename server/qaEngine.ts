import { generateClaudeJson } from './anthropic.ts';
import type {
  AICoachPlanResponse,
  AuditAnalysisResult,
  CriterionEvaluation,
  CriterionKey,
  QualityLevel,
  ScenarioType,
} from '../src/types/qa.ts';
import { DEFAULT_CRITERIA, SCENARIO_MAP } from '../src/constants/qaConfig.ts';
import { detectTimestampsInText } from '../src/utils/timestamp.ts';

// JSON Schema primitives for the Claude tool input schema.
const Type = {
  OBJECT: 'object',
  STRING: 'string',
  NUMBER: 'number',
  INTEGER: 'integer',
  BOOLEAN: 'boolean',
  ARRAY: 'array',
} as const;

function getQualityLevel(percentage: number): QualityLevel {
  if (percentage >= 90) return 'ดีเยี่ยม';
  if (percentage >= 80) return 'ดี';
  if (percentage >= 70) return 'พอใช้';
  if (percentage >= 55) return 'ต้องปรับปรุง';
  return 'วิกฤต';
}

export interface AnalyzeChatInput {
  agentName: string;
  employeeCode: string;
  auditDate: string;
  auditorName: string;
  scenarioInput: ScenarioType | 'auto';
  transcript: string;
  criteriaWeights: Record<CriterionKey, number>;
}

export async function analyzeChatWithClaude(input: AnalyzeChatInput): Promise<{
  detectedScenario: ScenarioType;
  analysis: AuditAnalysisResult;
}> {
  const hasTimestamps = detectTimestampsInText(input.transcript);

  const criteriaSpecText = DEFAULT_CRITERIA.map((c) => {
    const w = input.criteriaWeights[c.key] ?? c.maxScore;
    return `- key: "${c.key}" | ชื่อ: "${c.name}" | คะแนนเต็ม: ${w} | เกณฑ์: ${c.description} (${c.watchFor})`;
  }).join('\n');

  const scenariosSpecText = Object.values(SCENARIO_MAP)
    .map(
      (s) =>
        `- "${s.id}": ${s.label} | ทักษะเฉพาะ: ${s.specificSkill} | จุดตรวจสอบ: ${s.keyCheckpoints.join(', ')}`
    )
    .join('\n');

  const systemInstruction = `คุณคือหัวหน้าทีม QA และผู้เชี่ยวชาญด้าน Customer Service คุณภาพสูง
หน้าที่ของคุณคือวิเคราะห์บทสนทนาแชทระหว่างลูกค้ากับพนักงานอย่างเป็นธรรม ตรงไปตรงมา และสร้างสรรค์ เพื่อพัฒนาทักษะของพนักงาน

กฎเหล็กที่ต้องปฏิบัติตามอย่างเคร่งครัด (AI Rules):
1. วิเคราะห์ตามหลักฐานข้อความจริงจากบทสนทนาที่ได้รับเท่านั้น ห้ามแต่งเติมข้อมูลสินค้า ราคา โปรโมชั่น หรือสถานะจัดส่งที่ไม่มีในบทสนทนา
2. ยกข้อความจริง (verbatim quote) จากบทสนทนามาเป็นหลักฐานในทุกเกณฑ์และทุกปัญหาที่พบ
3. หากบทสนทนาไม่มีข้อมูลเพียงพอสำหรับเกณฑ์ใด ให้ตั้งค่า evaluable = false, score = 0 (ระบบจะแปลงเป็น null) และระบุเหตุผลใน unavailableReason โดยห้ามเดาหรือสร้างหลักฐานเอง
4. กฎเวลา (CRITICAL): สถานะการตรวจพบ Timestamp ของบทสนทนานี้คือ hasTimestamps = ${hasTimestamps ? 'true' : 'false'}.
   - หาก hasTimestamps เป็น false คุณต้องตั้งค่าเกณฑ์ "response_speed" ให้ evaluable = false อย่างเด็ดขาด และระบุ unavailableReason ว่า "ไม่สามารถประเมินได้ เนื่องจากไม่มีข้อมูลเวลา (Timestamp) ของแต่ละข้อความในบทสนทนา"
   - หาก hasTimestamps เป็น true ให้คำนวณระยะห่างเวลาจริงระหว่างข้อความลูกค้าและคำตอบพนักงานมาอ้างอิงในหลักฐาน
5. แยกข้อเท็จจริง (หลักฐานในแชท) ออกจากข้อเสนอแนะ ไม่ใช้ความรู้สึกส่วนตัว และเน้นแนวทางพัฒนาเชิงบวกมากกว่าการตำหนิ
6. ตอบเป็นภาษาไทยทั้งหมด (ยกเว้น enum ค่ามาตรฐานเช่น key และ severity: Critical/High/Medium/Low)`;

  const userPrompt = `ข้อมูลการตรวจสอบ:
- พนักงาน: ${input.agentName} (รหัส: ${input.employeeCode || '-'})
- วันที่ตรวจ: ${input.auditDate}
- ผู้ตรวจ QA: ${input.auditorName}
- ประเภทสถานการณ์ที่ผู้ตรวจเลือก: ${
    input.scenarioInput === 'auto'
      ? 'ให้ AI จัดประเภทอัตโนมัติจาก 5 สถานการณ์'
      : SCENARIO_MAP[input.scenarioInput].label
  }
- มีข้อมูลเวลา (Timestamp) ในแชทหรือไม่: ${hasTimestamps ? 'มี' : 'ไม่มี'}

เกณฑ์การประเมินทั้ง 8 ข้อ:
${criteriaSpecText}

ประเภทสถานการณ์ทั้ง 5 แบบและทักษะเฉพาะ:
${scenariosSpecText}

บทสนทนาที่ต้องตรวจสอบ:
"""
${input.transcript}
"""

โปรดประเมินบทสนทนานี้อย่างละเอียดครบทุกหัวข้อตาม JSON Schema ที่กำหนด`;

  const rawText = (
    await generateClaudeJson({
      toolName: 'submit_audit_analysis',
      systemInstruction,
      userPrompt,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overallSummary: { type: Type.STRING },
          detectedScenario: {
            type: Type.STRING,
            enum: [
              'product_inquiry',
              'order_placement',
              'shipping_inquiry',
              'product_complaint',
              'hesitant_customer',
            ],
          },
          scenarioAnalysis: {
            type: Type.OBJECT,
            properties: {
              assessment: { type: Type.STRING },
              evidence: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendation: { type: Type.STRING },
            },
            required: ['assessment', 'evidence', 'recommendation'],
          },
          scoreBreakdown: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                key: {
                  type: Type.STRING,
                  enum: [
                    'accuracy',
                    'politeness',
                    'completeness',
                    'communication',
                    'problem_solving',
                    'order_confirmation',
                    'response_speed',
                    'closing',
                  ],
                },
                evaluable: { type: Type.BOOLEAN },
                score: { type: Type.NUMBER },
                unavailableReason: { type: Type.STRING },
                reason: { type: Type.STRING },
                evidence: { type: Type.ARRAY, items: { type: Type.STRING } },
                improvement: { type: Type.STRING },
              },
              required: ['key', 'evaluable', 'score', 'unavailableReason', 'reason', 'evidence', 'improvement'],
            },
          },
          problemDetection: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                category: { type: Type.STRING },
                severity: { type: Type.STRING, enum: ['Critical', 'High', 'Medium', 'Low'] },
                evidenceQuote: { type: Type.STRING },
                impact: { type: Type.STRING },
                relatedCriterion: { type: Type.STRING },
              },
              required: ['title', 'category', 'severity', 'evidenceQuote', 'impact', 'relatedCriterion'],
            },
          },
          improvements: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                skillToDevelop: { type: Type.STRING },
                behaviorToAdjust: { type: Type.STRING },
                reason: { type: Type.STRING },
                developmentMethod: { type: Type.STRING },
              },
              required: ['skillToDevelop', 'behaviorToAdjust', 'reason', 'developmentMethod'],
            },
          },
          solution: {
            type: Type.OBJECT,
            properties: {
              resolutionSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendedPhrases: { type: Type.ARRAY, items: { type: Type.STRING } },
              phrasesToAvoid: { type: Type.ARRAY, items: { type: Type.STRING } },
              chatTechniques: { type: Type.ARRAY, items: { type: Type.STRING } },
              preSendChecklist: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: [
              'resolutionSteps',
              'recommendedPhrases',
              'phrasesToAvoid',
              'chatTechniques',
              'preSendChecklist',
            ],
          },
          coachingPlan: {
            type: Type.OBJECT,
            properties: {
              goal: { type: Type.STRING },
              skillsToPractice: { type: Type.ARRAY, items: { type: Type.STRING } },
              exercises: { type: Type.ARRAY, items: { type: Type.STRING } },
              duration: { type: Type.STRING },
              metrics: { type: Type.ARRAY, items: { type: Type.STRING } },
              followUpMethod: { type: Type.STRING },
            },
            required: ['goal', 'skillsToPractice', 'exercises', 'duration', 'metrics', 'followUpMethod'],
          },
          summary: {
            type: Type.OBJECT,
            properties: {
              strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
              weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
              problemsFound: { type: Type.ARRAY, items: { type: Type.STRING } },
              top3Priorities: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendedCoachingApproach: { type: Type.STRING },
            },
            required: [
              'strengths',
              'weaknesses',
              'problemsFound',
              'top3Priorities',
              'recommendedCoachingApproach',
            ],
          },
          aiLimitations: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: [
          'overallSummary',
          'detectedScenario',
          'scenarioAnalysis',
          'scoreBreakdown',
          'problemDetection',
          'improvements',
          'solution',
          'coachingPlan',
          'summary',
          'aiLimitations',
        ],
      },
    })
  ).trim();
  if (!rawText) {
    throw new Error('AI ไม่ได้ส่งข้อมูลกลับมา กรุณาลองใหม่อีกครั้ง');
  }

  const parsed = JSON.parse(rawText) as {
    overallSummary: string;
    detectedScenario: ScenarioType;
    scenarioAnalysis: {
      assessment: string;
      evidence: string[];
      recommendation: string;
    };
    scoreBreakdown: Array<{
      key: CriterionKey;
      evaluable: boolean;
      score: number;
      unavailableReason: string;
      reason: string;
      evidence: string[];
      improvement: string;
    }>;
    problemDetection: Array<{
      title: string;
      category: string;
      severity: 'Critical' | 'High' | 'Medium' | 'Low';
      evidenceQuote: string;
      impact: string;
      relatedCriterion: string;
    }>;
    improvements: AuditAnalysisResult['improvements'];
    solution: AuditAnalysisResult['solution'];
    coachingPlan: AuditAnalysisResult['coachingPlan'];
    summary: AuditAnalysisResult['summary'];
    aiLimitations: string[];
  };

  const finalScenario: ScenarioType =
    input.scenarioInput === 'auto' ? parsed.detectedScenario : input.scenarioInput;
  const scenarioCfg = SCENARIO_MAP[finalScenario];

  // Deterministic scoring & strict timestamp rule enforcement
  const normalizedBreakdown: CriterionEvaluation[] = DEFAULT_CRITERIA.map((cfg) => {
    const maxScore = input.criteriaWeights[cfg.key] ?? cfg.maxScore;
    const found = parsed.scoreBreakdown.find((b) => b.key === cfg.key);

    if (cfg.key === 'response_speed' && !hasTimestamps) {
      return {
        key: cfg.key,
        name: cfg.name,
        maxScore,
        evaluable: false,
        score: null,
        unavailableReason:
          'ไม่สามารถประเมินได้ เนื่องจากไม่มีข้อมูลเวลา (Timestamp) ของข้อความในบทสนทนา',
        reason: 'งดประเมินตามกฎ QA เพื่อความเป็นธรรม (ไม่พบ Timestamp ใน Log)',
        evidence: [],
        improvement: 'แนบ Log แชทที่มีเวลาส่งข้อความกำกับเมื่อต้องการตรวจวัด SLA ความเร็วในการตอบ',
      };
    }

    if (!found || !found.evaluable) {
      return {
        key: cfg.key,
        name: cfg.name,
        maxScore,
        evaluable: false,
        score: null,
        unavailableReason:
          found?.unavailableReason || 'ข้อมูลในบทสนทนาไม่เพียงพอสำหรับการประเมินเกณฑ์นี้',
        reason: found?.reason || 'ไม่มีหลักฐานเพียงพอในบทสนทนา',
        evidence: found?.evidence ?? [],
        improvement: found?.improvement || 'รวบรวมบทสนทนาที่ครบถ้วนมากขึ้นในการตรวจครั้งถัดไป',
      };
    }

    const clampedScore = Math.max(0, Math.min(maxScore, Math.round(found.score * 10) / 10));
    return {
      key: cfg.key,
      name: cfg.name,
      maxScore,
      evaluable: true,
      score: clampedScore,
      unavailableReason: '',
      reason: found.reason,
      evidence: found.evidence ?? [],
      improvement: found.improvement,
    };
  });

  const evaluableList = normalizedBreakdown.filter((b) => b.evaluable && b.score !== null);
  const totalScore =
    Math.round(evaluableList.reduce((sum, b) => sum + (b.score ?? 0), 0) * 10) / 10;
  const maxEvaluableScore = evaluableList.reduce((sum, b) => sum + b.maxScore, 0);
  const configuredTotalMaxScore = normalizedBreakdown.reduce((sum, b) => sum + b.maxScore, 0);
  const percentage =
    maxEvaluableScore > 0 ? Math.round((totalScore / maxEvaluableScore) * 1000) / 10 : 0;

  const limitations = [...(parsed.aiLimitations ?? [])];
  if (!hasTimestamps) {
    const tsMsg =
      'ไม่พบ Timestamp ในบทสนทนา จึงไม่สามารถประเมินเกณฑ์ความรวดเร็วในการตอบได้อย่างเด็ดขาด';
    if (!limitations.some((l) => l.includes('Timestamp') || l.includes('เวลา'))) {
      limitations.unshift(tsMsg);
    }
  }

  const analysis: AuditAnalysisResult = {
    overall: {
      totalScore,
      maxEvaluableScore,
      configuredTotalMaxScore,
      evaluableCount: evaluableList.length,
      totalCriteriaCount: normalizedBreakdown.length,
      percentage,
      qualityLevel: getQualityLevel(percentage),
      summary: parsed.overallSummary,
      hasTimestamps,
      timestampNote: hasTimestamps
        ? 'ตรวจพบ Timestamp ในบทสนทนา ประเมินความเร็วในการตอบจากเวลาจริง'
        : 'ไม่มี Timestamp ในบทสนทนา งดประเมินความเร็วในการตอบและคำนวณ % จากเกณฑ์ที่ประเมินได้เท่านั้น',
    },
    scenarioAnalysis: {
      scenarioType: finalScenario,
      scenarioLabel: scenarioCfg.label,
      specificSkillName: scenarioCfg.specificSkill,
      assessment: parsed.scenarioAnalysis.assessment,
      evidence: parsed.scenarioAnalysis.evidence ?? [],
      recommendation: parsed.scenarioAnalysis.recommendation,
    },
    scoreBreakdown: normalizedBreakdown,
    problemDetection: parsed.problemDetection.map((p, i) => ({
      id: `PRB-${Date.now()}-${i + 1}`,
      ...p,
    })),
    improvements: parsed.improvements ?? [],
    solution: parsed.solution,
    coachingPlan: parsed.coachingPlan,
    summary: parsed.summary,
    aiLimitations: limitations,
  };

  return { detectedScenario: finalScenario, analysis };
}

export interface GenerateCoachInput {
  agentName: string;
  team: string;
  avgPercentage: number;
  weaknesses: string[];
  frequentProblems: string[];
  focusTopic?: string;
}

export async function generateAICoachPlan(
  input: GenerateCoachInput
): Promise<AICoachPlanResponse> {

  const systemInstruction = `คุณคือ AI Coach สำหรับหัวหน้าทีม QA และ Trainer ฝ่าย Customer Service
หน้าที่ของคุณคือสร้างชุดเครื่องมือ Coaching เฉพาะบุคคลที่นำไปใช้งานฝึกสอนได้ทันที
หลักการสำคัญ:
- อ้างอิงปัญหาจริงและจุดอ่อนที่พบของพนักงานเท่านั้น
- เน้นแนวทางพัฒนาเชิงบวก สร้างทักษะ และฝึกปฏิบัติจริงได้ทันที
- ใช้ภาษาไทยที่ชัดเจน เป็นระบบ และเหมาะสมกับการสอนงานในองค์กร`;

  const userPrompt = `ข้อมูลพนักงานสำหรับจัดทำชุด Coaching:
- ชื่อพนักงาน: ${input.agentName}
- ทีม: ${input.team}
- คะแนน QA เฉลี่ยปัจจุบัน: ${input.avgPercentage}%
- จุดอ่อนที่พบจากการตรวจแชท: ${input.weaknesses.length > 0 ? input.weaknesses.join('; ') : 'ต้องการพัฒนาทักษะการปิดการขายและความครบถ้วน'}
- ปัญหาที่พบบ่อย: ${input.frequentProblems.length > 0 ? input.frequentProblems.join('; ') : 'ทวนข้อมูลออเดอร์และสรุปปิดแชท'}
- หัวข้อที่ Trainer ต้องการเน้นเป็นพิเศษ: ${input.focusTopic || 'พัฒนาทักษะการตอบแชทตามเกณฑ์ QA 8 ข้อให้ได้ >= 85%'}

โปรดสร้างชุด Coaching ครบทั้ง 8 ส่วนตาม Schema:
1. วิเคราะห์ปัญหาของพนักงาน
2. แผนพัฒนาเฉพาะบุคคล
3. แบบฝึกตอบแชท (อย่างน้อย 2 ข้อ)
4. สถานการณ์จำลอง Roleplay (อย่างน้อย 2 สถานการณ์)
5. บทสนทนาตัวอย่าง เปรียบเทียบที่ไม่ดี vs ที่เหมาะสม (อย่างน้อย 2 ตัวอย่าง)
6. แบบทดสอบความเข้าใจพร้อมเฉลย (อย่างน้อย 3 ข้อ)
7. Checklist ปฏิบัติงานก่อนส่งแชท (5-6 ข้อ)
8. คำแนะนำสำหรับ Trainer`;

  const rawText = (
    await generateClaudeJson({
      toolName: 'submit_coach_plan',
      systemInstruction,
      userPrompt,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          problemAnalysis: {
            type: Type.OBJECT,
            properties: {
              coreIssues: { type: Type.ARRAY, items: { type: Type.STRING } },
              rootCauses: { type: Type.ARRAY, items: { type: Type.STRING } },
              evidenceSummary: { type: Type.STRING },
            },
            required: ['coreIssues', 'rootCauses', 'evidenceSummary'],
          },
          individualPlan: {
            type: Type.OBJECT,
            properties: {
              goal: { type: Type.STRING },
              duration: { type: Type.STRING },
              milestones: { type: Type.ARRAY, items: { type: Type.STRING } },
              kpiTargets: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['goal', 'duration', 'milestones', 'kpiTargets'],
          },
          exercises: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                customerMessage: { type: Type.STRING },
                context: { type: Type.STRING },
                goal: { type: Type.STRING },
                sampleIdealReply: { type: Type.STRING },
              },
              required: ['title', 'customerMessage', 'context', 'goal', 'sampleIdealReply'],
            },
          },
          roleplayScenarios: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                scenarioTitle: { type: Type.STRING },
                customerPersona: { type: Type.STRING },
                difficulty: {
                  type: Type.STRING,
                  enum: ['ระดับเริ่มต้น', 'ระดับกลาง', 'ระดับสูง'],
                },
                openingMessage: { type: Type.STRING },
                keyObjectives: { type: Type.ARRAY, items: { type: Type.STRING } },
                evaluationTips: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: [
                'scenarioTitle',
                'customerPersona',
                'difficulty',
                'openingMessage',
                'keyObjectives',
                'evaluationTips',
              ],
            },
          },
          dialogueExamples: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                topic: { type: Type.STRING },
                badExample: { type: Type.STRING },
                goodExample: { type: Type.STRING },
                explanation: { type: Type.STRING },
              },
              required: ['topic', 'badExample', 'goodExample', 'explanation'],
            },
          },
          quiz: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctIndex: { type: Type.INTEGER },
                explanation: { type: Type.STRING },
              },
              required: ['question', 'options', 'correctIndex', 'explanation'],
            },
          },
          checklist: { type: Type.ARRAY, items: { type: Type.STRING } },
          trainerGuidance: {
            type: Type.OBJECT,
            properties: {
              coachingTone: { type: Type.STRING },
              sessionStructure: { type: Type.ARRAY, items: { type: Type.STRING } },
              followUpQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
              redFlagsToWatch: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['coachingTone', 'sessionStructure', 'followUpQuestions', 'redFlagsToWatch'],
          },
        },
        required: [
          'problemAnalysis',
          'individualPlan',
          'exercises',
          'roleplayScenarios',
          'dialogueExamples',
          'quiz',
          'checklist',
          'trainerGuidance',
        ],
      },
    })
  ).trim();
  if (!rawText) {
    throw new Error('AI Coach ไม่สามารถสร้างแผนได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง');
  }

  const parsed = JSON.parse(rawText) as Omit<AICoachPlanResponse, 'agentName' | 'generatedAt'>;
  return {
    agentName: input.agentName,
    generatedAt: new Date().toISOString(),
    ...parsed,
  };
}
