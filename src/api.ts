const API = import.meta.env.VITE_API_BASE;
const TOKEN = import.meta.env.VITE_TOKEN;

export type Reading = {
  id: number;
  device_id: string;
  lat: number;
  lon: number;
  alt_m: number | null;
  read_at: string | null;
  ts: string | null;
};

export async function getRecent(limit = 50): Promise<{ items: Reading[] }> {
  const res = await fetch(`${API}/readings/recent?limit=${limit}`);
  if (!res.ok) throw new Error(`recent failed: ${res.status}`);
  return res.json();
}

export async function ingest(lat: number, lon: number, alt?: number, time?: string) {
  const body: any = { lat, lon };
  if (alt !== undefined) body.alt = alt;
  if (time) body.time = time;

  const res = await fetch(`${API}/ingest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${TOKEN}`
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
