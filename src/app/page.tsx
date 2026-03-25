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
  const [alreadyOpenMessage, setAlreadyOpenMessage] = useState<string | null>(
    null,
  );
  const userId = useMemo(
    () => (typeof window === "undefined" ? "" : getUserId()),
    [],
  );

  const headers = useCallback(
    () => ({
      "Content-Type": "application/json",
      "x-user-id": userId,
    }),
    [userId],
  );

  const {
    location,
    locationStatus,
    address,
    suggestions,
    showSuggestions,
    handleAddressChange,
    selectSuggestion,
    clearAddress,
    dismissSuggestions,
  } = useLocation();
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
  const {
    pushEnabled,
    pushError,
    pushLoading,
    setupPush,
    updateAvailable,
    applyUpdate,
  } = usePushNotifications(headers);

  async function handleSelectVenue(result: SearchResult) {
    setShowResults(false);
    clearSearch();
    setLoading(true);
    setAlreadyOpenMessage(null);
    try {
      const venueUrl = `https://wolt.com/he/isr/tel-aviv/restaurant/${result.slug}`;
      const { alreadyOpen, name } = await addVenue(venueUrl);
      if (alreadyOpen) {
        setAlreadyOpenMessage(
          `${name || result.slug} is already open! No need to track it.`,
        );
      }
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
    setAlreadyOpenMessage(null);
    try {
      const { ok, alreadyOpen, name } = await addVenue(query);
      if (alreadyOpen) {
        setAlreadyOpenMessage(
          `${name || query} is already open! No need to track it.`,
        );
      }
      if (ok && !alreadyOpen) clearSearch();
    } catch (err) {
      console.error("Failed to add venue:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-wolt-bg-secondary">
      <Header
        address={address}
        locationStatus={locationStatus}
        suggestions={suggestions}
        showSuggestions={showSuggestions}
        onAddressChange={handleAddressChange}
        onSelectSuggestion={selectSuggestion}
        onClearAddress={clearAddress}
        onDismissSuggestions={dismissSuggestions}
        pushEnabled={pushEnabled}
        pushError={pushError}
        pushLoading={pushLoading}
        setupPush={setupPush}
      />

      {updateAvailable && (
        <div className="bg-wolt-blue text-white text-center py-2 px-4 text-sm flex items-center justify-center gap-2">
          <span>A new version is available.</span>
          <button
            onClick={applyUpdate}
            className="underline font-semibold hover:opacity-80 cursor-pointer"
          >
            Refresh
          </button>
        </div>
      )}

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

        {alreadyOpenMessage && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm flex items-center justify-between">
            <span>{alreadyOpenMessage}</span>
            <button
              onClick={() => setAlreadyOpenMessage(null)}
              className="ml-2 text-green-600 hover:text-green-800 font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        <VenueList
          venues={venues}
          onToggleTracking={toggleTracking}
          onDelete={deleteVenue}
        />
      </main>
    </div>
  );
}
