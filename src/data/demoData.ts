import type {
  AuditAnalysisResult,
  CriterionEvaluation,
  CriterionKey,
  DetectedProblem,
  QAAuditRecord,
  QualityLevel,
  ScenarioType,
} from '../types/qa.ts';
import { DEFAULT_CRITERIA, SCENARIO_MAP } from '../constants/qaConfig.ts';

function getQualityLevel(percentage: number): QualityLevel {
  if (percentage >= 90) return 'ดีเยี่ยม';
  if (percentage >= 80) return 'ดี';
  if (percentage >= 70) return 'พอใช้';
  if (percentage >= 55) return 'ต้องปรับปรุง';
  return 'วิกฤต';
}

interface DemoSeedInput {
  id: string;
  agentId: string;
  agentName: string;
  employeeCode: string;
  team: string;
  auditDate: string;
  auditorName: string;
  scenario: ScenarioType;
  hasTimestamps: boolean;
  transcript: string;
  scores: Record<CriterionKey, number | null>;
  problems: DetectedProblem[];
  strengths: string[];
  weaknesses: string[];
  top3Priorities: string[];
  summaryText: string;
  goal: string;
}

function buildDemoAnalysis(seed: DemoSeedInput): AuditAnalysisResult {
  const breakdown: CriterionEvaluation[] = DEFAULT_CRITERIA.map((c) => {
    const val = seed.scores[c.key];
    const isSpeedNoTs = c.key === 'response_speed' && !seed.hasTimestamps;
    const evaluable = val !== null && !isSpeedNoTs;
    const actualScore = evaluable ? val : null;

    let reason = '';
    let evidence: string[] = [];
    let improvement = '';

    if (!evaluable) {
      reason = isSpeedNoTs
        ? 'ไม่สามารถประเมินได้ เนื่องจากไม่มีข้อมูลเวลา (Timestamp) ของข้อความในบทสนทนา'
        : 'ไม่มีหลักฐานในบทสนทนาเพียงพอสำหรับประเมินเกณฑ์นี้';
      improvement = isSpeedNoTs
        ? 'แนบ Log ที่มี Timestamp ทุกข้อความเมื่อส่งตรวจความรวดเร็วในการตอบ'
        : 'บันทึกข้อมูลส่วนที่เกี่ยวข้องให้ครบถ้วนเมื่อสนทนา';
    } else {
      const ratio = (actualScore ?? 0) / c.maxScore;
      if (ratio >= 0.9) {
        reason = `พนักงานปฏิบัติตามเกณฑ์${c.name}ได้ครบถ้วนชัดเจน มีหลักฐานเชิงประจักษ์ในบทสนทนา`;
        evidence = [`อ้างอิงจากบทสนทนาของ ${seed.agentName} ในหมวด ${SCENARIO_MAP[seed.scenario].label}`];
        improvement = 'รักษามาตรฐานการตอบและนำไปเป็นแนวทางตัวอย่างให้ทีม';
      } else if (ratio >= 0.7) {
        reason = `ทำได้ดีในภาพรวม แต่ยังมีจุดรายละเอียดปลีกย่อยใน${c.name}ที่ควรเติมเต็ม`;
        evidence = [`พบการตอบตามเกณฑ์บางส่วนแต่ยังไม่ครอบคลุมทุกประเด็นในแชท`];
        improvement = `ทบทวน Checklist ด้าน${c.name}ก่อนกดส่งข้อความ`;
      } else {
        reason = `พบข้อบกพร่องในด้าน${c.name}จากข้อความจริงที่ตอบลูกค้า`;
        evidence = seed.problems
          .filter((p) => p.relatedCriterion === c.name)
          .map((p) => p.evidenceQuote);
        if (evidence.length === 0) {
          evidence = ['ข้อความตอบกลับยังขาดรายละเอียดสำคัญตามเกณฑ์ที่กำหนด'];
        }
        improvement = `ฝึกทบทวนและปรับปรุงการตอบในหัวข้อ${c.name}อย่างเร่งด่วน`;
      }
    }

    return {
      key: c.key,
      name: c.name,
      maxScore: c.maxScore,
      evaluable,
      score: actualScore,
      unavailableReason: evaluable ? '' : reason,
      reason,
      evidence,
      improvement,
    };
  });

  const evaluableItems = breakdown.filter((b) => b.evaluable && b.score !== null);
  const totalScore = evaluableItems.reduce((sum, b) => sum + (b.score ?? 0), 0);
  const maxEvaluableScore = evaluableItems.reduce((sum, b) => sum + b.maxScore, 0);
  const percentage =
    maxEvaluableScore > 0 ? Math.round((totalScore / maxEvaluableScore) * 1000) / 10 : 0;

  const scenarioCfg = SCENARIO_MAP[seed.scenario];

  return {
    overall: {
      totalScore,
      maxEvaluableScore,
      configuredTotalMaxScore: 100,
      evaluableCount: evaluableItems.length,
      totalCriteriaCount: breakdown.length,
      percentage,
      qualityLevel: getQualityLevel(percentage),
      summary: seed.summaryText,
      hasTimestamps: seed.hasTimestamps,
      timestampNote: seed.hasTimestamps
        ? 'ตรวจพบข้อมูลเวลา (Timestamp) ในบทสนทนา จึงประเมินเกณฑ์ความรวดเร็วในการตอบตามเวลาจริง'
        : 'ไม่พบข้อมูลเวลา (Timestamp) ในบทสนทนา ระบบงดประเมินเกณฑ์ความรวดเร็วในการตอบและคำนวณสัดส่วนจากเกณฑ์ที่ประเมินได้เท่านั้น',
    },
    scenarioAnalysis: {
      scenarioType: seed.scenario,
      scenarioLabel: scenarioCfg.label,
      specificSkillName: scenarioCfg.specificSkill,
      assessment: `ประเมินทักษะเฉพาะด้าน "${scenarioCfg.specificSkill}" จากบทสนทนาจริง พบว่าพนักงาน${percentage >= 80 ? 'ดำเนินการตามขั้นตอนสำคัญได้ดี' : 'ยังมีช่องว่างในการเก็บรายละเอียดและสื่อสารเชิงรุก'}`,
      evidence: [seed.transcript.split('\n')[1] || seed.transcript.slice(0, 120)],
      recommendation: scenarioCfg.keyCheckpoints.join(' · '),
    },
    scoreBreakdown: breakdown,
    problemDetection: seed.problems,
    improvements: seed.weaknesses.map((w, idx) => ({
      skillToDevelop: idx === 0 ? scenarioCfg.specificSkill : 'ทักษะการทวนข้อมูลและปิดแชท',
      behaviorToAdjust: w,
      reason: 'ส่งผลโดยตรงต่อความมั่นใจของลูกค้าและความถูกต้องของการส่งมอบงาน',
      developmentMethod: 'ฝึกซ้อมจากบทสนทนาตัวอย่างและใช้ Checklist ก่อนส่งข้อความทุกครั้ง',
    })),
    solution: {
      resolutionSteps: [
        'อ่านคำถามลูกค้าให้ครบทุกประโยคก่อนเริ่มพิมพ์ตอบ',
        'ตอบครบประเด็นหลักพร้อมสรุปเป็นข้อให้อ่านง่าย',
        'ทวนข้อมูลออเดอร์หรือขั้นตอนถัดไปและกล่าวขอบคุณก่อนปิดสนทนา',
      ],
      recommendedPhrases: [
        'สวัสดีค่ะ/ครับ ยินดีดูแลและตรวจสอบข้อมูลให้นะคะ/ครับ',
        'ขออนุญาตทวนรายการสั่งซื้อและที่อยู่จัดส่งเพื่อให้ถูกต้องครบถ้วนนะคะ/ครับ',
        'หากมีข้อมูลสอบถามเพิ่มเติม สามารถทักเข้ามาได้ตลอดเลยนะคะ/ครับ ขอบพระคุณค่ะ/ครับ',
      ],
      phrasesToAvoid: [
        'รอหน่อยนะครับ / เดี๋ยวเช็กให้ (โดยไม่แจ้งระยะเวลาที่ชัดเจน)',
        'ส่งมาแค่นี้เช็กไม่ได้ครับ (ควรขอข้อมูลเพิ่มเติมอย่างสุภาพ)',
        'โอเคครับ จบ (ปิดบทสนทนาสั้นเกินไป ไม่มีสรุปขั้นตอนถัดไป)',
      ],
      chatTechniques: [
        'ใช้เทคนิค 3 ส่วน: รับทราบความรู้สึก → ให้ข้อมูลชัดเจน → แจ้งขั้นตอนถัดไป',
        'แบ่งย่อหน้าหรือใช้ข้อย่อยเมื่อต้องแจ้งข้อมูลหลายรายการ',
      ],
      preSendChecklist: [
        'ตอบครบทุกคำถามที่ลูกค้าถามแล้วหรือยัง',
        'ตรวจสอบราคา โปรโมชั่น และสต็อกตรงตามจริงแล้วหรือยัง',
        'ทวนรายการสินค้า จำนวน ยอดเงิน และที่อยู่/เบอร์โทรครบแล้วหรือยัง',
        'ใช้น้ำเสียงสุภาพ เป็นมิตร และแจ้งขั้นตอนถัดไปก่อนปิดแชทแล้วหรือยัง',
      ],
    },
    coachingPlan: {
      goal: seed.goal,
      skillsToPractice: [scenarioCfg.specificSkill, 'การสื่อสารเชิงบวกและการสรุปความ'],
      exercises: [
        'ฝึกตอบแชทจำลอง 5 เคสในสถานการณ์ ' + scenarioCfg.label,
        'เขียนคำตอบโดยใช้ Pre-send Checklist และตรวจทานกับหัวหน้าทีม QA',
      ],
      duration: '14 วัน (ติดตามผลรายสัปดาห์)',
      metrics: ['คะแนน QA เฉลี่ย >= 85%', 'ลดข้อผิดพลาดซ้ำในเกณฑ์ที่ตกหล่นเหลือ 0 เคส'],
      followUpMethod: 'สุ่มตรวจแชทจริง 5 บทสนทนา/สัปดาห์ และจัด Coaching Review 15 นาที',
    },
    summary: {
      strengths: seed.strengths,
      weaknesses: seed.weaknesses,
      problemsFound: seed.problems.map((p) => `${p.title} (${p.severity})`),
      top3Priorities: seed.top3Priorities,
      recommendedCoachingApproach: 'เน้น Coaching เชิงสร้างสรรค์ผ่าน Roleplay และเทียบคำตอบก่อน-หลัง',
    },
    aiLimitations: seed.hasTimestamps
      ? []
      : ['ไม่มีข้อมูล Timestamp ในบทสนทนา จึงไม่สามารถประเมินความรวดเร็วในการตอบ (10 คะแนน) ได้'],
  };
}

const DEMO_SEEDS: DemoSeedInput[] = [
  {
    id: 'AUD-2026-001',
    agentId: 'agent-01',
    agentName: 'นันทิชา จันตา',
    employeeCode: 'CS-101',
    team: 'ทีม Inbound & Sales',
    auditDate: '2026-11-18',
    auditorName: 'หัวหน้าทีม QA (คุณธนัท)',
    scenario: 'product_inquiry',
    hasTimestamps: true,
    transcript: `[09:10] ลูกค้า: สอบถามเครื่องชงกาแฟรุ่น Barista Mini ค่ะ ใช้กับแคปซูล Nespresso ได้ไหม แล้วมีรับประกันกี่ปีคะ
[09:11] พนักงาน: สวัสดีค่ะ เครื่องชงกาแฟรุ่น Barista Mini รองรับแคปซูลขนาดมาตรฐาน Nespresso ได้เลยค่ะ และมาพร้อมรับประกันศูนย์ไทย 2 ปีเต็มค่ะ
[09:13] ลูกค้า: ถ้าสั่งวันนี้มีโปรอะไรไหมคะ
[09:14] พนักงาน: สั่งซื้อวันนี้รับฟรีแก้วเอสเพรสโซ่ 2 ใบ และส่วนลดค่าส่งฟรีทั่วประเทศค่ะ ราคาเครื่อง 3,490 บาท สนใจรับสีขาวหรือสีดำดีคะ`,
    scores: {
      accuracy: 19,
      politeness: 15,
      completeness: 14,
      communication: 9,
      problem_solving: 9,
      order_confirmation: 13,
      response_speed: 10,
      closing: 5,
    },
    problems: [],
    strengths: ['ตอบครบทุกคำถามในข้อความเดียว', 'ตอบรวดเร็วภายใน 1 นาที', 'แนะนำตัวเลือกสีเพื่อต่อยอดการปิดการขาย'],
    weaknesses: ['ควรระบุเงื่อนไขการลงทะเบียนรับประกันเพิ่มเติมเล็กน้อย'],
    top3Priorities: ['เพิ่มลิงก์หรือวิธีลงทะเบียนประกัน', 'คงความเร็วและน้ำเสียงที่เป็นมิตร', 'แชร์บทสนทนาเป็นตัวอย่างให้ทีม'],
    summaryText: 'พนักงานให้ข้อมูลสินค้าครบถ้วน แม่นยำ สุภาพ และตอบกลับอย่างรวดเร็วใน 1 นาที',
    goal: 'รักษามาตรฐานคะแนน >= 90% และพัฒนาทักษะ Upsell',
  },
  {
    id: 'AUD-2026-002',
    agentId: 'agent-02',
    agentName: 'อภิญญา ถาพรม',
    employeeCode: 'CS-102',
    team: 'ทีม Inbound & Sales',
    auditDate: '2026-11-17',
    auditorName: 'หัวหน้าทีม QA (คุณธนัท)',
    scenario: 'order_placement',
    hasTimestamps: false,
    transcript: `ลูกค้า: สั่งเซรั่ม 2 ขวดค่ะ ส่งที่ 45/2 บางบัวทอง นนทบุรี 11110 เก็บเงินปลายทาง
พนักงาน: ได้เลยครับ รับออเดอร์แล้ว เดี๋ยวจัดส่งให้นะครับ
ลูกค้า: ต้องใช้เบอร์โทรไหมคะ แล้วรวมเงินเท่าไหร่
พนักงาน: ขอเบอร์โทรด้วยค่ะ ยอดรวม 890 บาทค่ะ`,
    scores: {
      accuracy: 17,
      politeness: 13,
      completeness: 10,
      communication: 8,
      problem_solving: 8,
      order_confirmation: 8,
      response_speed: null,
      closing: 3,
    },
    problems: [
      {
        id: 'PRB-002-1',
        title: 'ไม่ทวนรายการสั่งซื้อและไม่ได้ขอเบอร์โทรตั้งแต่แรก',
        category: 'การยืนยันคำสั่งซื้อ',
        severity: 'High',
        evidenceQuote: 'พนักงาน: ได้เลยครับ รับออเดอร์แล้ว เดี๋ยวจัดส่งให้นะครับ',
        impact: 'เสี่ยงต่อการจัดส่งล่าช้าหรือขนส่งติดต่อผู้รับปลายทางไม่ได้',
        relatedCriterion: 'การยืนยันคำสั่งซื้อ',
      },
      {
        id: 'PRB-002-2',
        title: 'ขาดการปิดการสนทนาและแจ้งวันจัดส่ง',
        category: 'การปิดการสนทนา',
        severity: 'Medium',
        evidenceQuote: 'พนักงาน: ขอเบอร์โทรด้วยค่ะ ยอดรวม 890 บาทค่ะ',
        impact: 'ลูกค้าไม่ทราบกำหนดการจัดส่งและขั้นต่อไปหลังแจ้งเบอร์',
        relatedCriterion: 'การปิดการสนทนา',
      },
    ],
    strengths: ['ตอบสุภาพและให้ยอดรวมถูกต้องเมื่อลูกค้าถามซ้ำ'],
    weaknesses: ['ไม่ทวนชื่อ-ที่อยู่-จำนวน-ยอดเงินก่อนยืนยันออเดอร์', 'ไม่ขอเบอร์โทรตั้งแต่ขั้นตอนรับออเดอร์'],
    top3Priorities: ['ใช้ Template ทวนออเดอร์ครบ 5 องค์ประกอบ', 'ขอเบอร์โทรศัพท์ทุกครั้งสำหรับ COD', 'ปิดแชทด้วยการแจ้งระยะเวลาจัดส่งและขอบคุณ'],
    summaryText: 'พนักงานรับออเดอร์โดยไม่ทวนรายละเอียดและขาดการขอเบอร์ติดต่อ ทำให้ลูกค้าต้องถามซ้ำ (ไม่ได้ประเมินความเร็วเนื่องจากไม่มี Timestamp)',
    goal: 'เพิ่มคะแนนการยืนยันคำสั่งซื้อจาก 8/15 เป็น >= 13/15 ภายใน 2 สัปดาห์',
  },
  {
    id: 'AUD-2026-003',
    agentId: 'agent-03',
    agentName: 'กฤษชฎา ธณิจปัญญกุณ',
    employeeCode: 'CS-103',
    team: 'ทีม After-Sales & Claim',
    auditDate: '2026-11-16',
    auditorName: 'หัวหน้าทีม QA (คุณธนัท)',
    scenario: 'product_complaint',
    hasTimestamps: true,
    transcript: `[15:20] ลูกค้า: ได้รับของแล้วแต่ฝาแตกค่ะ แพ็คมาไม่ดีเลย
[15:29] พนักงาน: ก่อนส่งทางร้านเช็กแล้วนะครับ น่าจะเป็นที่ขนส่ง เคลมได้แต่ลูกค้าต้องถ่ายวิดีโอตอนแกะกล่องมาด้วย ไม่งั้นเคลมไม่ได้ครับ`,
    scores: {
      accuracy: 15,
      politeness: 8,
      completeness: 9,
      communication: 7,
      problem_solving: 5,
      order_confirmation: 8,
      response_speed: 6,
      closing: 2,
    },
    problems: [
      {
        id: 'PRB-003-1',
        title: 'โยนความผิดและขาดการขออภัย/แสดงความเห็นใจในเคสร้องเรียน',
        category: 'การแก้ไขปัญหาและมารยาท',
        severity: 'Critical',
        evidenceQuote: 'ก่อนส่งทางร้านเช็กแล้วนะครับ น่าจะเป็นที่ขนส่ง ... ไม่งั้นเคลมไม่ได้ครับ',
        impact: 'ทำให้ลูกค้ารู้สึกถูกปฏิเสธความรับผิดชอบและเสี่ยงเกิดดราม่ารีวิวเชิงลบ',
        relatedCriterion: 'การแก้ไขปัญหาและข้อร้องเรียน',
      },
      {
        id: 'PRB-003-2',
        title: 'ตอบกลับล่าช้าเกินเกณฑ์เร่งด่วนสำหรับเคสร้องเรียน (9 นาที)',
        category: 'ความรวดเร็วในการตอบ',
        severity: 'Medium',
        evidenceQuote: '[15:20] ลูกค้า ... -> [15:29] พนักงาน ...',
        impact: 'เพิ่มความไม่พอใจให้ลูกค้าที่กำลังประสบปัญหาสินค้าเสียหาย',
        relatedCriterion: 'ความรวดเร็วในการตอบ',
      },
    ],
    strengths: ['แจ้งเงื่อนไขหลักฐานการเคลมตรงตามนโยบาย'],
    weaknesses: ['ไม่มีคำขออภัยหรือ Empathy', 'ใช้คำพูดเชิงผลักภาระให้ลูกค้าและขนส่ง', 'ไม่มีการปิดการสนทนาหรือเสนอทางช่วยตรวจสอบ'],
    top3Priorities: ['ฝึกประโยคขออภัยและ Empathy ในเคสร้องเรียน', 'เปลี่ยนคำพูดปฏิเสธแข็งกระด้างเป็นทางเลือกแก้ไข', 'ติดตามขอรูปถ่ายความเสียหายเพื่อช่วยพิจารณาก่อนปฏิเสธ'],
    summaryText: 'พบปัญหาสำคัญด้านมารยาทและการรับมือข้อร้องเรียน พนักงานตอบเชิงแก้ตัวและปฏิเสธทันทีโดยไม่แสดงความเห็นใจ',
    goal: 'แก้ไขทัศนคติและรูปแบบภาษาในเคสร้องเรียน ให้ผ่านเกณฑ์ >= 80% ใน 14 วัน',
  },
  {
    id: 'AUD-2026-004',
    agentId: 'agent-04',
    agentName: 'ไชยญณัฏฐ์ ประสานทอง',
    employeeCode: 'CS-104',
    team: 'ทีม After-Sales & Claim',
    auditDate: '2026-11-15',
    auditorName: 'หัวหน้าทีม QA (คุณธนัท)',
    scenario: 'product_complaint',
    hasTimestamps: true,
    transcript: `[11:01] ลูกค้า: ส่งสีมาผิดค่ะ สั่งสีดำได้สีขาวมา เสียเวลามาก
[11:02] พนักงาน: สวัสดีครับ ทางร้านต้องขออภัยเป็นอย่างสูงสำหรับความผิดพลาดในการจัดส่งนะครับ เข้าใจเลยครับว่าทำให้คุณลูกค้าเสียเวลา
[11:03] พนักงาน: เพื่อรีบจัดส่งสีดำที่ถูกต้องให้ใหม่ทันที รบกวนส่งภาพสินค้าที่ได้รับพร้อมเลขคำสั่งซื้อเพื่อให้แอดมินตรวจสอบและส่งเปลี่ยนให้ฟรีโดยไม่มีค่าใช้จ่ายครับ
[11:06] ลูกค้า: #ORD-9910 ส่งรูปให้แล้วค่ะ
[11:07] พนักงาน: ขอบคุณครับ ยืนยันออเดอร์ #ORD-9910 เรียบร้อย ทางร้านจะส่งสีดำออกไปในรอบวันนี้ และให้ขนส่งรับชิ้นเดิมกลับโดยไม่คิดค่าบริการครับ ขออภัยอีกครั้งและขอบคุณที่แจ้งให้เราดูแลนะครับ`,
    scores: {
      accuracy: 20,
      politeness: 15,
      completeness: 15,
      communication: 10,
      problem_solving: 10,
      order_confirmation: 14,
      response_speed: 10,
      closing: 5,
    },
    problems: [],
    strengths: ['ขออภัยทันทีด้วยน้ำเสียงจริงใจ', 'แก้ปัญหาจบไวภายใน 6 นาที', 'ยืนยันเลขคำสั่งซื้อและขั้นตอนรับคืนครบถ้วน'],
    weaknesses: ['ไม่มีจุดบกพร่องสำคัญ'],
    top3Priorities: ['รักษามาตรฐานการรับมือเคสร้องเรียน', 'เป็น Mentor ช่วยฝึกทีม After-Sales', 'เก็บเป็น Best Practice Case'],
    summaryText: 'การจัดการข้อร้องเรียนระดับดีเยี่ยม ครบถ้วนทุกมิติ ทั้งความเร็ว ความสุภาพ และการแก้ปัญหาอย่างเป็นระบบ',
    goal: 'รักษาคุณภาพระดับดีเยี่ยมและถ่ายทอดเทคนิคให้ทีม',
  },
  {
    id: 'AUD-2026-005',
    agentId: 'agent-06',
    agentName: 'ณัฐพล ลักษณาการ',
    employeeCode: 'CS-106',
    team: 'ทีม Logistics & Tracking',
    auditDate: '2026-11-12',
    auditorName: 'หัวหน้าทีม QA (คุณนิชา)',
    scenario: 'shipping_inquiry',
    hasTimestamps: false,
    transcript: `ลูกค้า: สั่งของไป 3 วันแล้วยังไม่ได้รับเลยค่ะ
พนักงาน: ขอชื่อกับเบอร์โทรหน่อยครับ
ลูกค้า: ปิยะดา 086-555-9900
พนักงาน: กำลังส่งอยู่ครับ รอหน่อยนะครับ
ลูกค้า: ขอเลขพัสดุด้วยค่ะ
พนักงาน: TH0192837465B ของแฟลชครับ`,
    scores: {
      accuracy: 16,
      politeness: 11,
      completeness: 9,
      communication: 7,
      problem_solving: 7,
      order_confirmation: 11,
      response_speed: null,
      closing: 2,
    },
    problems: [
      {
        id: 'PRB-005-1',
        title: 'ไม่ให้เลข Tracking และสถานะล่าสุดตั้งแต่ครั้งแรกที่ตรวจสอบ',
        category: 'ความครบถ้วนของคำตอบ',
        severity: 'High',
        evidenceQuote: 'พนักงาน: กำลังส่งอยู่ครับ รอหน่อยนะครับ',
        impact: 'ลูกค้าต้องถามขอเลขพัสดุซ้ำและไม่ทราบวันที่คาดว่าจะได้รับ',
        relatedCriterion: 'ความครบถ้วนของคำตอบ',
      },
      {
        id: 'PRB-005-2',
        title: 'คำตอบสั้นห้วนและไม่มีการปิดการสนทนา',
        category: 'การปิดการสนทนา',
        severity: 'Medium',
        evidenceQuote: 'พนักงาน: TH0192837465B ของแฟลชครับ',
        impact: 'สร้างประสบการณ์การบริการที่ไม่เป็นมืออาชีพ',
        relatedCriterion: 'การปิดการสนทนา',
      },
    ],
    strengths: ['ค้นหาและให้เลขพัสดุได้ถูกต้อง'],
    weaknesses: ['ต้องให้ลูกค้าถามซ้ำจึงค่อยส่งเลขพัสดุ', 'ไม่แจ้งสถานะปัจจุบันและลิงก์ติดตาม'],
    top3Priorities: ['ส่งเลข Tracking + สถานะล่าสุด + ชื่อขนส่งในข้อความเดียว', 'หลีกเลี่ยงคำว่า "รอหน่อยนะครับ"', 'ปิดแชทด้วยการแจ้งว่าจะช่วยติดตามหากล่าช้า'],
    summaryText: 'พนักงานตอบสั้นเกินไป ทำให้ลูกค้าต้องถามซ้ำขอเลขพัสดุและขาดการปิดสนทนา',
    goal: 'ปรับรูปแบบการแจ้งสถานะพัสดุให้ครบถ้วนใน 1 ข้อความ',
  },
  {
    id: 'AUD-2026-006',
    agentId: 'agent-08',
    agentName: 'เมธาวดี แย้มด้วง',
    employeeCode: 'CS-108',
    team: 'ทีม Inbound & Sales',
    auditDate: '2026-10-28',
    auditorName: 'หัวหน้าทีม QA (คุณธนัท)',
    scenario: 'hesitant_customer',
    hasTimestamps: true,
    transcript: `[13:40] ลูกค้า: รุ่นนี้แพงจังเลยค่ะ ขอคิดดูก่อนนะคะ
[13:43] พนักงาน: ค่ะ ถ้าสนใจทักมาใหม่ได้นะคะ`,
    scores: {
      accuracy: 16,
      politeness: 13,
      completeness: 8,
      communication: 7,
      problem_solving: 5,
      order_confirmation: 10,
      response_speed: 8,
      closing: 3,
    },
    problems: [
      {
        id: 'PRB-006-1',
        title: 'ไม่ถามความกังวลและไม่ได้นำเสนอคุณค่าหรือโปรโมชั่นเพื่อช่วยตัดสินใจ',
        category: 'การโน้มน้าวและปิดการขาย',
        severity: 'High',
        evidenceQuote: 'พนักงาน: ค่ะ ถ้าสนใจทักมาใหม่ได้นะคะ',
        impact: 'เสียโอกาสการขายโดยไม่ได้ทำความเข้าใจความต้องการจริงของลูกค้า',
        relatedCriterion: 'การแก้ไขปัญหาและข้อร้องเรียน',
      },
    ],
    strengths: ['สุภาพ ไม่กดดันลูกค้า'],
    weaknesses: ['ปล่อยผ่านลูกค้าลังเลทันทีโดยไม่ถามเหตุผลหรือความกังวล', 'ไม่ได้นำเสนอจุดเด่นหรือโปรผ่อนชำระ/ส่วนลด'],
    top3Priorities: ['ฝึกใช้คำถามเปิดเพื่อค้นหาความกังวลด้านราคา/ความคุ้มค่า', 'สรุป 3 จุดเด่นที่คุ้มค่าที่สุดของสินค้า', 'เสนอ Call-to-Action ที่นุ่มนวล'],
    summaryText: 'พนักงานปิดบทสนทนาเร็วเกินไปเมื่อลูกค้าลังเลเรื่องราคา ขาดทักษะการโน้มน้าวและอธิบายความคุ้มค่า',
    goal: 'ฝึกเทคนิค Value Selling เพื่อเพิ่มอัตราปิดการขายในเคสลูกค้าลังเล',
  },
  {
    id: 'AUD-2026-007',
    agentId: 'agent-05',
    agentName: 'จารุวรรณ คำศรี',
    employeeCode: 'CS-105',
    team: 'ทีม Inbound & Sales',
    auditDate: '2026-10-20',
    auditorName: 'หัวหน้าทีม QA (คุณนิชา)',
    scenario: 'product_inquiry',
    hasTimestamps: true,
    transcript: `[10:15] ลูกค้า: ผิวแพ้ง่ายใช้โฟมล้างหน้าตัวนี้ได้ไหมคะ มีแอลกอฮอล์กับน้ำหอมไหม แล้วขนาดกี่ ml คะ
[10:17] พนักงาน: ผิวแพ้ง่ายใช้ได้ค่ะ ไม่มีแอลกอฮอล์ค่ะ`,
    scores: {
      accuracy: 17,
      politeness: 13,
      completeness: 7,
      communication: 7,
      problem_solving: 7,
      order_confirmation: 11,
      response_speed: 9,
      closing: 2,
    },
    problems: [
      {
        id: 'PRB-007-1',
        title: 'ตกหล่นคำถามเรื่องน้ำหอมและปริมาณ (ml)',
        category: 'ความครบถ้วนของคำตอบ',
        severity: 'High',
        evidenceQuote: 'พนักงาน: ผิวแพ้ง่ายใช้ได้ค่ะ ไม่มีแอลกอฮอล์ค่ะ',
        impact: 'ลูกค้าไม่ได้รับข้อมูลครบ 3 ข้อที่ถาม ทำให้ตัดสินใจซื้อไม่ได้',
        relatedCriterion: 'ความครบถ้วนของคำตอบ',
      },
    ],
    strengths: ['ตอบไวภายใน 2 นาที', 'สุภาพ'],
    weaknesses: ['ตอบไม่ครบ 3 คำถามที่ลูกค้าพิมพ์มา', 'ไม่มีคำแนะนำต่อหรือปิดสนทนา'],
    top3Priorities: ['เช็กคำถามเป็นข้อย่อยทุกครั้งก่อนกดส่ง', 'ตอบครบทั้งส่วนผสมและปริมาณสินค้า', 'ชวนปิดการขายหรือสอบถามความต้องการเพิ่มเติม'],
    summaryText: 'พนักงานตอบเพียง 2 ใน 3 ประเด็นที่ลูกค้าสอบถาม ขาดข้อมูลเรื่องน้ำหอมและขนาดบรรจุ',
    goal: 'ตอบคำถามลูกค้าครบทุกประเด็น 100% ก่อนส่งข้อความ',
  },
  {
    id: 'AUD-2026-008',
    agentId: 'agent-07',
    agentName: 'อนุศักดิ์ พินิจดำ',
    employeeCode: 'CS-107',
    team: 'ทีม Logistics & Tracking',
    auditDate: '2026-10-14',
    auditorName: 'หัวหน้าทีม QA (คุณนิชา)',
    scenario: 'shipping_inquiry',
    hasTimestamps: true,
    transcript: `[16:05] ลูกค้า: รบกวนเช็กพัสดุออเดอร์ #ORD-7721 หน่อยค่ะ
[16:07] พนักงาน: สวัสดีครับ ตรวจสอบออเดอร์ #ORD-7721 ให้เรียบร้อยแล้วนะครับ ขณะนี้พัสดุอยู่ระหว่างนำจ่ายปลายทางเขตบางนา เลขพัสดุ KEX99812345 (Kerry Express) คาดว่าจะได้รับภายในวันนี้ก่อน 18.00 น. ครับ
[16:08] พนักงาน: หากเกินวันนี้ยังไม่ได้รับ ทักแจ้งแอดมินเพื่อประสานงานเร่งด่วนได้ทันทีเลยนะครับ ขอบคุณครับ`,
    scores: {
      accuracy: 20,
      politeness: 15,
      completeness: 15,
      communication: 10,
      problem_solving: 9,
      order_confirmation: 14,
      response_speed: 10,
      closing: 5,
    },
    problems: [],
    strengths: ['ให้ข้อมูลครบถ้วนในข้อความเดียว (สถานะ + เลขพัสดุ + ขนส่ง + เวลานำจ่าย)', 'มีแผนสำรองกรณีล่าช้า'],
    weaknesses: ['ไม่มีข้อบกพร่องสำคัญ'],
    top3Priorities: ['รักษามาตรฐานระดับดีเยี่ยม', 'ช่วยรีวิว Script ของทีม Logistics'],
    summaryText: 'การตอบสอบถามการจัดส่งครบถ้วน กระชับ ชัดเจน และรวดเร็วมาก',
    goal: 'รักษามาตรฐาน >= 90%',
  },
  {
    id: 'AUD-2026-009',
    agentId: 'agent-09',
    agentName: 'วิทูรย์ โชคชัย',
    employeeCode: 'CS-109',
    team: 'ทีม After-Sales & Claim',
    auditDate: '2026-09-25',
    auditorName: 'หัวหน้าทีม QA (คุณธนัท)',
    scenario: 'product_complaint',
    hasTimestamps: true,
    transcript: `[09:30] ลูกค้า: เครื่องปั่นเสียงดังผิดปกติเลยค่ะ เพิ่งซื้ออาทิตย์เดียว
[09:32] พนักงาน: ส่งเคลมได้ครับ แอดไลน์ฝ่ายเคลม @claimcenter แล้วส่งคลิปไปได้เลย`,
    scores: {
      accuracy: 16,
      politeness: 10,
      completeness: 10,
      communication: 7,
      problem_solving: 6,
      order_confirmation: 10,
      response_speed: 9,
      closing: 3,
    },
    problems: [
      {
        id: 'PRB-009-1',
        title: 'โยนช่องทางติดต่อโดยไม่ขออภัยและไม่แจ้งรายละเอียดการรับประกัน',
        category: 'มารยาทและการแก้ไขปัญหา',
        severity: 'Medium',
        evidenceQuote: 'พนักงาน: ส่งเคลมได้ครับ แอดไลน์ฝ่ายเคลม @claimcenter แล้วส่งคลิปไปได้เลย',
        impact: 'ลูกค้ารู้สึกถูกปัดให้ไปติดต่อเองโดยไม่ได้รับการดูแลเบื้องต้น',
        relatedCriterion: 'การแก้ไขปัญหาและข้อร้องเรียน',
      },
    ],
    strengths: ['ตอบรวดเร็วภายใน 2 นาที', 'ให้ช่องทางติดต่อเคลมได้ชัดเจน'],
    weaknesses: ['ขาดคำขออภัยเบื้องต้น', 'ไม่แจ้งระยะเวลาดำเนินการเคลมหรือข้อมูลที่ต้องเตรียม'],
    top3Priorities: ['กล่าวขออภัยและแสดงความห่วงใยก่อนส่งต่อ', 'สรุปรายการเอกสาร/ข้อมูลที่ต้องใช้ในการเคลมให้ครบ', 'ปิดการสนทนาอย่างสุภาพ'],
    summaryText: 'ตอบไวและตรงประเด็น แต่น้ำเสียงห้วนเกินไปและขาดขั้นตอนแสดงความเห็นใจก่อนส่งต่อ',
    goal: 'เพิ่มคำแสดงความเห็นใจและสรุปขั้นตอนเคลมให้ชัดเจน',
  },
  {
    id: 'AUD-2026-010',
    agentId: 'agent-10',
    agentName: 'ศุภชานันท์ สุเทพ',
    employeeCode: 'CS-110',
    team: 'ทีม Inbound & Sales',
    auditDate: '2026-09-18',
    auditorName: 'หัวหน้าทีม QA (คุณธนัท)',
    scenario: 'order_placement',
    hasTimestamps: true,
    transcript: `[11:40] ลูกค้า: รับกระเป๋าเป้สีกรมท่า 1 ใบค่ะ ส่งคุณกมลชนก 99/8 ซ.อารีย์ 1 พญาไท กทม 10400 โทร 089-111-2233 โอนเงินค่ะ
[11:42] พนักงาน: สวัสดีค่ะ ขออนุญาตทวนรายการสั่งซื้อนะคะ
1. กระเป๋าเป้รุ่น Urban สีกรมท่า จำนวน 1 ใบ ราคา 1,290 บาท (ส่งฟรี)
2. ผู้รับ: คุณกมลชนก 99/8 ซ.อารีย์ 1 พญาไท กทม. 10400 โทร 089-111-2233
ยอดโอนสุทธิ 1,290 บาท สามารถโอนเข้าบัญชี กสิกรไทย XXX-X-XXXXX-X แล้วส่งสลิปมาได้เลยนะคะ ขอบคุณค่ะ`,
    scores: {
      accuracy: 20,
      politeness: 15,
      completeness: 15,
      communication: 10,
      problem_solving: 9,
      order_confirmation: 15,
      response_speed: 9,
      closing: 5,
    },
    problems: [],
    strengths: ['ทวนรายการสินค้า จำนวน ราคา ที่อยู่ และเบอร์โทรครบถ้วนเป็นระเบียบ', 'อ่านง่ายมาก'],
    weaknesses: ['ไม่มีจุดบกพร่อง'],
    top3Priorities: ['รักษามาตรฐานการทวนออเดอร์แบบมีโครงสร้างชัดเจน'],
    summaryText: 'ตัวอย่างที่ดีเยี่ยมของการยืนยันคำสั่งซื้อ ทวนข้อมูลครบ 100% อ่านง่ายและสุภาพ',
    goal: 'รักษามาตรฐาน >= 92%',
  },
  {
    id: 'AUD-2026-011',
    agentId: 'agent-11',
    agentName: 'ขจรศักดิ์ สุวรรณภาญกูร',
    employeeCode: 'CS-111',
    team: 'ทีม Logistics & Tracking',
    auditDate: '2026-08-24',
    auditorName: 'หัวหน้าทีม QA (คุณนิชา)',
    scenario: 'shipping_inquiry',
    hasTimestamps: true,
    transcript: `[14:00] ลูกค้า: เปลี่ยนที่อยู่จัดส่งทันไหมคะ พอดีเพิ่งโอนเมื่อกี้
[14:04] พนักงาน: ขอเลขคำสั่งซื้อกับที่อยู่ใหม่หน่อยครับ จะเช็กให้ว่าแพ็กไปยัง`,
    scores: {
      accuracy: 16,
      politeness: 11,
      completeness: 11,
      communication: 7,
      problem_solving: 8,
      order_confirmation: 10,
      response_speed: 8,
      closing: 2,
    },
    problems: [
      {
        id: 'PRB-011-1',
        title: 'ใช้ภาษาพูดไม่เป็นทางการ ("แพ็กไปยัง") และขาดคำทักทาย',
        category: 'มารยาทและทักษะการสื่อสาร',
        severity: 'Low',
        evidenceQuote: 'พนักงาน: ขอเลขคำสั่งซื้อกับที่อยู่ใหม่หน่อยครับ จะเช็กให้ว่าแพ็กไปยัง',
        impact: 'ลดความเป็นมืออาชีพของแบรนด์เล็กน้อย',
        relatedCriterion: 'ทักษะการสื่อสาร',
      },
    ],
    strengths: ['สอบถามข้อมูลสำคัญได้ตรงประเด็น'],
    weaknesses: ['ใช้ภาษาพูดไม่สุภาพเล็กน้อย', 'ไม่ได้ทักทายและไม่ได้ขอเบอร์โทรใหม่หากมีการเปลี่ยนผู้รับ'],
    top3Priorities: ['ปรับคำพูดจากภาษาพูดเป็นภาษากึ่งทางการที่สุภาพ', 'ทวนที่อยู่ใหม่และเบอร์ติดต่อครบทุกครั้งที่แก้ไข'],
    summaryText: 'แก้ปัญหาได้ตรงประเด็นแต่ควรปรับถ้อยคำให้สุภาพและเป็นมืออาชีพมากขึ้น',
    goal: 'ปรับระดับภาษาและเพิ่มคำทักทาย/ปิดสนทนา',
  },
  {
    id: 'AUD-2026-012',
    agentId: 'agent-12',
    agentName: 'จตุพล มานพกวี',
    employeeCode: 'CS-112',
    team: 'ทีม After-Sales & Claim',
    auditDate: '2026-08-19',
    auditorName: 'หัวหน้าทีม QA (คุณธนัท)',
    scenario: 'hesitant_customer',
    hasTimestamps: true,
    transcript: `[17:10] ลูกค้า: กลัวซื้อไปแล้วใช้งานยากจังค่ะ มีประกันไหมคะ
[17:12] พนักงาน: สวัสดีครับ รุ่นนี้มีคู่มือภาษาไทยและวิดีโอสอนใช้งานให้ครับ พร้อมประกันศูนย์ 1 ปีเต็ม หากติดปัญหาทักสอบถามทีมงานได้ตลอดเลยครับ`,
    scores: {
      accuracy: 18,
      politeness: 14,
      completeness: 13,
      communication: 9,
      problem_solving: 8,
      order_confirmation: 12,
      response_speed: 9,
      closing: 4,
    },
    problems: [],
    strengths: ['คลายความกังวลเรื่องการใช้งานได้ดีและแจ้งเงื่อนไขประกันชัดเจน'],
    weaknesses: ['ควรปิดท้ายด้วยคำถามชวนตัดสินใจหรือเสนอโปรโมชั่นเพิ่มเติม'],
    top3Priorities: ['ฝึกเพิ่ม Call-to-Action ปิดการขายอย่างนุ่มนวล'],
    summaryText: 'ให้ข้อมูลสร้างความมั่นใจได้ดี เหลือเพียงต่อยอดปิดการขายให้ชัดเจนขึ้น',
    goal: 'พัฒนาทักษะปิดการขายให้ได้คะแนนรวม >= 88%',
  },
];

export const INITIAL_AUDITS: QAAuditRecord[] = DEMO_SEEDS.map((seed) => ({
  id: seed.id,
  agentId: seed.agentId,
  agentName: seed.agentName,
  employeeCode: seed.employeeCode,
  team: seed.team,
  auditDate: seed.auditDate,
  auditorName: seed.auditorName,
  scenarioInput: seed.scenario,
  detectedScenario: seed.scenario,
  importMethod: 'paste',
  rawTranscript: seed.transcript,
  analysis: buildDemoAnalysis(seed),
  createdAt: `${seed.auditDate}T10:00:00.000Z`,
}));
