import React, { useEffect, useState } from "react";
import { Card, Spin, Tag } from "antd";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import { useQuery } from "@tanstack/react-query";
import client from "../api/client";
import { getSocket } from "../services/socket";

interface Rider {
  id: string;
  name: string;
  phone: string;
  status: string;
  lastLat: number | null;
  lastLng: number | null;
}

const Tracking: React.FC = () => {
  const center: LatLngExpression = [-1.2921, 36.8219];
  const [liveRiders, setLiveRiders] = useState<Rider[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["riders"],
    queryFn: async () => (await client.get("/riders")).data,
  });

  const riders: Rider[] = data?.riders || [];

  useEffect(() => {
    setLiveRiders(riders);
  }, [riders]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onLocation = (payload: {
      riderId: string;
      lat: number;
      lng: number;
    }) => {
      setLiveRiders((prev) =>
        prev.map((r) =>
          r.id === payload.riderId
            ? { ...r, lastLat: payload.lat, lastLng: payload.lng }
            : r
        )
      );
    };

    socket.on("rider:location:update", onLocation);

    return () => {
      socket.off("rider:location:update", onLocation);
    };
  }, [riders.length]);

  const mappable = liveRiders.filter(
    (r) => r.lastLat != null && r.lastLng != null
  );

  return (
    <div>
      <h2>Live Tracking</h2>

      <Card style={{ marginTop: 12 }}>
        {isLoading ? (
          <div style={{ textAlign: "center", padding: 80 }}>
            <Spin size="large" />
          </div>
        ) : (
          <div style={{ height: 520 }}>
            <MapContainer
              center={center}
              zoom={12}
              style={{ height: "100%", borderRadius: 12 }}
            >
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {mappable.map((r) => (
                <Marker
                  key={r.id}
                  position={[r.lastLat!, r.lastLng!]}
                >
                  <Popup>
                    <div style={{ fontWeight: 700 }}>{r.name}</div>
                    <div>{r.phone}</div>
                    <Tag style={{ marginTop: 6 }}>{r.status}</Tag>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}

        {!isLoading && mappable.length === 0 && (
          <p style={{ textAlign: "center", color: "#888", marginTop: 12 }}>
            No rider locations available yet. Locations appear when riders are
            on active deliveries.
          </p>
        )}
      </Card>
    </div>
  );
};

export default Tracking;
