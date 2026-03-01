import type { Venue } from "@/types";

export function StatusBadge({ venue }: { venue: Venue }) {
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
