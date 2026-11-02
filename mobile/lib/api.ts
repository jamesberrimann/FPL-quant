const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';
const API_KEY  = process.env.EXPO_PUBLIC_API_KEY  ?? '';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body?.detail ?? `Request failed: ${res.status}`);
  }

  return res.json();
}

export async function validateEntryId(entryId: string): Promise<{ valid: boolean; name?: string; error?: string }> {
  try {
    const data = await fetch(
      `https://fantasy.premierleague.com/api/entry/${entryId}/`,
    ).then(r => {
      if (r.status === 404) throw new ApiError(404, 'not found');
      if (!r.ok) throw new ApiError(r.status, 'api error');
      return r.json();
    });
    const name = data?.name ?? `${data?.player_first_name ?? ''} ${data?.player_last_name ?? ''}`.trim();
    return { valid: true, name };
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      return { valid: false, error: "That entry ID doesn't exist. Double-check it in the FPL app." };
    }
    return { valid: false, error: 'Could not reach the FPL API. Check your connection and try again.' };
  }
}

export const api = {
  lineup:       (entryId: string) => request<any>(`/api/v1/lineup?entry_id=${entryId}`),
  transfers:    (entryId: string) => request<any>(`/api/v1/transfers?entry_id=${entryId}`),
  chipPlan:     (entryId: string) => request<any>(`/api/v1/chip-plan?entry_id=${entryId}`),
  fixturePlan:  (entryId: string) => request<any>(`/api/v1/fixture-plan?entry_id=${entryId}`),
  rateSquad:    (entryId: string) => request<any>(`/api/v1/rate-squad?entry_id=${entryId}`),
  scores:       (entryId: string) => request<any>(`/api/v1/scores?entry_id=${entryId}`),
};
