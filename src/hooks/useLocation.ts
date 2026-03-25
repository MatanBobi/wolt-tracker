import { useState, useCallback, useEffect, useRef } from "react";

export type LocationStatus = "idle" | "loading" | "resolved" | "error";

export interface AddressSuggestion {
  displayName: string;
  lat: number;
  lon: number;
}

interface GeocodedLocation {
  lat: number;
  lon: number;
  displayName: string;
}

const STORAGE_KEY = "wolt-tracker:address";

export function useLocation() {
  const [location, setLocation] = useState<GeocodedLocation | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [address, setAddress] = useState("");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Restore saved address from localStorage on mount,
  // or fall back to browser geolocation
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed: GeocodedLocation = JSON.parse(saved);
        setLocation(parsed);
        setAddress(parsed.displayName);
        setLocationStatus("resolved");
        return;
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    // No saved address — try browser geolocation as fallback
    if (!("geolocation" in navigator)) return;

    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        // Reverse-geocode to get a display name
        try {
          const res = await fetch(
            `https://photon.komoot.io/reverse?lat=${latitude}&lon=${longitude}`,
            { headers: { Accept: "application/json" } },
          );
          const data = await res.json();
          const feature = data.features?.[0];
          let displayName = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          if (feature?.properties) {
            const p = feature.properties;
            const parts = [
              p.name,
              [p.street, p.housenumber].filter(Boolean).join(" "),
              p.city,
              p.country,
            ].filter(Boolean);
            const unique = parts.filter(
              (part: string, i: number) => part !== parts[i - 1],
            );
            if (unique.length > 0) displayName = unique.join(", ");
          }
          const geocoded: GeocodedLocation = {
            lat: latitude,
            lon: longitude,
            displayName,
          };
          setLocation(geocoded);
          setAddress(displayName);
          setLocationStatus("resolved");
          localStorage.setItem(STORAGE_KEY, JSON.stringify(geocoded));
        } catch {
          // Reverse geocode failed but we still have coordinates
          const geocoded: GeocodedLocation = {
            lat: latitude,
            lon: longitude,
            displayName: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          };
          setLocation(geocoded);
          setAddress(geocoded.displayName);
          setLocationStatus("resolved");
          localStorage.setItem(STORAGE_KEY, JSON.stringify(geocoded));
        }
      },
      () => {
        // Geolocation denied or failed — stay idle, user can type an address
        setLocationStatus("idle");
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }, []);

  const fetchSuggestions = useCallback(async (input: string) => {
    const trimmed = input.trim();
    if (trimmed.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLocationStatus("loading");
    try {
      const params = new URLSearchParams({
        q: trimmed,
        limit: "5",
      });
      const res = await fetch(`https://photon.komoot.io/api/?${params}`, {
        headers: { Accept: "application/json" },
      });
      const data = await res.json();

      const results: AddressSuggestion[] = (data.features ?? []).map(
        (f: {
          geometry: { coordinates: [number, number] };
          properties: {
            name?: string;
            street?: string;
            housenumber?: string;
            city?: string;
            country?: string;
          };
        }) => {
          const p = f.properties;
          const parts = [
            p.name,
            [p.street, p.housenumber].filter(Boolean).join(" "),
            p.city,
            p.country,
          ].filter(Boolean);
          // Deduplicate consecutive identical parts
          const unique = parts.filter((part, i) => part !== parts[i - 1]);
          return {
            displayName: unique.join(", "),
            lat: f.geometry.coordinates[1],
            lon: f.geometry.coordinates[0],
          };
        },
      );

      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setLocationStatus(results.length > 0 ? "idle" : "error");
    } catch {
      setSuggestions([]);
      setShowSuggestions(false);
      setLocationStatus("error");
    }
  }, []);

  const handleAddressChange = useCallback(
    (value: string) => {
      setAddress(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (!value.trim()) {
        setLocation(null);
        setLocationStatus("idle");
        setSuggestions([]);
        setShowSuggestions(false);
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      debounceRef.current = setTimeout(() => {
        fetchSuggestions(value);
      }, 300);
    },
    [fetchSuggestions],
  );

  const selectSuggestion = useCallback((suggestion: AddressSuggestion) => {
    const geocoded: GeocodedLocation = {
      lat: suggestion.lat,
      lon: suggestion.lon,
      displayName: suggestion.displayName,
    };
    setLocation(geocoded);
    setAddress(suggestion.displayName);
    setLocationStatus("resolved");
    setSuggestions([]);
    setShowSuggestions(false);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(geocoded));
  }, []);

  const clearAddress = useCallback(() => {
    setAddress("");
    setLocation(null);
    setLocationStatus("idle");
    setSuggestions([]);
    setShowSuggestions(false);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const dismissSuggestions = useCallback(() => {
    setShowSuggestions(false);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return {
    location: location ? { lat: location.lat, lon: location.lon } : null,
    locationStatus,
    address,
    suggestions,
    showSuggestions,
    handleAddressChange,
    selectSuggestion,
    clearAddress,
    dismissSuggestions,
  };
}
