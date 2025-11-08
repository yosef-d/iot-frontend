// src/App.tsx
import { useEffect, useRef, useState } from "react";
import L, { Map as LeafletMap, Layer, Polyline, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";
import { getRecent, getTrack, listAvailableDays, type Reading } from "./api";

// ---------------- helpers ----------------
function haversine(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const sin1 = Math.sin(dLat / 2);
  const sin2 = Math.sin(dLon / 2);
  const h = sin1 * sin1 + Math.cos(lat1) * Math.cos(lat2) * sin2 * sin2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const fmtMeters = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${m.toFixed(0)} m`);
const fmtMinutes = (mins: number) => `${mins.toFixed(0)} min`;
const dayOf = (iso: string) => iso.slice(0, 10);

// Deriva lista de días únicos (YYYY-MM-DD) desde lecturas
function daysFromRows(rows: Reading[]): string[] {
  const s = new Set<string>();
  for (const r of rows) if (r.read_at) s.add(dayOf(r.read_at));
  return Array.from(s).sort((a, b) => (a < b ? 1 : -1)); // más reciente primero
}

export default function App() {
  // ---------------- mapa ----------------
  const mapRef = useRef<LeafletMap | null>(null);
  const routeLayerRef = useRef<Layer | null>(null);
  const markersRef = useRef<Marker[]>([]);

  // ---------------- estado ----------------
  const [rows, setRows] = useState<Reading[]>([]);
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  // métricas
  const [dist, setDist] = useState(0);
  const [mins, setMins] = useState(0);
  const [pointsCount, setPointsCount] = useState(0);

  // ---------------- init mapa ----------------
  useEffect(() => {
    if (mapRef.current) return;
    const map = L.map("map", { center: [19.4326, -99.1332], zoom: 12 });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);
    mapRef.current = map;
  }, []);

  // ---------------- carga inicial ----------------
  useEffect(() => {
    (async () => {
      setErrorMsg("");
      try {
        // 1) lecturas recientes (para tabla y fallback de días)
        const recent = await getRecent(500);
        setRows(recent.items);

        // 2) días disponibles del backend; si falla, derivamos de recent
        let days: string[] = [];
        try {
          days = await listAvailableDays(1000);
        } catch {
          days = daysFromRows(recent.items);
        }
        setAvailableDays(days);

        // 3) selecciona el día más reciente y dibuja
        const chosen = days[0] || "";
        setSelectedDay(chosen);
        if (chosen) await loadTrackForDay(chosen);
      } catch (e: any) {
        console.error(e);
        setErrorMsg(String(e?.message ?? e));
      }
    })();
  }, []);

  // ---------------- capas: limpiar/dibujar ----------------
  function clearRouteLayers() {
    const map = mapRef.current;
    if (!map) return;
    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }
    for (const m of markersRef.current) map.removeLayer(m);
    markersRef.current = [];
  }

  function drawRoute(points: Reading[]) {
    const map = mapRef.current;
    clearRouteLayers();
    setPointsCount(points.length);

    if (!map || points.length === 0) {
      setDist(0);
      setMins(0);
      return;
    }

    const latlngs = points.map((p) => [p.lat, p.lon]) as [number, number][];
    const poly: Polyline = L.polyline(latlngs);
    poly.addTo(map);
    routeLayerRef.current = poly;

    // marcadores inicio / fin
    const first = points[0];
    const last = points[points.length - 1];
    const mk1 = L.marker([first.lat, first.lon]).addTo(map);
    const mk2 = L.marker([last.lat, last.lon]).addTo(map);
    markersRef.current.push(mk1, mk2);

    // distancia
    let d = 0;
    for (let i = 1; i < latlngs.length; i++) d += haversine(latlngs[i - 1], latlngs[i]);
    setDist(d);

    // duración por read_at
    let minutes = 0;
    if (first.read_at && last.read_at) {
      const t1 = new Date(first.read_at).getTime();
      const t2 = new Date(last.read_at).getTime();
      minutes = (t2 - t1) / 60000;
    }
    setMins(minutes);

    map.fitBounds(poly.getBounds(), { padding: [24, 24] });
  }

  // ---------------- cargar ruta para un día (cliente) ----------------
  async function loadTrackForDay(day: string) {
    setErrorMsg("");
    try {
      // getTrack ya manda device desde api.ts; aquí pedimos todo y filtramos por día
      const { items } = await getTrack({ order: "asc" });
      const dayItems = items
        .filter((r) => r.read_at && dayOf(r.read_at) === day)
        .sort((a, b) => (a.read_at ?? "").localeCompare(b.read_at ?? ""));
      drawRoute(dayItems);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(String(e?.message ?? e));
      clearRouteLayers();
    }
  }

  // ---------------- handlers ----------------
  async function onRefreshTable() {
    setErrorMsg("");
    try {
      const { items } = await getRecent(500);
      setRows(items);
      if (!availableDays.length) {
        const derived = daysFromRows(items);
        setAvailableDays(derived);
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg(String(e?.message ?? e));
    }
  }

  async function onSelectDay(day: string) {
    setSelectedDay(day);
    if (day) await loadTrackForDay(day);
    else clearRouteLayers();
  }

  // ---------------- UI ----------------
  return (
    <div className="app-shell">
      <div className="topbar">
        <div>INTERFAZ DE GEOLOCALIZACIÓN</div>
        <div />
      </div>

      {errorMsg && (
        <div style={{ background: "#fee", border: "1px solid #f99", padding: 8, margin: "8px 16px" }}>
          <strong>Error:</strong> {errorMsg}
        </div>
      )}

      <div className="grid">
        <div className="left">
          <div className="card">
            <div className="card-title">Mapa del recorrido</div>

            <div style={{ marginBottom: 8 }}>
              <label style={{ marginRight: 8 }}>Día:</label>
              <select
                value={selectedDay}
                onChange={(e) => onSelectDay(e.target.value)}
                disabled={availableDays.length === 0}
              >
                <option value="">— seleccionar —</option>
                {availableDays.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div id="map" style={{ height: 520, border: "1px solid #ccc" }} />

            <div style={{ marginTop: 8 }}>
              <strong>Distancia:</strong> {fmtMeters(dist)} &nbsp; | &nbsp;
              <strong>Duración:</strong> {fmtMinutes(mins)} &nbsp; | &nbsp;
              <strong>Puntos:</strong> {pointsCount}
            </div>
          </div>
        </div>

        <div className="right">
          <div className="card">
            <div className="card-title">
              Lecturas recientes{" "}
              <button onClick={onRefreshTable} style={{ marginLeft: 8 }}>
                Refrescar tabla
              </button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Lat</th>
                  <th>Lon</th>
                  <th>Alt</th>
                  <th>read_at</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5}>Sin datos aún…</td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.id}</td>
                      <td>{r.lat}</td>
                      <td>{r.lon}</td>
                      <td>{r.alt_m ?? ""}</td>
                      <td>{r.read_at ?? ""}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
