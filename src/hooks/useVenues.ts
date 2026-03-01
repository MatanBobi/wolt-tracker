import { useState, useCallback, useEffect } from "react";
import type { Venue } from "@/types";

export function useVenues(
  headers: () => Record<string, string>
) {
  const [venues, setVenues] = useState<Venue[]>([]);

  const fetchVenues = useCallback(async () => {
    try {
      const res = await fetch("/api/venues", { headers: headers() });
      const data = await res.json();
      setVenues(data.venues);
    } catch (err) {
      console.error("Failed to fetch venues:", err);
    }
  }, [headers]);

  useEffect(() => {
    const timeout = setTimeout(() => fetchVenues(), 100);
    const interval = setInterval(fetchVenues, 30_000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [fetchVenues]);

  async function addVenue(url: string) {
    const res = await fetch("/api/venues", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ url }),
    });
    if (res.ok) {
      fetchVenues();
    }
    return res.ok;
  }

  async function deleteVenue(id: string) {
    await fetch(`/api/venues?id=${id}`, {
      method: "DELETE",
      headers: headers(),
    });
    fetchVenues();
  }

  async function toggleTracking(id: string, tracking: boolean) {
    await fetch("/api/venues", {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ id, tracking: !tracking }),
    });
    fetchVenues();
  }

  return { venues, fetchVenues, addVenue, deleteVenue, toggleTracking };
}
