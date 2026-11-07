const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';
const API_KEY  = process.env.EXPO_PUBLIC_API_KEY  ?? '';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body?.detail ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function validateEntryId(id: string): Promise<{ valid: boolean; teamName?: string; error?: string }> {
  try {
    const data: any = await fetch(`https://fantasy.premierleague.com/api/entry/${id}/`).then(r => {
      if (r.status === 404) throw new ApiError(404, 'not found');
      if (!r.ok) throw new ApiError(r.status, 'api error');
      return r.json();
    });
    return { valid: true, teamName: data?.name ?? `${data?.player_first_name ?? ''} ${data?.player_last_name ?? ''}`.trim() };
  } catch (e) {
    if (e instanceof ApiError && e.status === 404)
      return { valid: false, error: "That entry ID doesn't exist. Double-check it in the FPL app." };
    return { valid: false, error: 'Could not reach the FPL API. Check your connection and try again.' };
  }
}

export const api = {
  lineup:       (id: string) => request<any>(`/api/v1/lineup?entry_id=${id}`),
  transfers:    (id: string, ft: number) => request<any>(`/api/v1/suggest-transfers?entry_id=${id}&free_transfers=${ft}`),
  chipPlan:     (id: string) => request<any>(`/api/v1/chip-plan?entry_id=${id}`),
  fixturePlan:  (id: string) => request<any>(`/api/v1/fixture-plan?entry_id=${id}`),
  rateSquad:    (id: string) => request<any>(`/api/v1/rate-squad?entry_id=${id}`),
  bestSquad:    (budget: number) => request<any>(`/api/v1/optimize-squad?budget=${budget}`),
  fhSquad:      (id: string, gw: number) => request<any>(`/api/v1/fh-squad?entry_id=${id}&gameweek=${gw}`),
  squadGwPoints: (id: string) => request<any>(`/api/v1/squad-gw-points?entry_id=${id}`),
  miniLeague:    (id: string) => request<any>(`/api/v1/mini-league?entry_id=${id}`),
};
