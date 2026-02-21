"use client";
/**
 * LiveMapCanvas — Google Maps canvas for the Live Fleet Map.
 * Dynamically imported (no SSR) from the maps page.
 *
 * Blue markers = DRIVER (ride-hailing)
 * Black markers = RIDER (delivery)
 * Hover → InfoWindow with name, status, last seen
 * Click → calls onMarkerClick to open the detail sidebar
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import { GoogleMap, Marker, InfoWindow } from "@react-google-maps/api";
import { useGoogleMaps } from "@/providers/GoogleMapsProvider";
import { Loader2 } from "lucide-react";
import type { LiveMapUser } from "./page";

// ── Map Style (dark, same palette as rider detail map) ────────────────────────
const MAP_STYLE: google.maps.MapTypeStyle[] = [
  {
    featureType: "all",
    elementType: "geometry",
    stylers: [{ color: "#1a2332" }],
  },
  {
    featureType: "all",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#1a2332" }],
  },
  {
    featureType: "all",
    elementType: "labels.text.fill",
    stylers: [{ color: "#7a8599" }],
  },
  {
    featureType: "poi",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#2c3e55" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#212a37" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#3a4d66" }],
  },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0d1b2a" }],
  },
];

const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  styles: MAP_STYLE,
};

const CONTAINER_STYLE = { width: "100%", height: "100%" };

// ── Default center (Lagos) ────────────────────────────────────────────────────
const DEFAULT_CENTER = { lat: 6.5244, lng: 3.3792 };

// ── SVG marker generators ─────────────────────────────────────────────────────
function makeDriverIcon(
  isSelected: boolean,
  isOnJob: boolean,
  isOffline: boolean,
): google.maps.Icon {
  // Online: blue. Offline: dimmed gray-blue. Gold ring when on a job.
  const fill = isOffline
    ? isSelected
      ? "#4B6A8A"
      : "#2d4a6a"
    : isSelected
      ? "#60a5fa"
      : "#3b82f6";
  const ring = isOffline ? "#4B5563" : isOnJob ? "#eab308" : "#ffffff";
  const opacity = isOffline ? "0.55" : "1";
  const innerFill = isOffline ? "#6B7280" : "#ffffff";
  const size = isOffline ? 30 : 36;
  const half = size / 2;
  const r = isOffline ? 11 : 14;
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" opacity="${opacity}">
      <circle cx="${half}" cy="${half}" r="${r}" fill="${fill}" stroke="${ring}" stroke-width="2.5" stroke-dasharray="${isOffline ? "3 2" : "none"}"/>
      <circle cx="${half}" cy="${half}" r="4" fill="${innerFill}"/>
    </svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(half, half),
  };
}

function makeRiderIcon(
  isSelected: boolean,
  isOnJob: boolean,
  isOffline: boolean,
): google.maps.Icon {
  // Online: red. Offline: dimmed red. Gold ring when on a job.
  const fill = isOffline
    ? isSelected
      ? "#7f1d1d"
      : "#5a1212"
    : isSelected
      ? "#f87171"
      : "#ef4444";
  const ring = isOffline ? "#7f1d1d" : isOnJob ? "#eab308" : "#ffffff";
  const opacity = isOffline ? "0.55" : "1";
  const innerFill = isOffline ? "#b91c1c" : "#ffffff";
  const size = isOffline ? 30 : 36;
  const half = size / 2;
  const r = isOffline ? 11 : 14;
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" opacity="${opacity}">
      <circle cx="${half}" cy="${half}" r="${r}" fill="${fill}" stroke="${ring}" stroke-width="2.5" stroke-dasharray="${isOffline ? "3 2" : "none"}"/>
      <circle cx="${half}" cy="${half}" r="4" fill="${innerFill}"/>
    </svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(half, half),
  };
}

// ── Format helpers ────────────────────────────────────────────────────────────
function formatLastSeen(ms: number): string {
  if (!ms) return "Unknown";
  const diff = Date.now() - ms;
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  users: LiveMapUser[];
  onMarkerClick: (user: LiveMapUser) => void;
}

export default function LiveMapCanvas({ users, onMarkerClick }: Props) {
  const { isLoaded } = useGoogleMaps();
  const mapRef = useRef<google.maps.Map | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Track whether we've done the initial fit — never auto-fit again after that
  const hasFitRef = useRef(false);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  // Fit to all markers exactly once — when the map is ready AND users are loaded
  useEffect(() => {
    if (hasFitRef.current) return; // already fitted once
    if (!mapRef.current) return; // map not ready yet
    if (!users.length) return; // no users yet
    const bounds = new google.maps.LatLngBounds();
    users.forEach((u) => bounds.extend({ lat: u.lat, lng: u.lng }));
    mapRef.current.fitBounds(bounds, 60);
    hasFitRef.current = true;
  }, [users]);

  const hoveredUser = useMemo(
    () => users.find((u) => u.id === hoveredId) ?? null,
    [users, hoveredId],
  );

  if (!isLoaded) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0F172A] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
        <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">
          Loading Google Maps…
        </span>
      </div>
    );
  }

  return (
    <div className="flex-1 relative">
      <GoogleMap
        mapContainerStyle={CONTAINER_STYLE}
        center={DEFAULT_CENTER}
        zoom={13}
        options={MAP_OPTIONS}
        onLoad={onMapLoad}
        onClick={() => {
          setHoveredId(null);
          setSelectedId(null);
        }}
      >
        {users.map((user) => {
          const isSelected = user.id === selectedId;
          const isHovered = user.id === hoveredId;
          const isOnJob = Boolean(user.currentJobId);
          const isOffline = user.status === "OFFLINE";
          const icon =
            user.role === "DRIVER"
              ? makeDriverIcon(isSelected || isHovered, isOnJob, isOffline)
              : makeRiderIcon(isSelected || isHovered, isOnJob, isOffline);

          return (
            <Marker
              key={user.id}
              position={{ lat: user.lat, lng: user.lng }}
              icon={icon}
              // Offline markers render behind online ones
              zIndex={isOffline ? 0 : isSelected ? 999 : isHovered ? 998 : 1}
              onMouseOver={() => setHoveredId(user.id)}
              onMouseOut={() => setHoveredId(null)}
              onClick={() => {
                setSelectedId(user.id);
                onMarkerClick(user);
              }}
            />
          );
        })}

        {/* Hover tooltip via InfoWindow */}
        {hoveredUser && (
          <InfoWindow
            position={{ lat: hoveredUser.lat, lng: hoveredUser.lng }}
            options={{
              pixelOffset: new google.maps.Size(0, -22),
              disableAutoPan: true,
            }}
            onCloseClick={() => setHoveredId(null)}
          >
            <div
              style={{
                background: "#1E293B",
                color: "#fff",
                borderRadius: "10px",
                padding: "10px 14px",
                fontSize: "11px",
                lineHeight: "1.7",
                minWidth: "160px",
                border: `2px solid ${hoveredUser.role === "DRIVER" ? "#3b82f6" : "#ef4444"}`,
              }}
            >
              <div
                style={{ fontWeight: 700, fontSize: "13px", marginBottom: 4 }}
              >
                {hoveredUser.name}
              </div>
              <div style={{ color: "#94a3b8" }}>
                <span
                  style={{
                    color:
                      hoveredUser.role === "DRIVER" ? "#60a5fa" : "#f87171",
                    fontWeight: 700,
                  }}
                >
                  {hoveredUser.role}
                </span>
                {" · "}
                <span
                  style={{
                    color:
                      hoveredUser.status === "ONLINE" ||
                      hoveredUser.status === "ACTIVE"
                        ? "#4ade80"
                        : hoveredUser.status === "OFFLINE"
                          ? "#6b7280"
                          : "#eab308",
                    fontWeight: 700,
                  }}
                >
                  {hoveredUser.status}
                </span>
              </div>
              {hoveredUser.plateNumber && (
                <div style={{ color: "#94a3b8", fontFamily: "monospace" }}>
                  🚗 {hoveredUser.plateNumber}
                </div>
              )}
              <div style={{ color: "#64748b", marginTop: 2 }}>
                Last seen: {formatLastSeen(hoveredUser.lastSeen)}
              </div>
              {hoveredUser.currentJobId && (
                <div
                  style={{
                    marginTop: 4,
                    padding: "2px 6px",
                    background: "#eab30820",
                    border: "1px solid #eab30840",
                    borderRadius: 4,
                    color: "#eab308",
                    fontWeight: 700,
                  }}
                >
                  ON JOB ({hoveredUser.currentJobType})
                </div>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Empty state overlay */}
      {users.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-[#1E293B]/90 border border-gray-700 rounded-2xl px-8 py-6 text-center">
            <p className="text-white font-bold text-sm">
              No fleet members with known location
            </p>
            <p className="text-gray-500 text-xs mt-1">
              Drivers and riders appear once they have sent a GPS location
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
