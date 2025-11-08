import { MapContainer, TileLayer, Polyline, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useMemo } from "react";
import type { Reading } from "./api";

// Fix icon paths en bundlers
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function MapView({ points }: { points: Reading[] }) {
  // Centro por defecto (CDMX); si hay puntos, centro en el primero
  const center = useMemo<[number, number]>(() => {
    if (points && points.length > 0) {
      return [points[0].lat, points[0].lon];
    }
    return [19.432608, -99.133209];
  }, [points]);

  const line = useMemo<[number, number][]>(() => {
    return (points ?? []).map((p) => [p.lat, p.lon]);
  }, [points]);

  return (
    <MapContainer
      center={center}
      zoom={16}
      scrollWheelZoom
      // ¡Altura asegurada!
      style={{ height: "480px", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {line.length > 1 && <Polyline positions={line} />}
      {points && points[0] && (
        <Marker position={[points[0].lat, points[0].lon]}>
          <Popup>Inicio</Popup>
        </Marker>
      )}
      {points && points.length > 1 && (
        <Marker position={[points[points.length - 1].lat, points[points.length - 1].lon]}>
          <Popup>Fin</Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
