export interface ProviderStatus { id: string; name: string; configured: boolean }
export interface ChatMessage { role: "user" | "assistant" | "system"; content: string }
export interface ChatRequest { messages: ChatMessage[]; model?: string; provider?: "google" | "openai"; agentId?: string }

const PROVIDERS: ReadonlyArray<{ id: string; name: string; env: string }> = [
  { id: "openai", name: "OpenAI", env: "OPENAI_API_KEY" },
  { id: "anthropic", name: "Anthropic", env: "ANTHROPIC_API_KEY" },
  { id: "google", name: "Google Gemini", env: "GOOGLE_API_KEY" },
  { id: "mistral", name: "Mistral", env: "MISTRAL_API_KEY" },
];

/** Honest provider status: configured only if a key is actually present. Never exposes the key. */
export function providerStatus(env: NodeJS.ProcessEnv): ProviderStatus[] {
  return PROVIDERS.map((p) => ({ id: p.id, name: p.name, configured: Boolean(env[p.env]?.trim()) }));
}

async function completeGemini(env: NodeJS.ProcessEnv, request: ChatRequest, key: string) {
  const model = request.model?.trim() || env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: request.messages.some((message) => message.role === "system")
          ? { parts: request.messages.filter((message) => message.role === "system").map((message) => ({ text: message.content })) }
          : undefined,
        contents: request.messages.filter((message) => message.role !== "system").map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.content }],
        })),
      }),
      redirect: "error",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`model_provider_upstream_${response.status}`);
    const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const content = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("");
    if (!content) throw new Error("model_provider_invalid_response");
    return { provider: "google-gemini", model, content };
  } finally {
    clearTimeout(timer);
  }
}

async function completeOpenAiCompatible(env: NodeJS.ProcessEnv, request: ChatRequest, key: string) {
  const model = request.model?.trim() || env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const base = (env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/$/, "");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { authorization: "Bearer " + key, "content-type": "application/json" },
      body: JSON.stringify({ model, messages: request.messages, stream: false }),
      redirect: "error",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`model_provider_upstream_${response.status}`);
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("model_provider_invalid_response");
    return { provider: "openai-compatible", model, content };
  } finally {
    clearTimeout(timer);
  }
}

export async function completeChat(env: NodeJS.ProcessEnv, request: ChatRequest): Promise<{ provider: string; model: string; content: string }> {
  const googleKey = env.GOOGLE_API_KEY?.trim();
  if (googleKey && request.provider !== "openai") return completeGemini(env, request, googleKey);
  const openAiKey = env.OPENAI_API_KEY?.trim();
  if (openAiKey) return completeOpenAiCompatible(env, request, openAiKey);
  throw new Error("model_provider_not_configured");
}
