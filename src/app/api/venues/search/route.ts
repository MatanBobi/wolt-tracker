import { NextRequest, NextResponse } from "next/server";

const WOLT_SEARCH_API =
  "https://restaurant-api.wolt.com/v1/pages/search";

// Tel Aviv coordinates
const DEFAULT_LAT = 32.0853;
const DEFAULT_LON = 34.7818;

interface WoltVenueResult {
  slug: string;
  name: string;
  online: boolean;
  address: string;
  image: { url: string } | null;
  tags: string[];
  rating: { score: number } | null;
}

interface WoltSearchItem {
  template: string;
  title: string;
  track_id: string;
  image?: { url: string };
  venue?: {
    slug: string;
    name: string;
    online: boolean;
    address: string;
    tags: string[];
    rating?: { score: number };
  };
  link?: {
    target: string;
  };
}

interface WoltSearchSection {
  name: string;
  items: WoltSearchItem[];
}

interface WoltSearchResponse {
  sections: WoltSearchSection[];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const lat = parseFloat(searchParams.get("lat") ?? "") || DEFAULT_LAT;
  const lon = parseFloat(searchParams.get("lon") ?? "") || DEFAULT_LON;

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ venues: [] });
  }

  try {
    const response = await fetch(WOLT_SEARCH_API, {
      method: "POST",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9,he;q=0.8",
        "Content-Type": "application/json",
        Referer: "https://wolt.com/",
        Origin: "https://wolt.com",
      },
      body: JSON.stringify({
        q: query.trim(),
        lat,
        lon,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      console.warn(
        `[Search] Wolt search API returned ${response.status} for query "${query}"`
      );
      return NextResponse.json({ venues: [] });
    }

    const data: WoltSearchResponse = await response.json();

    // Extract venue results from the "venues" section
    const venuesSection = data.sections?.find(
      (s: WoltSearchSection) => s.name === "venues"
    );

    if (!venuesSection?.items) {
      return NextResponse.json({ venues: [] });
    }

    const venues: WoltVenueResult[] = venuesSection.items
      .filter((item: WoltSearchItem) => item.template === "venue" && item.venue)
      .map((item: WoltSearchItem) => ({
        slug: item.venue!.slug,
        name: item.venue!.name || item.title,
        online: item.venue!.online ?? false,
        address: item.venue!.address || "",
        image: item.image ?? null,
        tags: item.venue!.tags ?? [],
        rating: item.venue!.rating ?? null,
      }));

    return NextResponse.json({ venues });
  } catch (error) {
    console.error("[Search] Error searching venues:", error);
    return NextResponse.json({ venues: [] });
  }
}
