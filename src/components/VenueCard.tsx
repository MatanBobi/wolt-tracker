import Image from "next/image";
import type { Venue } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { timeAgo } from "@/lib/utils";

interface VenueCardProps {
  venue: Venue;
  onToggleTracking: (id: string, tracking: boolean) => void;
  onDelete: (id: string) => void;
}

export function VenueCard({ venue, onToggleTracking, onDelete }: VenueCardProps) {
  return (
    <div className="bg-wolt-bg-primary rounded-[12px] border border-wolt-border p-4 transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
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
          <div
            className={`w-12 h-12 rounded-[8px] flex items-center justify-center flex-shrink-0 ${
              venue.online
                ? "bg-green-50"
                : venue.online === false
                  ? "bg-red-50"
                  : "bg-wolt-bg-tertiary"
            }`}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
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
            onClick={() => onToggleTracking(venue.id, venue.tracking)}
            className="h-8 px-3 text-xs font-medium rounded-[8px] text-wolt-text-secondary hover:bg-wolt-bg-secondary transition-colors"
          >
            {venue.tracking ? "Pause" : "Resume"}
          </button>
          <button
            onClick={() => onDelete(venue.id)}
            className="h-8 w-8 flex items-center justify-center rounded-[8px] text-wolt-text-disabled hover:text-wolt-negative hover:bg-red-50 transition-colors"
            title="Remove"
          >
            <svg
              width="16"
              height="16"
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
        </div>
      </div>
    </div>
  );
}
