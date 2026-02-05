"use client";

import React, { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Polygon,
  Marker,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default Leaflet icons in React
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface Coordinate {
  lat: number;
  lng: number;
}

interface MapEditorProps {
  existingZones: any[];
  isDrawing: boolean;
  onPolygonChange: (coords: Coordinate[]) => void;
  resetDrawing?: boolean;
}

function ClickHandler({
  isDrawing,
  onAddPoint,
}: {
  isDrawing: boolean;
  onAddPoint: (e: any) => void;
}) {
  useMapEvents({
    click(e) {
      if (isDrawing) onAddPoint(e.latlng);
    },
  });
  return null;
}

const MapEditor = ({
  existingZones,
  isDrawing,
  onPolygonChange,
  resetDrawing,
}: MapEditorProps) => {
  const [currentPolygon, setCurrentPolygon] = useState<Coordinate[]>([]);

  useEffect(() => {
    if (resetDrawing) setCurrentPolygon([]);
  }, [resetDrawing]);

  const handleAddPoint = (latlng: any) => {
    const newPoints = [...currentPolygon, { lat: latlng.lat, lng: latlng.lng }];
    setCurrentPolygon(newPoints);
    onPolygonChange(newPoints);
  };

  return (
    <MapContainer
      center={[9.0765, 7.3986]} // Default to Abuja (Update if needed)
      zoom={12}
      style={{
        height: "100%",
        width: "100%",
        borderRadius: "0.75rem",
        zIndex: 0,
      }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <ClickHandler isDrawing={isDrawing} onAddPoint={handleAddPoint} />

      {/* Render Existing Zones */}
      {existingZones.map((zone) => (
        <Polygon
          key={zone.id}
          positions={zone.coordinates}
          pathOptions={{
            color: zone.isActive ? "green" : "gray",
            fillColor: zone.isActive ? "green" : "gray",
            fillOpacity: 0.2,
          }}
        />
      ))}

      {/* Render Current Drawing */}
      {currentPolygon.length > 0 && (
        <>
          <Polygon
            positions={currentPolygon}
            pathOptions={{ color: "blue", dashArray: "5, 10" }}
          />
          {currentPolygon.map((pos, idx) => (
            <Marker key={idx} position={pos} icon={icon} />
          ))}
        </>
      )}
    </MapContainer>
  );
};

export default MapEditor;
