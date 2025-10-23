import { useEffect, useState } from "react";
import { getRecent, ingest, type Reading } from "./api";
import "./styles.css";

export default function App() {
  const [items, setItems] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true); setErr(null);
    try {
      const data = await getRecent(50);
      setItems(data.items ?? []);
    } catch (e:any) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function demoIngest() {
    setErr(null);
    try {
      await ingest(19.4326, -99.1332, 2240, new Date().toISOString());
      await load();
    } catch (e:any) {
      setErr(e.message || String(e));
    }
  }

  return (
    <div className="container">
      <h1>IoT Readings</h1>
      <div className="actions">
        <button onClick={load} disabled={loading}>{loading ? "Loading..." : "Reload"}</button>
        <button onClick={demoIngest}>Add demo point</button>
      </div>
      {err && <pre className="error">{err}</pre>}
      <table>
        <thead>
          <tr>
            <th>ID</th><th>Device</th><th>Lat</th><th>Lon</th><th>Alt</th><th>read_at</th><th>ts</th>
          </tr>
        </thead>
        <tbody>
          {items.map(r => (
            <tr key={r.id}>
              <td>{r.id}</td>
              <td>{r.device_id}</td>
              <td>{r.lat?.toFixed?.(6) ?? r.lat}</td>
              <td>{r.lon?.toFixed?.(6) ?? r.lon}</td>
              <td>{r.alt_m ?? ""}</td>
              <td>{r.read_at ?? ""}</td>
              <td>{r.ts ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
