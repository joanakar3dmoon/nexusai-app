// ============================================================
// NEXUSAI — MULTI-LLM PROVIDERS
// r3dm/Joan — acceso ilimitado con fallback automático
// ============================================================

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  text: string;
  provider: string;
  model: string;
  tokens_used?: number;
}

const GROQ_KEY = "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";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const OR_KEY = "";
const OR_URL = "https://openrouter.ai/api/v1/chat/completions";

const PROVIDERS = [
  {
    name: "Groq — Llama 3.3 70B",
    url: GROQ_URL,
    key: GROQ_KEY,
    model: "llama-3.3-70b-versatile",
    freeLimit: "14.400 req/día",
    headers: {} as Record<string, string>,
  },
  {
    name: "Groq — DeepSeek R1",
    url: GROQ_URL,
    key: GROQ_KEY,
    model: "deepseek-r1-distill-llama-70b",
    freeLimit: "14.400 req/día",
    headers: {} as Record<string, string>,
  },
  {
    name: "Groq — Mixtral 8x7B",
    url: GROQ_URL,
    key: GROQ_KEY,
    model: "mixtral-8x7b-32768",
    freeLimit: "14.400 req/día",
    headers: {} as Record<string, string>,
  },
  {
    name: "Groq — Gemma 2 9B",
    url: GROQ_URL,
    key: GROQ_KEY,
    model: "gemma2-9b-it",
    freeLimit: "14.400 req/día",
    headers: {} as Record<string, string>,
  },
  {
    name: "OpenRouter — Llama Free",
    url: OR_URL,
    key: OR_KEY,
    model: "meta-llama/llama-3.3-70b-instruct:free",
    freeLimit: "20 req/min",
    headers: {
      "HTTP-Referer": "https://joanakar3dmoon.github.io/nexusai-app/",
      "X-Title": "NexusAI r3dm/Joan",
    },
  },
  {
    name: "OpenRouter — Qwen Free",
    url: OR_URL,
    key: OR_KEY,
    model: "qwen/qwen3-235b-a22b:free",
    freeLimit: "20 req/min",
    headers: {
      "HTTP-Referer": "https://joanakar3dmoon.github.io/nexusai-app/",
      "X-Title": "NexusAI r3dm/Joan",
    },
  },
];

async function callProvider(
  provider: (typeof PROVIDERS)[number],
  messages: LLMMessage[],
  maxTokens = 4096
): Promise<LLMResponse> {
  const res = await fetch(provider.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${provider.key}`,
      ...provider.headers,
    },
    body: JSON.stringify({
      model: provider.model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${provider.name} error ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return {
    text: data.choices[0].message.content,
    provider: provider.name,
    model: provider.model,
    tokens_used: data.usage?.total_tokens,
  };
}

export async function chatWithFallback(
  messages: LLMMessage[],
  maxTokens = 4096
): Promise<LLMResponse> {
  const errors: string[] = [];
  for (const provider of PROVIDERS) {
    try {
      return await callProvider(provider, messages, maxTokens);
    } catch (e) {
      errors.push(`${provider.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  throw new Error(`Todos los proveedores fallaron:\n${errors.join("\n")}`);
}

export async function generateApp(prompt: string): Promise<LLMResponse> {
  const messages: LLMMessage[] = [
    {
      role: "system",
      content: `Eres NexusAI Builder. Dado un prompt, genera una app web completa en HTML/CSS/JS. Devuelve SOLO el codigo HTML, sin explicaciones. Diseño dark, mobile-first, moderno.`,
    },
    { role: "user", content: `Crea esta aplicacion: ${prompt}` },
  ];
  return chatWithFallback(messages, 8192);
}

export async function agentChat(
  userMessage: string,
  history: LLMMessage[] = []
): Promise<LLMResponse> {
  const messages: LLMMessage[] = [
    {
      role: "system",
      content: `Eres NexusAI, asistente IA creado por r3dm/Joan para crear y monetizar aplicaciones. Hablas en español, eres conciso y útil.`,
    },
    ...history,
    { role: "user", content: userMessage },
  ];
  return chatWithFallback(messages, 2048);
}

export function getProviderStatus() {
  return PROVIDERS.map((p) => ({
    name: p.name,
    model: p.model,
    freeLimit: p.freeLimit,
    hasKey: !!p.key,
  }));
}
