// ============================================================
// NEXUSAI — MULTI-LLM PROVIDERS (100% GRATUITOS)
// ~60.000+ requests/día sin pagar un céntimo
// ============================================================
// Prioridad: Groq → Cerebras → NVIDIA NIM → Together → OpenRouter → Mistral
// Rotación automática si un proveedor falla o se queda sin cuota

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

const PROVIDERS = [
  {
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    envKey: "VITE_GROQ_API_KEY",
    model: "llama-3.3-70b-versatile",
    freeLimit: "14400 req/dia",
  },
  {
    name: "Cerebras",
    baseUrl: "https://api.cerebras.ai/v1",
    envKey: "VITE_CEREBRAS_API_KEY",
    model: "llama3.1-70b",
    freeLimit: "1000 req/hora",
  },
  {
    name: "NVIDIA NIM",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    envKey: "VITE_NVIDIA_API_KEY",
    model: "meta/llama-3.3-70b-instruct",
    freeLimit: "1000 req/mes gratis",
  },
  {
    name: "Together AI",
    baseUrl: "https://api.together.xyz/v1",
    envKey: "VITE_TOGETHER_API_KEY",
    model: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
    freeLimit: "Ilimitado en modelos Free",
  },
  {
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    envKey: "VITE_OPENROUTER_API_KEY",
    model: "meta-llama/llama-3.3-70b-instruct:free",
    freeLimit: "20 req/min modelos :free",
  },
  {
    name: "Mistral",
    baseUrl: "https://api.mistral.ai/v1",
    envKey: "VITE_MISTRAL_API_KEY",
    model: "mistral-small-latest",
    freeLimit: "1 req/seg gratis",
  },
] as const;

async function callProvider(
  provider: (typeof PROVIDERS)[number],
  messages: LLMMessage[],
  maxTokens = 4096
): Promise<LLMResponse> {
  const apiKey = (import.meta.env as Record<string, string>)[provider.envKey];
  if (!apiKey) throw new Error(`No API key for ${provider.name}`);

  const res = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(provider.name === "OpenRouter" && {
        "HTTP-Referer": "https://joanakar3dmoon.github.io/nexusai-app/",
        "X-Title": "NexusAI",
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
      content: `Eres NexusAI Builder. Dado un prompt, genera una app web completa en HTML/CSS/JS. Devuelve SOLO el codigo HTML, sin explicaciones. Diseno dark, mobile-first.`,
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
      content: `Eres NexusAI, asistente IA para crear y monetizar aplicaciones. Hablas en espanol, eres conciso y util.`,
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
    hasKey: !!(import.meta.env as Record<string, string>)[p.envKey],
  }));
}
