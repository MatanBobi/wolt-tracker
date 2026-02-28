import { db } from "./kv";
import type { PushSubscription as WebPushSubscription } from "web-push";

export interface Venue {
  id: string;
  slug: string;
  url: string;
  name: string;
  image: string | null;
  online: boolean | null;
  lastChecked: number | null;
  tracking: boolean;
}

// ─── Venue operations (per user) ───

export async function getVenues(userId: string): Promise<Venue[]> {
  const venues = await db.hgetall<Record<string, Venue>>(
    `user:${userId}:venues`
  );
  if (!venues) return [];
  return Object.values(venues);
}

export async function getVenue(
  userId: string,
  venueId: string
): Promise<Venue | null> {
  const venue = await db.hget<Venue>(`user:${userId}:venues`, venueId);
  return venue ?? null;
}

export async function addVenue(userId: string, venue: Venue): Promise<void> {
  await db.hset(`user:${userId}:venues`, { [venue.id]: venue });
  // Register this tracking in the global index so the cron can find it
  await db.sadd("venues:active", `${userId}:${venue.id}`);
}

export async function updateVenue(
  userId: string,
  venueId: string,
  updates: Partial<Venue>
): Promise<void> {
  const venue = await getVenue(userId, venueId);
  if (!venue) return;
  const updated = { ...venue, ...updates };
  await db.hset(`user:${userId}:venues`, { [venueId]: updated });

  // Update the global index based on tracking state
  if (updates.tracking === false) {
    await db.srem("venues:active", `${userId}:${venueId}`);
  } else if (updates.tracking === true) {
    await db.sadd("venues:active", `${userId}:${venueId}`);
  }
}

export async function removeVenue(
  userId: string,
  venueId: string
): Promise<void> {
  await db.hdel(`user:${userId}:venues`, venueId);
  await db.srem("venues:active", `${userId}:${venueId}`);
}

// ─── Push subscription operations (per user) ───

export async function getSubscription(
  userId: string
): Promise<WebPushSubscription | null> {
  return db.get<WebPushSubscription>(`user:${userId}:subscription`);
}

export async function setSubscription(
  userId: string,
  sub: WebPushSubscription
): Promise<void> {
  await db.set(`user:${userId}:subscription`, sub);
}

export async function removeSubscription(userId: string): Promise<void> {
  await db.del(`user:${userId}:subscription`);
}

// ─── Global operations (for cron) ───

export interface ActiveTracking {
  userId: string;
  venueId: string;
}

export async function getAllActiveTrackings(): Promise<ActiveTracking[]> {
  const members = await db.smembers("venues:active");
  if (!members || members.length === 0) return [];
  return members.map((member: string) => {
    const [userId, venueId] = member.split(":");
    return { userId, venueId };
  });
}
