import type { Venue } from "@/types";
import { VenueCard } from "@/components/VenueCard";

interface VenueListProps {
  venues: Venue[];
  onToggleTracking: (id: string, tracking: boolean) => void;
  onDelete: (id: string) => void;
}

export function VenueList({ venues, onToggleTracking, onDelete }: VenueListProps) {
  if (venues.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-2">
      {venues.map((venue) => (
        <VenueCard
          key={venue.id}
          venue={venue}
          onToggleTracking={onToggleTracking}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-20">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-wolt-bg-tertiary flex items-center justify-center">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M18.36 9l.6 3H5.04l.6-3h12.72M20 4H4v2h16V4zm0 3H4l-1 5v2h1v6h10v-6h4v6h2v-6h1v-2l-1-5zM6 18v-4h6v4H6z"
            fill="#a1a5ad"
          />
        </svg>
      </div>
      <p className="text-sm font-semibold text-wolt-text-primary mb-1">
        No venues tracked yet
      </p>
      <p className="text-sm text-wolt-text-secondary max-w-[280px] mx-auto leading-relaxed">
        Search for a restaurant above and we&apos;ll let you know when it opens
      </p>
    </div>
  );
}
