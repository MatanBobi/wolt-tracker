import { useState, useCallback, useEffect } from "react";

export type LocationStatus = "pending" | "granted" | "denied" | "unavailable";

export function useLocation() {
  const [location, setLocation] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [locationStatus, setLocationStatus] =
    useState<LocationStatus>("pending");

  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setLocationStatus("unavailable");
      return;
    }

    setLocationStatus("pending");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
        setLocationStatus("granted");
      },
      (error) => {
        console.warn("Geolocation error:", error.message);
        setLocationStatus(
          error.code === error.PERMISSION_DENIED ? "denied" : "unavailable"
        );
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 }
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  return { location, locationStatus, requestLocation };
}
