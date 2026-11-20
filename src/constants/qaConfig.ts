import type {
  AgentProfile,
  CriterionKey,
  QACriterionConfig,
  QASettings,
  ScenarioConfig,
  ScenarioType,
} from '../types/qa.ts';

export const DEFAULT_CRITERIA: QACriterionConfig[] = [
  {
    key: 'accuracy',
    order: 1,
    name: 'ความถูกต้องของข้อมูล',
    maxScore: 20,
    description: 'ตอบข้อมูลสินค้า ราคา โปรโมชั่น และรายละเอียดได้ถูกต้องตรงตามข้อมูลที่มี',
    watchFor: 'ความแม่นยำของราคา เงื่อนไขโปรโมชั่น สเปกสินค้า และสถานะจริง',
  },
  {
    key: 'politeness',
    order: 2,
    name: 'มารยาทและความสุภาพ',
    maxScore: 15,
    description: 'ใช้คำสุภาพ น้ำเสียงเป็นมิตร และเหมาะสมกับลูกค้า',
    watchFor: 'สุภาพ ไม่ใช้อารมณ์ ไม่ประชดประชัน ไม่โต้เถียงกับลูกค้า',
  },
  {
    key: 'completeness',
    order: 3,
    name: 'ความครบถ้วนของคำตอบ',
    maxScore: 15,
    description: 'ตอบตรงคำถาม ครบทุกประเด็น ไม่ตกหล่นข้อมูลสำคัญที่ลูกค้าถาม',
    watchFor: 'ตอบครบทุกคำถามที่ลูกค้าพิมพ์มาในคราวเดียว',
  },
  {
    key: 'communication',
    order: 4,
    name: 'ทักษะการสื่อสาร',
    maxScore: 10,
    description: 'เรียบเรียงข้อความเข้าใจง่าย กระชับ อ่านรู้เรื่อง และจัดรูปแบบดี',
    watchFor: 'อ่านง่าย กระชับ แบ่งย่อหน้าหรือลำดับขั้นตอนชัดเจน',
  },
  {
    key: 'problem_solving',
    order: 5,
    name: 'การแก้ไขปัญหาและข้อร้องเรียน',
    maxScore: 10,
    description: 'รับฟังลูกค้า แสดงความเข้าใจ (Empathy) และเสนอแนวทางแก้ไขที่ชัดเจน',
    watchFor: 'รับมือข้อร้องเรียนอย่างมืออาชีพ ควบคุมอารมณ์ และแก้ปัญหาได้ตรงจุด',
  },
  {
    key: 'order_confirmation',
    order: 6,
    name: 'การยืนยันคำสั่งซื้อ',
    maxScore: 15,
    description: 'ตรวจสอบและทวนรายการสินค้า จำนวน ราคา ยอดรวม ที่อยู่ และข้อมูลออเดอร์',
    watchFor: 'ตรวจสอบรายละเอียดสำคัญครบถ้วนก่อนปิดออเดอร์หรือส่งของ',
  },
  {
    key: 'response_speed',
    order: 7,
    name: 'ความรวดเร็วในการตอบ',
    maxScore: 10,
    description: 'ตอบภายในเวลาที่กำหนดตาม SLA และติดตามงานอย่างเหมาะสม',
    watchFor: 'ประเมินจาก Timestamp จริงเท่านั้น (หากไม่มีข้อมูลเวลา ห้ามประเมิน)',
  },
  {
    key: 'closing',
    order: 8,
    name: 'การปิดการสนทนา',
    maxScore: 5,
    description: 'สรุปผล แจ้งขั้นตอนถัดไป และกล่าวขอบคุณลูกค้าอย่างเหมาะสม',
    watchFor: 'มีการสรุปใจความ ขั้นตอนต่อไป และขอบคุณก่อนจบบทสนทนา',
  },
];

export const CRITERIA_WEIGHT_PRESETS = {
  standardPrompt: {
    label: 'เกณฑ์มาตรฐานระบบ (20/15/15/10/10/15/10/5)',
    weights: {
      accuracy: 20,
      politeness: 15,
      completeness: 15,
      communication: 10,
      problem_solving: 10,
      order_confirmation: 15,
      response_speed: 10,
      closing: 5,
    } as Record<CriterionKey, number>,
  },
  csvTemplate: {
    label: 'เกณฑ์ตามไฟล์ CSV ทีม (20/15/15/10/15/10/10/5)',
    weights: {
      accuracy: 20,
      politeness: 15,
      completeness: 15,
      communication: 10,
      problem_solving: 15,
      order_confirmation: 10,
      response_speed: 10,
      closing: 5,
    } as Record<CriterionKey, number>,
  },
};

export const SCENARIO_CONFIGS: ScenarioConfig[] = [
  {
    id: 'product_inquiry',
    label: 'ลูกค้าสอบถามสินค้า',
    specificSkill: 'ความรู้สินค้าและการให้ข้อมูล',
    description: 'ลูกค้าถามรายละเอียด สเปก วิธีใช้ ความแตกต่าง หรือโปรโมชั่นของสินค้า',
    keyCheckpoints: [
      'อธิบายคุณสมบัติตรงตามความต้องการลูกค้า',
      'แจ้งราคาและโปรโมชั่นชัดเจน ไม่ตกหล่น',
      'แนะนำตัวเลือกที่เหมาะสมกับปัญหาของลูกค้า',
    ],
  },
  {
    id: 'order_placement',
    label: 'ลูกค้าสั่งซื้อสินค้า',
    specificSkill: 'การเก็บข้อมูลและยืนยันออเดอร์',
    description: 'ลูกค้าต้องการสั่งซื้อ แจ้งที่อยู่ ชำระเงิน หรือยืนยันรายการ',
    keyCheckpoints: [
      'ทวนรายการสินค้า จำนวน สี/ไซส์ และยอดชำระรวม',
      'ตรวจสอบชื่อ ที่อยู่ และเบอร์โทรศัพท์ครบถ้วน',
      'แจ้งช่องทางชำระเงินและระยะเวลาจัดส่งโดยประมาณ',
    ],
  },
  {
    id: 'shipping_inquiry',
    label: 'ลูกค้าสอบถามการจัดส่ง',
    specificSkill: 'การตรวจสอบและแจ้งสถานะ',
    description: 'ลูกค้าติดตามพัสดุ ถามเลข Tracking หรือถามวันจัดส่งถึง',
    keyCheckpoints: [
      'ขอข้อมูลอ้างอิงเพื่อตรวจสอบอย่างสุภาพ',
      'แจ้งสถานะหรือขั้นตอนการตรวจสอบที่ชัดเจน',
      'ติดตามและแจ้งกรอบเวลาที่จะตอบกลับหากต้องประสานงานต่อ',
    ],
  },
  {
    id: 'product_complaint',
    label: 'ลูกค้าร้องเรียนสินค้า',
    specificSkill: 'การแก้ไขปัญหาและควบคุมอารมณ์',
    description: 'สินค้าชำรุด ส่งผิด ไม่ตรงปก หรือลูกค้าไม่พอใจบริการ',
    keyCheckpoints: [
      'ขออภัยและแสดงความเห็นใจทันทีโดยไม่แก้ตัว',
      'ขอหลักฐานที่จำเป็นอย่างนุ่มนวลและชัดเจน',
      'เสนอทางออกที่เป็นรูปธรรม (เปลี่ยน/เคลม/คืนเงิน) พร้อมกำหนดเวลา',
    ],
  },
  {
    id: 'hesitant_customer',
    label: 'ลูกค้าลังเลไม่ตัดสินใจซื้อ',
    specificSkill: 'การโน้มน้าวและปิดการขาย',
    description: 'ลูกค้าเทียบราคา ขอคิดดูก่อน กังวลความคุ้มค่า หรือยังไม่มั่นใจ',
    keyCheckpoints: [
      'ถามความกังวลหรือความต้องการที่แท้จริงอย่างเป็นมิตร',
      'เน้นคุณค่าและความคุ้มค่าที่ตรงจุด (Value Selling)',
      'มี Call-to-Action หรือข้อเสนอช่วยตัดสินใจโดยไม่กดดัน',
    ],
  },
];

export const SCENARIO_MAP: Record<ScenarioType, ScenarioConfig> = {
  product_inquiry: SCENARIO_CONFIGS[0],
  order_placement: SCENARIO_CONFIGS[1],
  shipping_inquiry: SCENARIO_CONFIGS[2],
  product_complaint: SCENARIO_CONFIGS[3],
  hesitant_customer: SCENARIO_CONFIGS[4],
};

export const INITIAL_AGENTS: AgentProfile[] = [
  {
    id: 'agent-01',
    name: 'นันทิชา จันตา',
    employeeCode: 'CS-101',
    team: 'ทีม Inbound & Sales',
    role: 'Senior Chat Agent',
    coachingStatus: 'ผ่านเกณฑ์แล้ว',
    trainerNote: 'ตอบข้อมูลสินค้าแม่นยำและปิดการขายได้ดี เหมาะเป็นตัวอย่างให้ทีม',
  },
  {
    id: 'agent-02',
    name: 'อภิญญา ถาพรม',
    employeeCode: 'CS-102',
    team: 'ทีม Inbound & Sales',
    role: 'Chat Agent',
    coachingStatus: 'กำลัง Coaching',
    trainerNote: 'เน้นฝึกการทวนรายละเอียดออเดอร์และการสรุปปิดการสนทนา',
  },
  {
    id: 'agent-03',
    name: 'กฤษชฎา ธณิจปัญญกุณ',
    employeeCode: 'CS-103',
    team: 'ทีม After-Sales & Claim',
    role: 'Chat Agent',
    coachingStatus: 'กำลัง Coaching',
    trainerNote: 'ต้องพัฒนา Empathy และการสื่อสารเชิงบวกในเคสร้องเรียนสินค้า',
  },
  {
    id: 'agent-04',
    name: 'ไชยญณัฏฐ์ ประสานทอง',
    employeeCode: 'CS-104',
    team: 'ทีม After-Sales & Claim',
    role: 'Senior Chat Agent',
    coachingStatus: 'ผ่านเกณฑ์แล้ว',
    trainerNote: 'รับมือข้อร้องเรียนได้ดีมาก ควบคุมอารมณ์และแก้ปัญหาได้ไว',
  },
  {
    id: 'agent-05',
    name: 'จารุวรรณ คำศรี',
    employeeCode: 'CS-105',
    team: 'ทีม Inbound & Sales',
    role: 'Chat Agent',
    coachingStatus: 'รอดำเนินการ',
    trainerNote: 'มักตกหล่นคำถามย่อยเมื่อลูกค้าถามหลายข้อในข้อความเดียว',
  },
  {
    id: 'agent-06',
    name: 'ณัฐพล ลักษณาการ',
    employeeCode: 'CS-106',
    team: 'ทีม Logistics & Tracking',
    role: 'Chat Agent',
    coachingStatus: 'กำลัง Coaching',
    trainerNote: 'ฝึกการแจ้งกรอบเวลาติดตามพัสดุให้ชัดเจนมากขึ้น',
  },
  {
    id: 'agent-07',
    name: 'อนุศักดิ์ พินิจดำ',
    employeeCode: 'CS-107',
    team: 'ทีม Logistics & Tracking',
    role: 'Chat Agent',
    coachingStatus: 'ผ่านเกณฑ์แล้ว',
    trainerNote: 'สื่อสารกระชับ อ่านง่าย และแจ้งเลข Tracking พร้อมลิงก์ติดตามครบ',
  },
  {
    id: 'agent-08',
    name: 'เมธาวดี แย้มด้วง',
    employeeCode: 'CS-108',
    team: 'ทีม Inbound & Sales',
    role: 'Chat Agent',
    coachingStatus: 'รอดำเนินการ',
    trainerNote: 'ควรฝึกทักษะการถามเปิดและตอบข้อโต้แย้งสำหรับลูกค้าลังเล',
  },
  {
    id: 'agent-09',
    name: 'วิทูรย์ โชคชัย',
    employeeCode: 'CS-109',
    team: 'ทีม After-Sales & Claim',
    role: 'Chat Agent',
    coachingStatus: 'กำลัง Coaching',
    trainerNote: 'ตอบเร็วแต่บางครั้งพิมพ์ห้วนเกินไป ต้องเพิ่มคำเชื่อมที่สุภาพ',
  },
  {
    id: 'agent-10',
    name: 'ศุภชานันท์ สุเทพ',
    employeeCode: 'CS-110',
    team: 'ทีม Inbound & Sales',
    role: 'Chat Agent',
    coachingStatus: 'ผ่านเกณฑ์แล้ว',
    trainerNote: 'ทวนที่อยู่และสรุปยอดก่อนปิดออเดอร์ได้ครบถ้วนสม่ำเสมอ',
  },
  {
    id: 'agent-11',
    name: 'ขจรศักดิ์ สุวรรณภาญกูร',
    employeeCode: 'CS-111',
    team: 'ทีม Logistics & Tracking',
    role: 'Chat Agent',
    coachingStatus: 'รอดำเนินการ',
    trainerNote: 'ต้องเน้นการปิดการสนทนาและแจ้งขั้นตอนถัดไปให้ชัดเจน',
  },
  {
    id: 'agent-12',
    name: 'จตุพล มานพกวี',
    employeeCode: 'CS-112',
    team: 'ทีม After-Sales & Claim',
    role: 'Chat Agent',
    coachingStatus: 'กำลัง Coaching',
    trainerNote: 'ให้ข้อมูลเงื่อนไขประกันชัดเจนดี แต่ควรทวนความเข้าใจลูกค้าก่อนปิดแชท',
  },
];

export const DEFAULT_SETTINGS: QASettings = {
  defaultAuditorName: 'หัวหน้าทีม QA (คุณธนัท)',
  passThresholdPercent: 80,
  criteriaWeights: { ...CRITERIA_WEIGHT_PRESETS.standardPrompt.weights },
};

export const SAMPLE_TRANSCRIPTS: {
  id: string;
  label: string;
  scenario: ScenarioType;
  hasTimestamps: boolean;
  transcript: string;
}[] = [
  {
    id: 'sample-complaint-ts',
    label: 'ร้องเรียนสินค้าชำรุด (มี Timestamp)',
    scenario: 'product_complaint',
    hasTimestamps: true,
    transcript: `[10:02] ลูกค้า: สั่งเครื่องฟอกอากาศรุ่น AirPure M2 ไป เพิ่งเปิดกล่องวันนี้ ตัวเครื่องมีรอยร้าวตรงมุมขวาบน แล้วเปิดไม่ติดเลยค่ะ เสียความรู้สึกมาก!
[10:04] พนักงาน: สวัสดีครับ ทางร้านขออภัยเป็นอย่างสูงสำหรับเหตุการณ์ที่เกิดขึ้นนะครับ เข้าใจเลยครับว่าคุณลูกค้าต้องเสียความรู้สึกเมื่อได้รับสินค้าที่มีปัญหา
[10:05] พนักงาน: เพื่อประสานงานเปลี่ยนเครื่องใหม่ให้คุณลูกค้าอย่างเร่งด่วน รบกวนขอทราบเลขคำสั่งซื้อ และรบกวนถ่ายภาพรอยร้าวพร้อมวิดีโอตอนทดลองเสียบปลั๊กส่งมาทางนี้ได้เลยนะครับ
[10:07] ลูกค้า: เลขคำสั่งซื้อ #ORD-88412 ค่ะ เดี๋ยวส่งรูปให้ (ส่งรูปภาพและวิดีโอ)
[10:09] พนักงาน: ได้รับข้อมูลและภาพชัดเจนแล้วครับ ตรวจสอบคำสั่งซื้อ #ORD-88412 เรียบร้อย ทางร้านยินดีส่งเครื่องใหม่รุ่น AirPure M2 ไปเปลี่ยนให้ทันทีโดยไม่มีค่าใช้จ่ายเพิ่มเติมครับ
[10:10] พนักงาน: รบกวนยืนยันที่อยู่จัดส่งเดิม (128/45 ถ.ลาดพร้าว กรุงเทพฯ) และเบอร์ติดต่อ 089-XXX-1234 ถูกต้องไหมครับ ทางเราจะนัดขนส่งเข้ารับเครื่องเดิมและส่งเครื่องใหม่ภายใน 1-2 วันทำการครับ
[10:12] ลูกค้า: ถูกต้องค่ะ ขอบคุณที่ช่วยดูแลไวมาก
[10:13] พนักงาน: ยินดีให้บริการครับ เมื่อจัดส่งเครื่องใหม่แล้วจะรีบแจ้งเลขพัสดุให้ทราบทันทีนะครับ ขอบคุณที่ไว้วางใจร้านเราครับ`,
  },
  {
    id: 'sample-order-nots',
    label: 'สั่งซื้อสินค้า — ตกหล่นการทวนออเดอร์ (ไม่มี Timestamp)',
    scenario: 'order_placement',
    hasTimestamps: false,
    transcript: `ลูกค้า: สนใจสั่งเซรั่มวิตามินซี 2 ขวดค่ะ มีโปรอะไรบ้างคะ แล้วส่งฟรีไหม
พนักงาน: มีโปรซื้อ 2 ขวดเหลือ 890 บาท ส่งฟรีครับ
ลูกค้า: โอเคค่ะ งั้นเอา 2 ขวด ส่งที่ คุณสมหญิง ใจดี 45/2 หมู่ 3 ต.บางรักพัฒนา อ.บางบัวทอง จ.นนทบุรี 11110 เก็บเงินปลายทางนะคะ
พนักงาน: ได้เลยครับ รับออเดอร์แล้ว เดี๋ยวจัดส่งให้นะครับ
ลูกค้า: จะได้ของวันไหนคะ แล้วเบอร์โทรต้องให้ไหมคะ
พนักงาน: อ้อ ขอเบอร์โทรด้วยครับ ของน่าจะถึงประมาณ 2-3 วัน
ลูกค้า: 081-234-5678 ค่ะ
พนักงาน: โอเคครับเรียบร้อย`,
  },
  {
    id: 'sample-hesitant-ts',
    label: 'ลูกค้าลังเลไม่ตัดสินใจซื้อ (มี Timestamp)',
    scenario: 'hesitant_customer',
    hasTimestamps: true,
    transcript: `[14:15] ลูกค้า: เก้าอี้เพื่อสุขภาพรุ่น ErgoFit Pro ราคา 6,900 บาท แอบแรงอยู่นะคะ ขอคิดดูก่อนดีกว่า กลัวซื้อมาแล้วนั่งไม่สบาย
[14:16] พนักงาน: สวัสดีค่ะ เข้าใจเลยค่ะว่าการเลือกเก้าอี้ทำงานเป็นการลงทุนที่ต้องมั่นใจจริง ๆ ค่ะ
[14:17] พนักงาน: ไม่ทราบว่าปกติคุณลูกค้านั่งทำงานวันละกี่ชั่วโมง และมีอาการปวดหลังหรือปวดคอช่วงไหนเป็นพิเศษไหมคะ เผื่อช่วยแนะนำรุ่นที่ตอบโจทย์ที่สุดให้ค่ะ
[14:19] ลูกค้า: นั่งวันละ 8-9 ชั่วโมงค่ะ ปวดช่วงเอวกับบ่าบ่อยมาก
[14:21] พนักงาน: ถ้านั่งวันละ 8-9 ชั่วโมง รุ่น ErgoFit Pro จะตอบโจทย์มากค่ะ เพราะมีตัวดันหลัง Lumbar Support แบบปรับแยกตามสรีระ และที่วางแขน 4D ช่วยลดแรงกดทับบ่าได้จริง ที่สำคัญมีรับประกันโครงสร้าง 3 ปี และทดลองนั่งได้ 14 วันหากไม่พอใจเปลี่ยนคืนได้ค่ะ
[14:22] พนักงาน: ตอนนี้มีโค้ดส่วนลดเพิ่ม 400 บาทสำหรับลูกค้าใหม่ เหลือเพียง 6,500 บาท และผ่อน 0% ได้ 6 เดือนนะคะ สนใจให้แอดมินเช็กสีพร้อมส่งให้เลยไหมคะ`,
  },
  {
    id: 'sample-shipping-nots',
    label: 'สอบถามการจัดส่ง (ไม่มี Timestamp)',
    scenario: 'shipping_inquiry',
    hasTimestamps: false,
    transcript: `ลูกค้า: สั่งของไปตั้งแต่ 3 วันก่อน ยังไม่ได้รับของเลยค่ะ เช็คให้หน่อย
พนักงาน: ขอชื่อกับเบอร์โทรหน่อยครับ
ลูกค้า: ปิยะดา 086-555-9900
พนักงาน: กำลังส่งอยู่ครับ รอหน่อยนะครับ
ลูกค้า: ขอเลขพัสดุด้วยค่ะ จะเช็คเอง
พนักงาน: TH0192837465B ของแฟลชครับ`,
  },
];
