// Minimal Gemini REST client that runs both on Node and on Cloudflare Workers
// (no Node-only dependencies).

let runtimeConfig: { apiKey?: string; model?: string } = {};

export function setGeminiConfig(config: { apiKey?: string; model?: string }): void {
  runtimeConfig = { ...runtimeConfig, ...config };
}

function envValue(key: 'GEMINI_API_KEY' | 'GEMINI_MODEL'): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
}

export function getGeminiApiKey(): string {
  const apiKey = runtimeConfig.apiKey || envValue('GEMINI_API_KEY');
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('ไม่พบ GEMINI_API_KEY ในระบบ กรุณาตั้งค่า API Key ใน Settings > Secrets');
  }
  return apiKey;
}

export interface GenerateJsonInput {
  systemInstruction: string;
  userPrompt: string;
  responseSchema: Record<string, unknown>;
}

export async function generateGeminiJson(input: GenerateJsonInput): Promise<string> {
  const apiKey = getGeminiApiKey();
  const model = runtimeConfig.model || envValue('GEMINI_MODEL') || 'gemini-2.5-flash';

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: input.systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: input.userPrompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: input.responseSchema,
          temperature: 0.4,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Gemini API ตอบกลับด้วยข้อผิดพลาด (${response.status}): ${errorBody.slice(0, 300)}`
    );
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  return (
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? '')
      .join('')
      .trim() ?? ''
  );
}
