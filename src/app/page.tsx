"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";

interface Venue {
  id: string;
  slug: string;
  url: string;
  name: string;
  image: string | null;
  online: boolean | null;
  lastChecked: number | null;
  tracking: boolean;
}

interface SearchResult {
  slug: string;
  name: string;
  online: boolean;
  address: string;
  image: { url: string } | null;
  tags: string[];
  rating: { score: number } | null;
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}

function getUserId(): string {
  const key = "wolt-tracker-user-id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

// ─── Status badge component ───

function StatusBadge({ venue }: { venue: Venue }) {
  if (venue.online === null) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-wolt-bg-tertiary text-wolt-text-secondary">
        <span className="w-1.5 h-1.5 rounded-full bg-wolt-text-disabled animate-pulse" />
        Checking
      </span>
    );
  }
  if (venue.online) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
        <span className="w-1.5 h-1.5 rounded-full bg-wolt-positive" />
        Online
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600">
      <span className="w-1.5 h-1.5 rounded-full bg-wolt-negative" />
      Offline
    </span>
  );
}

// ─── Main app ───

export default function Home() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const [pushLoading, setPushLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const userIdRef = useRef<string>("");
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    userIdRef.current = getUserId();
  }, []);

  const headers = useCallback(
    () => ({
      "Content-Type": "application/json",
      "x-user-id": userIdRef.current,
    }),
    []
  );

  const fetchVenues = useCallback(async () => {
    if (!userIdRef.current) return;
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

  // ─── Search venues with debounce ───

  const searchVenues = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setSearchLoading(true);
    try {
      const res = await fetch(
        `/api/venues/search?q=${encodeURIComponent(q.trim())}`
      );
      const data = await res.json();
      setSearchResults(data.venues ?? []);
      setShowResults(true);
      setActiveIndex(-1);
    } catch (err) {
      console.error("Search failed:", err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  function handleQueryChange(value: string) {
    setQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      searchVenues(value);
    }, 300);
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ─── Keyboard navigation for search results ───

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (!showResults || searchResults.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev < searchResults.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev > 0 ? prev - 1 : searchResults.length - 1
      );
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectVenue(searchResults[activeIndex]);
    } else if (e.key === "Escape") {
      setShowResults(false);
    }
  }

  // ─── Select a venue from search results ───

  async function selectVenue(result: SearchResult) {
    setShowResults(false);
    setQuery("");
    setSearchResults([]);
    setLoading(true);

    try {
      const venueUrl = `https://wolt.com/he/isr/tel-aviv/restaurant/${result.slug}`;
      const res = await fetch("/api/venues", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ url: venueUrl }),
      });
      if (res.ok) {
        fetchVenues();
      }
    } catch (err) {
      console.error("Failed to add venue:", err);
    } finally {
      setLoading(false);
    }
  }

  const setupPush = useCallback(async ({ interactive = false } = {}) => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushError("Push notifications are not supported in this browser.");
      return;
    }

    if (interactive) setPushLoading(true);

    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Check if the user revoked permission after we got a subscription
      if (Notification.permission === "denied") {
        setPushEnabled(false);
        setPushError("Notifications are blocked. Please enable them in your browser settings.");
        return;
      }

      const existingSub = await registration.pushManager.getSubscription();

      // If we have an existing subscription AND permission is still granted, we're good
      if (existingSub && Notification.permission === "granted") {
        await sendSubscriptionToServer(existingSub);
        setPushEnabled(true);
        return;
      }

      // For non-interactive (initial page load), don't prompt — just show the enable button
      if (!interactive && Notification.permission !== "granted") {
        setPushError("Enable notifications to get alerts when venues open.");
        return;
      }

      // Interactive click or permission already granted: request permission and subscribe
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushError(
          permission === "denied"
            ? "Notifications are blocked. Please enable them in your browser settings."
            : "Enable notifications to get alerts when venues open."
        );
        setPushEnabled(false);
        return;
      }

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        setPushError("VAPID public key not configured.");
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      await sendSubscriptionToServer(subscription);
      setPushError(null);
      setPushEnabled(true);
    } catch (err) {
      console.error("Push setup failed:", err);
      setPushError("Something went wrong setting up notifications.");
    } finally {
      setPushLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headers]);

  useEffect(() => {
    const timeout = setTimeout(() => setupPush({ interactive: false }), 200);
    return () => clearTimeout(timeout);
  }, [setupPush]);

  async function sendSubscriptionToServer(subscription: PushSubscription) {
    await fetch("/api/subscribe", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(subscription.toJSON()),
    });
  }

  async function addVenue(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    // If user typed a URL or slug directly (no search result selected), submit it
    setShowResults(false);
    setLoading(true);
    try {
      const res = await fetch("/api/venues", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ url: query }),
      });
      if (res.ok) {
        setQuery("");
        setSearchResults([]);
        fetchVenues();
      }
    } catch (err) {
      console.error("Failed to add venue:", err);
    } finally {
      setLoading(false);
    }
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

  function timeAgo(ts: number | null): string {
    if (!ts) return "never";
    const diff = Date.now() - ts;
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  }

  return (
    <div className="min-h-screen bg-wolt-bg-secondary">
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-wolt-bg-primary border-b border-wolt-border">
        <div className="max-w-[640px] mx-auto px-4 h-14 flex items-center gap-3">
          {/* Wolt-style logo mark */}
          <div className="w-8 h-8 rounded-[8px] bg-wolt-blue flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z" fill="white"/>
            </svg>
          </div>
          <h1 className="font-heading text-lg font-semibold text-wolt-text-primary tracking-tight">
            Venue Tracker
          </h1>

          {/* Notification status pill */}
          <div className="ml-auto">
            {pushEnabled ? (
              <button
                onClick={() => setupPush({ interactive: true })}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 transition-colors cursor-pointer"
                title="Notifications are enabled"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-wolt-positive" />
                Notifications on
              </button>
            ) : pushError ? (
              <button
                onClick={() => setupPush({ interactive: true })}
                disabled={pushLoading}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer disabled:opacity-60"
              >
                {pushLoading ? (
                  <span className="inline-block w-3 h-3 border-[1.5px] border-amber-300 border-t-amber-700 rounded-full animate-spin" />
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" fill="currentColor"/>
                  </svg>
                )}
                Enable alerts
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs text-wolt-text-disabled">
                <span className="w-1.5 h-1.5 rounded-full bg-wolt-text-disabled animate-pulse" />
                Connecting...
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[640px] mx-auto px-4 py-6">
        {/* Search / Add form — with autocomplete suggestions */}
        <div ref={searchRef} className="relative mb-6">
          <form onSubmit={addVenue}>
            <div
              className={`flex items-center bg-wolt-bg-primary rounded-[12px] border border-wolt-border overflow-hidden transition-shadow focus-within:shadow-[0_0_0_2px_var(--wolt-blue)] ${
                showResults && searchResults.length > 0 ? "rounded-b-none border-b-0" : ""
              }`}
            >
              <div className="pl-4 text-wolt-text-disabled">
                {searchLoading ? (
                  <span className="inline-block w-5 h-5 border-2 border-wolt-border border-t-wolt-blue rounded-full animate-spin" />
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/>
                  </svg>
                )}
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                onFocus={() => {
                  if (searchResults.length > 0) setShowResults(true);
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search for a restaurant or paste a Wolt link"
                className="flex-1 h-12 px-3 bg-transparent text-sm text-wolt-text-primary placeholder:text-wolt-text-disabled outline-none"
              />
              {query.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setSearchResults([]);
                    setShowResults(false);
                  }}
                  className="px-2 text-wolt-text-disabled hover:text-wolt-text-secondary transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" fill="currentColor"/>
                  </svg>
                </button>
              )}
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="h-12 px-5 text-sm font-semibold text-white bg-wolt-blue hover:bg-wolt-blue-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Track"
                )}
              </button>
            </div>
          </form>

          {/* Search results dropdown */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 z-20 bg-wolt-bg-primary border border-wolt-border border-t-0 rounded-b-[12px] shadow-[0_4px_16px_rgba(0,0,0,0.12)] max-h-[360px] overflow-y-auto">
              {searchResults.map((result, index) => (
                <button
                  key={result.slug}
                  type="button"
                  onClick={() => selectVenue(result)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    index === activeIndex
                      ? "bg-wolt-bg-secondary"
                      : "hover:bg-wolt-bg-secondary"
                  } ${index === searchResults.length - 1 ? "rounded-b-[12px]" : ""}`}
                >
                  {/* Venue image */}
                  {result.image ? (
                    <Image
                      src={`${result.image.url}?w=96`}
                      alt={result.name}
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-[8px] object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-[8px] bg-wolt-bg-tertiary flex items-center justify-center flex-shrink-0">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" fill="#a1a5ad"/>
                      </svg>
                    </div>
                  )}

                  {/* Venue info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-wolt-text-primary truncate">
                        {result.name}
                      </span>
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        result.online ? "bg-wolt-positive" : "bg-wolt-negative"
                      }`} />
                    </div>
                    {result.address && (
                      <p className="text-xs text-wolt-text-secondary truncate">
                        {result.address}
                      </p>
                    )}
                    {result.tags.length > 0 && (
                      <p className="text-xs text-wolt-text-disabled truncate">
                        {result.tags.slice(0, 3).join(" · ")}
                      </p>
                    )}
                  </div>

                  {/* Rating */}
                  {result.rating && result.rating.score > 0 && (
                    <span className="text-xs font-medium text-wolt-text-secondary flex-shrink-0">
                      {result.rating.score.toFixed(1)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Venue list */}
        {venues.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-wolt-bg-tertiary flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18.36 9l.6 3H5.04l.6-3h12.72M20 4H4v2h16V4zm0 3H4l-1 5v2h1v6h10v-6h4v6h2v-6h1v-2l-1-5zM6 18v-4h6v4H6z" fill="#a1a5ad"/>
              </svg>
            </div>
            <p className="text-sm font-semibold text-wolt-text-primary mb-1">
              No venues tracked yet
            </p>
            <p className="text-sm text-wolt-text-secondary max-w-[280px] mx-auto leading-relaxed">
              Search for a restaurant above and we&apos;ll let you know when it opens
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {venues.map((venue) => (
              <div
                key={venue.id}
                className="bg-wolt-bg-primary rounded-[12px] border border-wolt-border p-4 transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
              >
                <div className="flex items-start gap-3">
                  {/* Venue image or fallback icon */}
                  {venue.image ? (
                    <Image
                      src={`${venue.image}?w=200`}
                      alt={venue.name}
                      width={48}
                      height={48}
                      className={`w-12 h-12 rounded-[8px] object-cover flex-shrink-0 ${
                        !venue.tracking ? "opacity-50 grayscale" : ""
                      }`}
                    />
                  ) : (
                    <div className={`w-12 h-12 rounded-[8px] flex items-center justify-center flex-shrink-0 ${
                      venue.online
                        ? "bg-green-50"
                        : venue.online === false
                          ? "bg-red-50"
                          : "bg-wolt-bg-tertiary"
                    }`}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z"
                          fill={
                            venue.online
                              ? "#1fc70a"
                              : venue.online === false
                                ? "#f93a25"
                                : "#a1a5ad"
                          }
                        />
                      </svg>
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <a
                        href={venue.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-wolt-text-primary hover:text-wolt-blue transition-colors truncate"
                      >
                        {venue.name}
                      </a>
                      <StatusBadge venue={venue} />
                      {!venue.tracking && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600">
                          Paused
                        </span>
                      )}
                    </div>
                    {venue.name !== venue.slug && (
                      <p className="text-xs text-wolt-text-disabled truncate mb-0.5">
                        {venue.slug}
                      </p>
                    )}
                    <p className="text-xs text-wolt-text-secondary">
                      {venue.lastChecked
                        ? `Last checked ${timeAgo(venue.lastChecked)}`
                        : "Waiting for first check"}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => toggleTracking(venue.id, venue.tracking)}
                      className="h-8 px-3 text-xs font-medium rounded-[8px] text-wolt-text-secondary hover:bg-wolt-bg-secondary transition-colors"
                    >
                      {venue.tracking ? "Pause" : "Resume"}
                    </button>
                    <button
                      onClick={() => deleteVenue(venue.id)}
                      className="h-8 w-8 flex items-center justify-center rounded-[8px] text-wolt-text-disabled hover:text-wolt-negative hover:bg-red-50 transition-colors"
                      title="Remove"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" fill="currentColor"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
