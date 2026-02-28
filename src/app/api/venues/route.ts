import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "../../../lib/nanoid";
import {
  getVenues,
  addVenue,
  removeVenue,
  updateVenue,
} from "../../../lib/store";
import { startDevPollerIfNeeded } from "../../../lib/poller";
import { scrapeVenueMetadata } from "../../../lib/scrape";

function extractSlug(input: string): string {
  try {
    const url = new URL(input);
    const parts = url.pathname.split("/").filter(Boolean);
    const restaurantIdx = parts.indexOf("restaurant");
    if (restaurantIdx !== -1 && parts[restaurantIdx + 1]) {
      return parts[restaurantIdx + 1];
    }
    return parts[parts.length - 1] || input;
  } catch {
    return input.trim();
  }
}

export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "x-user-id header required" }, { status: 400 });
  }

  const venues = await getVenues(userId);
  return NextResponse.json({ venues });
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "x-user-id header required" }, { status: 400 });
  }

  const body = await request.json();
  const { url } = body;

  if (!url || typeof url !== "string") {
    return NextResponse.json(
      { error: "url is required (Wolt venue URL or slug)" },
      { status: 400 }
    );
  }

  const slug = extractSlug(url);
  const id = nanoid();

  // Scrape the venue page for the display name and header image
  const metadata = await scrapeVenueMetadata(slug);

  const venue = {
    id,
    slug,
    url: url.startsWith("http")
      ? url
      : `https://wolt.com/en/isr/restaurant/${slug}`,
    name: metadata.name || slug,
    image: metadata.image || null,
    online: null,
    lastChecked: null,
    tracking: true,
  };

  await addVenue(userId, venue);

  // In dev mode, start the auto-poller so you don't need cron-job.org locally
  startDevPollerIfNeeded();

  return NextResponse.json({ venue }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "x-user-id header required" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  await removeVenue(userId, id);
  return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "x-user-id header required" }, { status: 400 });
  }

  const body = await request.json();
  const { id, tracking } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  await updateVenue(userId, id, { tracking });
  return NextResponse.json({ success: true });
}
