// src/api.ts
const API = import.meta.env.VITE_API_BASE as string;
const DEVICE = (import.meta.env.VITE_DEVICE_ID || "").trim(); // UUID opcional

export type Reading = {
  id: number;
  device_id: string;
  lat: number;
  lon: number;
  alt_m: number | null;
  read_at: string | null;
  ts: string | null;
};

type TrackParams = {
  device?: string;
  start?: string;
  end?: string;
  order?: "asc" | "desc";
};

export async function getRecent(limit = 200): Promise<{ items: Reading[] }> {
  const qs = new URLSearchParams({ limit: String(limit) });
  if (DEVICE) qs.set("device", DEVICE);
  const res = await fetch(`${API}/readings/recent?${qs.toString()}`);
  if (!res.ok) throw new Error(`[recent] ${res.status}`);
  return res.json();
}

export async function getTrack(params: TrackParams = {}): Promise<{ items: Reading[] }> {
  const q = new URLSearchParams();
  // siempre que tengamos DEVICE lo incluimos; si el caller manda otro, tiene prioridad
  const dev = params.device || DEVICE;
  if (dev) q.set("device", dev);
  if (params.start) q.set("start", params.start);
  if (params.end) q.set("end", params.end);
  if (params.order) q.set("order", params.order);

  const res = await fetch(`${API}/readings/track?${q.toString()}`);
  if (!res.ok) throw new Error(`[track] ${res.status}`);
  return res.json();
}

export async function listAvailableDays(limit = 365): Promise<string[]> {
  // este endpoint puede no existir en todas las versiones; lo intentamos y si falla derivamos en el cliente
  const qs = new URLSearchParams({ limit: String(limit) });
  if (DEVICE) qs.set("device", DEVICE);
  const res = await fetch(`${API}/readings/days?${qs.toString()}`);
  if (!res.ok) throw new Error(`[days] ${res.status}`);
  return res.json();
}
