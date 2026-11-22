// Minimal Anthropic Claude REST client that runs both on Node and on Cloudflare
// Workers (no Node-only dependencies).
//
// Structured output comes from a single forced tool call: the tool's
// input_schema is the JSON Schema of the expected result.

let runtimeConfig: { apiKey?: string; model?: string } = {};

export function setAnthropicConfig(config: { apiKey?: string; model?: string }): void {
  runtimeConfig = { ...runtimeConfig, ...config };
}

function envValue(key: 'ANTHROPIC_API_KEY' | 'ANTHROPIC_MODEL'): string | undefined {
  return typeof process !== 'undefined' && process.env ? process.env[key] : undefined;
}

export function getAnthropicApiKey(): string {
  const apiKey = runtimeConfig.apiKey || envValue('ANTHROPIC_API_KEY');
  if (!apiKey || apiKey === 'MY_ANTHROPIC_API_KEY') {
    throw new Error('ไม่พบ ANTHROPIC_API_KEY ในระบบ กรุณาตั้งค่า API Key ใน Settings > Secrets');
  }
  return apiKey;
}

export interface GenerateJsonInput {
  systemInstruction: string;
  userPrompt: string;
  responseSchema: Record<string, unknown>;
  toolName?: string;
}

interface AnthropicContentBlock {
  type?: string;
  input?: unknown;
}

export async function generateClaudeJson(input: GenerateJsonInput): Promise<string> {
  const toolName = input.toolName || 'submit_result';

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': getAnthropicApiKey(),
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: runtimeConfig.model || envValue('ANTHROPIC_MODEL') || 'claude-sonnet-4-5',
      max_tokens: 16000,
      system: input.systemInstruction,
      messages: [{ role: 'user', content: input.userPrompt }],
      tools: [
        {
          name: toolName,
          description: 'ส่งผลลัพธ์ที่วิเคราะห์เสร็จแล้วเป็นข้อมูล JSON ตาม schema ที่กำหนด',
          input_schema: input.responseSchema,
        },
      ],
      tool_choice: { type: 'tool', name: toolName },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Claude API ตอบกลับด้วยข้อผิดพลาด (${response.status}): ${errorBody.slice(0, 300)}`
    );
  }

  const payload = (await response.json()) as { content?: AnthropicContentBlock[] };
  const toolBlock = payload.content?.find((block) => block.type === 'tool_use');

  if (!toolBlock || typeof toolBlock.input !== 'object' || toolBlock.input === null) {
    throw new Error('AI ไม่ได้ส่งข้อมูลกลับมาในรูปแบบที่กำหนด กรุณาลองใหม่อีกครั้ง');
  }

  return JSON.stringify(toolBlock.input);
}
