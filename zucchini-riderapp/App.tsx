import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import * as Location from "expo-location";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import RootNavigator from "./src/navigation/index";
import client from "./src/api/client";
import { endpoints } from "./src/api/endpoints";

// Pushes the rider's live location to the backend every 30s while logged in,
// so the web dashboard's tracking map (Order Tracking module) stays current.
const LocationSync: React.FC = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.riderId) return;
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted" || cancelled) return;

      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 30000, distanceInterval: 50 },
        (loc) => {
          client
            .post(endpoints.riders.locationUpdate(user.riderId as string), {
              lat: loc.coords.latitude,
              lng: loc.coords.longitude,
            })
            .catch(() => {
              // best-effort — dropped location pings shouldn't interrupt the rider
            });
        }
      );
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [user?.riderId]);

  return null;
};

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <LocationSync />
      <RootNavigator />
    </AuthProvider>
  );
}
