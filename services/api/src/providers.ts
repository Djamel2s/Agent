export interface ProviderStatus { id: string; name: string; configured: boolean }

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
