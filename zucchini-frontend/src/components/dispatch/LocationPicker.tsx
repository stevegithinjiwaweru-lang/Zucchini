import React, { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import { AutoComplete, Input, Spin } from "antd";
import { EnvironmentOutlined } from "@ant-design/icons";

export interface LocationValue {
  address: string;
  lat: number;
  lng: number;
}

interface LocationPickerProps {
  label?: string;
  value?: LocationValue | null;
  onChange: (value: LocationValue) => void;
  // Nairobi by default — Zucchini's current operating area.
  defaultCenter?: [number, number];
}

// Free-tier OpenStreetMap Nominatim endpoints. Fine for a single merchant's
// dispatch volume; if order volume grows, swap these for a paid geocoding
// provider (Google Places, Mapbox) and a proper API key.
const NOMINATIM_SEARCH = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_REVERSE = "https://nominatim.openstreetmap.org/reverse";

type NominatimResult = { display_name: string; lat: string; lon: string };

async function runSearch(params: URLSearchParams): Promise<NominatimResult[]> {
  try {
    const resp = await fetch(`${NOMINATIM_SEARCH}?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });
    if (!resp.ok) return [];
    return (await resp.json()) as NominatimResult[];
  } catch {
    // Network hiccup / CORS / offline — fail soft, let the caller retry or
    // fall back rather than throwing and breaking the search box.
    return [];
  }
}

// Small residential estates, apartment blocks, and gated compounds are often
// missing or sparsely tagged in OpenStreetMap's Kenya data, especially under
// their commonly-used name (e.g. "Greenspan Estate" vs. the road it's on).
// A single tightly-bounded query frequently comes back empty for these, so
// we search in two passes: first biased tightly to the current map area
// (best relevance), then — only if that comes back empty — a second,
// unbounded nationwide search so an estate further away or lightly-mapped
// still has a chance to resolve instead of the user seeing "no results".
async function searchAddress(query: string, biasLat: number, biasLng: number) {
  const baseParams = {
    q: query,
    format: "json",
    addressdetails: "1",
    namedetails: "1",
    limit: "8",
    countrycodes: "ke",
  };

  const bounded = await runSearch(
    new URLSearchParams({
      ...baseParams,
      viewbox: `${biasLng - 1},${biasLat + 1},${biasLng + 1},${biasLat - 1}`,
      bounded: "1",
    })
  );
  if (bounded.length > 0) return bounded;

  // Fall back to an unbounded, countrywide search (still Kenya-only) so
  // estates outside the tight bounding box, or ones OSM only geocodes
  // loosely, still turn up.
  return runSearch(new URLSearchParams(baseParams));
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: "json",
    addressdetails: "1",
    // High zoom = building/estate-level detail rather than just the
    // surrounding suburb or road.
    zoom: "18",
  });
  try {
    const resp = await fetch(`${NOMINATIM_REVERSE}?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });
    if (!resp.ok) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    const data = await resp.json();
    return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e: any) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

const NAIROBI: [number, number] = [-1.286389, 36.817223];

const LocationPicker: React.FC<LocationPickerProps> = ({
  label,
  value,
  onChange,
  defaultCenter = NAIROBI,
}) => {
  const [query, setQuery] = useState(value?.address || "");
  const [options, setOptions] = useState<{ value: string; lat: number; lng: number }[]>([]);
  const [searching, setSearching] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const position: LatLngExpression = useMemo(
    () => (value ? [value.lat, value.lng] : defaultCenter),
    [value, defaultCenter]
  );

  useEffect(() => {
    setQuery(value?.address || "");
  }, [value?.address]);

  const handleSearch = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length < 3) {
      setOptions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchAddress(text, defaultCenter[0], defaultCenter[1]);
        setOptions(
          results.map((r) => ({ value: r.display_name, lat: parseFloat(r.lat), lng: parseFloat(r.lon) }))
        );
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const handleSelect = (_: string, option: any) => {
    onChange({ address: option.value, lat: option.lat, lng: option.lng });
  };

  const handlePick = async (lat: number, lng: number) => {
    setGeocoding(true);
    try {
      const address = await reverseGeocode(lat, lng);
      setQuery(address);
      onChange({ address, lat, lng });
    } finally {
      setGeocoding(false);
    }
  };

  return (
    <div style={{ marginBottom: 16 }}>
      {label && <div style={{ marginBottom: 6, fontWeight: 500 }}>{label}</div>}
      <AutoComplete
        style={{ width: "100%", marginBottom: 8 }}
        value={query}
        options={options}
        onSearch={handleSearch}
        onSelect={handleSelect}
        onChange={(v) => setQuery(v)}
      >
        <Input
          placeholder="Search for an address, or click the map below"
          prefix={<EnvironmentOutlined />}
          suffix={searching ? <Spin size="small" /> : null}
        />
      </AutoComplete>

      <div style={{ height: 260, borderRadius: 8, overflow: "hidden", position: "relative" }}>
        <MapContainer center={position} zoom={value ? 15 : 12} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onPick={handlePick} />
          {value && (
            <Marker
              position={[value.lat, value.lng]}
              draggable
              eventHandlers={{
                dragend: (e: any) => {
                  const marker = e.target;
                  const { lat, lng } = marker.getLatLng();
                  handlePick(lat, lng);
                },
              }}
            />
          )}
        </MapContainer>
        {geocoding && (
          <div
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              background: "rgba(255,255,255,0.9)",
              padding: "2px 8px",
              borderRadius: 4,
              fontSize: 12,
              zIndex: 1000,
            }}
          >
            <Spin size="small" /> Locating…
          </div>
        )}
      </div>
      <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
        Click anywhere on the map to drop a pin, or drag the pin to fine-tune.
      </div>
    </div>
  );
};

export default LocationPicker;
