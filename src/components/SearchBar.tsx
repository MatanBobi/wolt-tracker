import Image from "next/image";
import type { SearchResult } from "@/types";

interface SearchBarProps {
  query: string;
  loading: boolean;
  searchLoading: boolean;
  searchResults: SearchResult[];
  showResults: boolean;
  activeIndex: number;
  searchRef: React.RefObject<HTMLDivElement | null>;
  onQueryChange: (value: string) => void;
  onClear: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onSelectVenue: (result: SearchResult) => void;
  onSetShowResults: (show: boolean) => void;
  onSetActiveIndex: (index: number) => void;
}

export function SearchBar({
  query,
  loading,
  searchLoading,
  searchResults,
  showResults,
  activeIndex,
  searchRef,
  onQueryChange,
  onClear,
  onSubmit,
  onSelectVenue,
  onSetShowResults,
  onSetActiveIndex,
}: SearchBarProps) {
  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showResults || searchResults.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      onSetActiveIndex(
        activeIndex < searchResults.length - 1 ? activeIndex + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      onSetActiveIndex(
        activeIndex > 0 ? activeIndex - 1 : searchResults.length - 1
      );
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      onSelectVenue(searchResults[activeIndex]);
    } else if (e.key === "Escape") {
      onSetShowResults(false);
    }
  }

  return (
    <div ref={searchRef} className="relative mb-6">
      <form onSubmit={onSubmit}>
        <div
          className={`flex items-center bg-wolt-bg-primary rounded-[12px] border border-wolt-border overflow-hidden transition-shadow focus-within:shadow-[0_0_0_2px_var(--wolt-blue)] ${
            showResults && searchResults.length > 0
              ? "rounded-b-none border-b-0"
              : ""
          }`}
        >
          <div className="pl-4 text-wolt-text-disabled">
            {searchLoading ? (
              <span className="inline-block w-5 h-5 border-2 border-wolt-border border-t-wolt-blue rounded-full animate-spin" />
            ) : (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
                  fill="currentColor"
                />
              </svg>
            )}
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onFocus={() => {
              if (searchResults.length > 0) onSetShowResults(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search for a restaurant or paste a Wolt link"
            className="flex-1 h-12 px-3 bg-transparent text-sm text-wolt-text-primary placeholder:text-wolt-text-disabled outline-none"
          />
          {query.trim() && (
            <button
              type="button"
              onClick={onClear}
              className="px-2 text-wolt-text-disabled hover:text-wolt-text-secondary transition-colors"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"
                  fill="currentColor"
                />
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
        <SearchResultsDropdown
          results={searchResults}
          activeIndex={activeIndex}
          onSelect={onSelectVenue}
          onHover={onSetActiveIndex}
        />
      )}
    </div>
  );
}

// ─── Search results dropdown ───

function SearchResultsDropdown({
  results,
  activeIndex,
  onSelect,
  onHover,
}: {
  results: SearchResult[];
  activeIndex: number;
  onSelect: (result: SearchResult) => void;
  onHover: (index: number) => void;
}) {
  return (
    <div className="absolute left-0 right-0 z-20 bg-wolt-bg-primary border border-wolt-border border-t-0 rounded-b-[12px] shadow-[0_4px_16px_rgba(0,0,0,0.12)] max-h-[360px] overflow-y-auto">
      {results.map((result, index) => (
        <button
          key={result.slug}
          type="button"
          onClick={() => onSelect(result)}
          onMouseEnter={() => onHover(index)}
          className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
            index === activeIndex
              ? "bg-wolt-bg-secondary"
              : "hover:bg-wolt-bg-secondary"
          } ${index === results.length - 1 ? "rounded-b-[12px]" : ""}`}
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
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z"
                  fill="#a1a5ad"
                />
              </svg>
            </div>
          )}

          {/* Venue info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-wolt-text-primary truncate">
                {result.name}
              </span>
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  result.online ? "bg-wolt-positive" : "bg-wolt-negative"
                }`}
              />
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
  );
}
