import { useRef, useEffect } from "react";
import type { LocationStatus, AddressSuggestion } from "@/hooks/useLocation";

interface HeaderProps {
  address: string;
  locationStatus: LocationStatus;
  suggestions: AddressSuggestion[];
  showSuggestions: boolean;
  onAddressChange: (value: string) => void;
  onSelectSuggestion: (suggestion: AddressSuggestion) => void;
  onClearAddress: () => void;
  onDismissSuggestions: () => void;
  pushEnabled: boolean;
  pushError: string | null;
  pushLoading: boolean;
  setupPush: (opts?: { interactive?: boolean }) => Promise<void>;
}

export function Header({
  address,
  locationStatus,
  suggestions,
  showSuggestions,
  onAddressChange,
  onSelectSuggestion,
  onClearAddress,
  onDismissSuggestions,
  pushEnabled,
  pushError,
  pushLoading,
  setupPush,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 bg-wolt-bg-primary border-b border-wolt-border">
      <div className="max-w-[640px] mx-auto px-4 h-14 flex items-center gap-3">
        {/* Wolt-style logo mark */}
        <div className="w-8 h-8 rounded-[8px] bg-wolt-blue flex items-center justify-center flex-shrink-0">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z"
              fill="white"
            />
          </svg>
        </div>
        <h1 className="font-heading text-lg font-semibold text-wolt-text-primary tracking-tight">
          Venue Tracker
        </h1>

        {/* Status pills */}
        <div className="ml-auto flex items-center gap-2">
          <AddressInput
            address={address}
            locationStatus={locationStatus}
            suggestions={suggestions}
            showSuggestions={showSuggestions}
            onAddressChange={onAddressChange}
            onSelect={onSelectSuggestion}
            onClear={onClearAddress}
            onDismiss={onDismissSuggestions}
          />
          <NotificationPill
            pushEnabled={pushEnabled}
            pushError={pushError}
            pushLoading={pushLoading}
            setupPush={setupPush}
          />
        </div>
      </div>
    </header>
  );
}

// ─── Address input ───

function AddressInput({
  address,
  locationStatus,
  suggestions,
  showSuggestions,
  onAddressChange,
  onSelect,
  onClear,
  onDismiss,
}: {
  address: string;
  locationStatus: LocationStatus;
  suggestions: AddressSuggestion[];
  showSuggestions: boolean;
  onAddressChange: (value: string) => void;
  onSelect: (suggestion: AddressSuggestion) => void;
  onClear: () => void;
  onDismiss: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onDismiss();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onDismiss]);

  const locationIcon = (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
        fill="currentColor"
      />
    </svg>
  );

  const statusColor =
    locationStatus === "resolved"
      ? "border-green-300 bg-green-50 text-green-700"
      : locationStatus === "error"
        ? "border-amber-300 bg-amber-50 text-amber-700"
        : locationStatus === "loading"
          ? "border-blue-300 bg-blue-50 text-blue-700"
          : "border-wolt-border bg-wolt-bg-primary text-wolt-text-secondary";

  return (
    <div ref={containerRef} className="relative">
      <div
        className={`inline-flex items-center gap-1.5 rounded-full text-xs font-medium px-2.5 py-1 border ${statusColor}`}
      >
        {locationStatus === "loading" ? (
          <span className="inline-block w-3 h-3 border-[1.5px] border-current/30 border-t-current rounded-full animate-spin" />
        ) : (
          locationIcon
        )}
        <input
          type="text"
          value={address}
          onChange={(e) => onAddressChange(e.target.value)}
          placeholder="Your address..."
          className="bg-transparent outline-none text-xs w-28 placeholder:text-current/50"
        />
        {address && (
          <button
            type="button"
            onClick={onClear}
            className="text-current/60 hover:text-current transition-colors cursor-pointer"
          >
            <svg
              width="10"
              height="10"
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
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute right-0 top-full mt-1 w-72 bg-wolt-bg-primary border border-wolt-border rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.12)] max-h-52 overflow-y-auto z-30">
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.lat}-${suggestion.lon}-${index}`}
              type="button"
              onClick={() => onSelect(suggestion)}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-wolt-bg-secondary transition-colors first:rounded-t-xl last:rounded-b-xl"
            >
              <span className="text-wolt-text-disabled flex-shrink-0">
                {locationIcon}
              </span>
              <span className="text-xs text-wolt-text-primary truncate">
                {suggestion.displayName}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Notification pill ───

function NotificationPill({
  pushEnabled,
  pushError,
  pushLoading,
  setupPush,
}: {
  pushEnabled: boolean;
  pushError: string | null;
  pushLoading: boolean;
  setupPush: (opts?: { interactive?: boolean }) => Promise<void>;
}) {
  if (pushEnabled) {
    return (
      <button
        onClick={() => setupPush({ interactive: true })}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 transition-colors cursor-pointer"
        title="Notifications are enabled"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-wolt-positive" />
        Notifications on
      </button>
    );
  }

  if (pushError) {
    return (
      <button
        onClick={() => setupPush({ interactive: true })}
        disabled={pushLoading}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer disabled:opacity-60"
      >
        {pushLoading ? (
          <span className="inline-block w-3 h-3 border-[1.5px] border-amber-300 border-t-amber-700 rounded-full animate-spin" />
        ) : (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"
              fill="currentColor"
            />
          </svg>
        )}
        Enable alerts
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs text-wolt-text-disabled">
      <span className="w-1.5 h-1.5 rounded-full bg-wolt-text-disabled animate-pulse" />
      Connecting...
    </span>
  );
}
