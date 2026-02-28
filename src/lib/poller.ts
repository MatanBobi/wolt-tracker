import webpush from "web-push";
import {
  getAllActiveTrackings,
  getVenue,
  updateVenue,
  getSubscription,
  removeSubscription,
} from "./store";

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:you@example.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
  process.env.VAPID_PRIVATE_KEY || ""
);

const WOLT_API_BASE =
  "https://consumer-api.wolt.com/order-xp/web/v1/venue/slug";

// Random delay between 0-5s to add jitter between individual checks
function getRandomDelay(): number {
  return Math.floor(Math.random() * 5_000);
}

async function checkVenueStatus(
  slug: string
): Promise<{ online: boolean; name: string | null }> {
  const url = `${WOLT_API_BASE}/${slug}/dynamic/?selected_delivery_method=homedelivery`;

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      Accept: "application/json",
      "Accept-Language": "en-US,en;q=0.9",
      Referer: "https://wolt.com/",
      Origin: "https://wolt.com",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Wolt API returned ${response.status}`);
  }

  const data = await response.json();
  const online = data?.venue?.online ?? false;
  const name = data?.venue?.name?.[0]?.value ?? null;

  return { online, name };
}

async function notifyUser(
  userId: string,
  venue: { slug: string; name: string }
) {
  const subscription = await getSubscription(userId);
  if (!subscription) return;

  const payload = JSON.stringify({
    title: "Wolt Venue is OPEN!",
    body: `${venue.name} is now online and accepting orders!`,
    url: `https://wolt.com/en/isr/restaurant/${venue.slug}`,
    timestamp: Date.now(),
  });

  try {
    await webpush.sendNotification(subscription, payload);
    console.log(`[Push] Sent notification to user ${userId} for ${venue.name}`);
  } catch (error: unknown) {
    const webPushError = error as { statusCode?: number };
    if (webPushError.statusCode === 410 || webPushError.statusCode === 404) {
      // Subscription expired or invalid — clean it up
      await removeSubscription(userId);
      console.log(`[Push] Removed expired subscription for user ${userId}`);
    } else {
      console.error(
        `[Push] Failed to send to user ${userId}:`,
        error
      );
    }
  }
}

// Group trackings by slug to avoid hitting the same Wolt endpoint multiple times
function groupBySlug(
  trackings: { userId: string; venueId: string; slug: string }[]
) {
  const map = new Map<
    string,
    { slug: string; entries: { userId: string; venueId: string }[] }
  >();
  for (const t of trackings) {
    const existing = map.get(t.slug);
    if (existing) {
      existing.entries.push({ userId: t.userId, venueId: t.venueId });
    } else {
      map.set(t.slug, {
        slug: t.slug,
        entries: [{ userId: t.userId, venueId: t.venueId }],
      });
    }
  }
  return Array.from(map.values());
}

/**
 * Main polling function — called by the cron API route.
 * Checks all actively tracked venues and sends push notifications
 * for any offline → online transitions.
 */
export async function pollAllVenues() {
  const activeTrackings = await getAllActiveTrackings();
  if (activeTrackings.length === 0) {
    console.log("[Poller] No active trackings.");
    return { checked: 0, notified: 0 };
  }

  // Resolve each tracking to include the slug
  const resolved = await Promise.all(
    activeTrackings.map(async ({ userId, venueId }) => {
      const venue = await getVenue(userId, venueId);
      return venue ? { userId, venueId, slug: venue.slug, venue } : null;
    })
  );
  const valid = resolved.filter(Boolean) as {
    userId: string;
    venueId: string;
    slug: string;
    venue: { online: boolean | null; name: string; slug: string };
  }[];

  // Group by slug so we only call Wolt once per unique venue
  const groups = groupBySlug(valid);

  let checked = 0;
  let notified = 0;

  for (const group of groups) {
    try {
      // Random jitter between venues
      await new Promise((resolve) => setTimeout(resolve, getRandomDelay()));

      const { online, name } = await checkVenueStatus(group.slug);
      checked++;

      for (const entry of group.entries) {
        const tracking = valid.find(
          (v) => v.userId === entry.userId && v.venueId === entry.venueId
        );
        const wasOffline =
          tracking?.venue.online === false || tracking?.venue.online === null;
        const isNowOnline = online === true;

        await updateVenue(entry.userId, entry.venueId, {
          online,
          ...(name ? { name } : {}),
          lastChecked: Date.now(),
        });

        if (wasOffline && isNowOnline) {
          const displayName = name || tracking?.venue.name || group.slug;
          console.log(
            `[Poller] ${displayName} came ONLINE — notifying user ${entry.userId}`
          );
          await notifyUser(entry.userId, {
            slug: group.slug,
            name: displayName,
          });
          notified++;
        } else {
          const displayName = name || tracking?.venue.name || group.slug;
          console.log(
            `[Poller] ${displayName} is ${online ? "online" : "offline"} for user ${entry.userId}`
          );
        }
      }
    } catch (error) {
      console.error(`[Poller] Error checking ${group.slug}:`, error);
      // Still update lastChecked so the UI knows we tried
      for (const entry of group.entries) {
        await updateVenue(entry.userId, entry.venueId, {
          lastChecked: Date.now(),
        });
      }
    }
  }

  return { checked, notified };
}

// ─── Dev-only auto-poller ───
// In development, there's no cron-job.org hitting /api/cron,
// so we self-poll with a randomized interval (45-90s).

let devPollerStarted = false;

function getRandomInterval(): number {
  const min = 45_000;
  const max = 90_000;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function scheduleDevPoll() {
  const interval = getRandomInterval();
  console.log(`[DevPoller] Next poll in ${(interval / 1000).toFixed(1)}s`);
  setTimeout(async () => {
    await pollAllVenues();
    scheduleDevPoll();
  }, interval);
}

export function startDevPollerIfNeeded() {
  if (process.env.NODE_ENV !== "development") return;
  if (devPollerStarted) return;
  devPollerStarted = true;
  console.log("[DevPoller] Starting auto-poller for local development...");
  // Run first poll immediately, then schedule the next
  pollAllVenues().then(() => scheduleDevPoll());
}
