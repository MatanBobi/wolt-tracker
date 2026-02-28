/**
 * Scrape venue metadata (name + image) from a Wolt venue page.
 *
 * The dynamic API endpoint doesn't include images, but the SSR HTML
 * of the venue page has `og:image` and `og:title` meta tags we can extract.
 */

export interface VenueMetadata {
  name: string | null;
  image: string | null;
}

/**
 * Fetches the Wolt venue page and extracts the og:title and og:image
 * meta tags from the HTML.
 *
 * Falls back gracefully — if the fetch fails or tags are missing,
 * returns nulls so the caller can use the slug as a fallback name.
 */
export async function scrapeVenueMetadata(
  slug: string
): Promise<VenueMetadata> {
  const url = `https://wolt.com/he/isr/tel-aviv/restaurant/${slug}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,he;q=0.8",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.warn(
        `[Scrape] Failed to fetch venue page for "${slug}": ${response.status}`
      );
      return { name: null, image: null };
    }

    const html = await response.text();

    const name = extractMetaContent(html, "og:title");
    const image = extractMetaContent(html, "og:image");

    console.log(
      `[Scrape] ${slug} → name="${name ?? "(none)"}", image="${image ? "yes" : "none"}"`
    );

    return { name: cleanName(name), image: image ?? null };
  } catch (error) {
    console.error(`[Scrape] Error scraping venue "${slug}":`, error);
    return { name: null, image: null };
  }
}

/**
 * Extract the `content` attribute from a `<meta property="...">` tag.
 * Uses simple regex — no DOM parser needed on the server.
 */
function extractMetaContent(html: string, property: string): string | null {
  // Handles both quote styles and attribute order variations:
  //   <meta property="og:image" content="...">
  //   <meta content="..." property="og:image">
  const patterns = [
    // property first, then content
    new RegExp(
      `<meta[^>]+property=["']${escapeRegex(property)}["'][^>]+content=["']([^"']+)["']`,
      "i"
    ),
    // content first, then property
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escapeRegex(property)}["']`,
      "i"
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeHTMLEntities(match[1]);
    }
  }

  return null;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Decode common HTML entities that may appear in meta tag values.
 */
function decodeHTMLEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

/**
 * Clean up the venue name extracted from og:title.
 * Wolt og:title often includes suffixes like " | Wolt" or " - Wolt".
 */
function cleanName(raw: string | null): string | null {
  if (!raw) return null;

  // Remove trailing " | Wolt", " - Wolt", " | wolt.com", etc.
  const cleaned = raw
    .replace(/\s*[|\-–—]\s*[Ww]olt(\.com)?\s*$/, "")
    .replace(/\s*[|\-–—]\s*Order online\s*$/i, "")
    .trim();

  return cleaned || null;
}
