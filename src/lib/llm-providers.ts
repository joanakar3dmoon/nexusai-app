// ============================================================
// NEXUSAI — MULTI-LLM PROVIDERS (100% GRATUITOS)
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

// Keys hardcodeadas — acceso real sin variables de entorno
const GROQ_KEY = "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";
const OPENROUTER_KEY = (import.meta.env as Record<string,string>).VITE_OPENROUTER_API_KEY || "";

const PROVIDERS = [
  {
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    key: GROQ_KEY,
    model: "llama-3.3-70b-versatile",
    freeLimit: "14.400 req/día",
  },
  {
    name: "Groq DeepSeek",
    baseUrl: "https://api.groq.com/openai/v1",
    key: GROQ_KEY,
    model: "deepseek-r1-distill-llama-70b",
    freeLimit: "14.400 req/día",
  },
  {
    name: "Groq Gemma",
    baseUrl: "https://api.groq.com/openai/v1",
    key: GROQ_KEY,
    model: "gemma2-9b-it",
    freeLimit: "14.400 req/día",
  },
  {
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    key: OPENROUTER_KEY,
    model: "meta-llama/llama-3.3-70b-instruct:free",
    freeLimit: "20 req/min",
  },
] as const;

async function callProvider(
  provider: (typeof PROVIDERS)[number],
  messages: LLMMessage[],
  maxTokens = 4096
): Promise<LLMResponse> {
  if (!provider.key) throw new Error(`Sin key para ${provider.name}`);

  const res = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${provider.key}`,
      ...(provider.name === "OpenRouter" && {
        "HTTP-Referer": "https://joanakar3dmoon.github.io/nexusai-app/",
        "X-Title": "NexusAI r3dm/Joan",
      }),
    },
    body: JSON.stringify({
      model: provider.model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
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
      const result = await callProvider(provider, messages, maxTokens);
      return result;
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
