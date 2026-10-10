export interface Provider { id: string; name: string; configured: boolean }

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function fetchProviders(): Promise<Provider[] | null> {
  try {
    const res = await fetch(`${API}/api/models/providers`);
    if (!res.ok) return null;
    return ((await res.json()) as { providers: Provider[] }).providers;
  } catch {
    return null;
  }
}
