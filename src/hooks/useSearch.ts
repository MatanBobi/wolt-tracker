import { useState, useCallback, useRef, useEffect } from "react";
import type { SearchResult } from "@/types";

export function useSearch(location: { lat: number; lon: number } | null) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const searchVenues = useCallback(
    async (q: string) => {
      if (q.trim().length < 2) {
        setSearchResults([]);
        setShowResults(false);
        return;
      }

      setSearchLoading(true);
      try {
        const params = new URLSearchParams({ q: q.trim() });
        if (location) {
          params.set("lat", String(location.lat));
          params.set("lon", String(location.lon));
        }
        const res = await fetch(`/api/venues/search?${params}`);
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
    },
    [location]
  );

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

  function clearSearch() {
    setQuery("");
    setSearchResults([]);
    setShowResults(false);
  }

  // Clean up debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

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

  return {
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
  };
}
