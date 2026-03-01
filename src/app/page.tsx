"use client";

import { useState, useCallback, useMemo } from "react";
import type { SearchResult } from "@/types";
import { getUserId } from "@/lib/utils";
import { useLocation } from "@/hooks/useLocation";
import { useVenues } from "@/hooks/useVenues";
import { useSearch } from "@/hooks/useSearch";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Header } from "@/components/Header";
import { SearchBar } from "@/components/SearchBar";
import { VenueList } from "@/components/VenueList";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const userId = useMemo(
    () => (typeof window === "undefined" ? "" : getUserId()),
    []
  );

  const headers = useCallback(
    () => ({
      "Content-Type": "application/json",
      "x-user-id": userId,
    }),
    [userId]
  );

  const { location, locationStatus, requestLocation } = useLocation();
  const { venues, addVenue, deleteVenue, toggleTracking } = useVenues(headers);
  const {
    query,
    searchResults,
    searchLoading,
    showResults,
    activeIndex,
    searchRef,
    setShowResults,
    setActiveIndex,
    handleQueryChange,
    clearSearch,
  } = useSearch(location);
  const { pushEnabled, pushError, pushLoading, setupPush } =
    usePushNotifications(headers);

  async function handleSelectVenue(result: SearchResult) {
    setShowResults(false);
    clearSearch();
    setLoading(true);
    try {
      const venueUrl = `https://wolt.com/he/isr/tel-aviv/restaurant/${result.slug}`;
      await addVenue(venueUrl);
    } catch (err) {
      console.error("Failed to add venue:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setShowResults(false);
    setLoading(true);
    try {
      const ok = await addVenue(query);
      if (ok) clearSearch();
    } catch (err) {
      console.error("Failed to add venue:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-wolt-bg-secondary">
      <Header
        location={location}
        locationStatus={locationStatus}
        requestLocation={requestLocation}
        pushEnabled={pushEnabled}
        pushError={pushError}
        pushLoading={pushLoading}
        setupPush={setupPush}
      />

      <main className="max-w-[640px] mx-auto px-4 py-6">
        <SearchBar
          query={query}
          loading={loading}
          searchLoading={searchLoading}
          searchResults={searchResults}
          showResults={showResults}
          activeIndex={activeIndex}
          searchRef={searchRef}
          onQueryChange={handleQueryChange}
          onClear={clearSearch}
          onSubmit={handleSubmit}
          onSelectVenue={handleSelectVenue}
          onSetShowResults={setShowResults}
          onSetActiveIndex={setActiveIndex}
        />

        <VenueList
          venues={venues}
          onToggleTracking={toggleTracking}
          onDelete={deleteVenue}
        />
      </main>
    </div>
  );
}
