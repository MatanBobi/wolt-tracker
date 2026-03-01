import type { LocationStatus } from "@/hooks/useLocation";

interface HeaderProps {
  location: { lat: number; lon: number } | null;
  locationStatus: LocationStatus;
  requestLocation: () => void;
  pushEnabled: boolean;
  pushError: string | null;
  pushLoading: boolean;
  setupPush: (opts?: { interactive?: boolean }) => Promise<void>;
}

export function Header({
  location,
  locationStatus,
  requestLocation,
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
          <LocationPill
            location={location}
            locationStatus={locationStatus}
            requestLocation={requestLocation}
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

// ─── Location pill ───

function LocationPill({
  location,
  locationStatus,
  requestLocation,
}: {
  location: { lat: number; lon: number } | null;
  locationStatus: LocationStatus;
  requestLocation: () => void;
}) {
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

  if (locationStatus === "granted") {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700"
        title={`Location: ${location?.lat.toFixed(4)}, ${location?.lon.toFixed(4)}`}
      >
        {locationIcon}
        Nearby
      </span>
    );
  }

  if (locationStatus === "denied" || locationStatus === "unavailable") {
    return (
      <button
        onClick={requestLocation}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer"
        title={
          locationStatus === "denied"
            ? "Location access denied. Click to retry."
            : "Location unavailable. Click to retry."
        }
      >
        {locationIcon}
        {locationStatus === "denied" ? "Location denied" : "No location"}
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs text-wolt-text-disabled">
      <span className="w-1.5 h-1.5 rounded-full bg-wolt-text-disabled animate-pulse" />
      Locating...
    </span>
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
