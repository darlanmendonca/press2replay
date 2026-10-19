import "server-only";
import { and, asc, count, desc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { court, replay, venue } from "@/db/schema";

export async function listVenues() {
  return db
    .select({
      id: venue.id,
      name: venue.name,
      hasEdgeKey: sql<boolean>`${venue.edgeKeyHash} is not null`,
      courts: count(court.id),
    })
    .from(venue)
    .leftJoin(court, eq(court.venueId, venue.id))
    .groupBy(venue.id)
    .orderBy(asc(venue.name));
}

export async function getVenue(venueId: string) {
  const [row] = await db.select().from(venue).where(eq(venue.id, venueId)).limit(1);
  return row ?? null;
}

export async function listCourts(venueId: string) {
  return db.select().from(court).where(eq(court.venueId, venueId)).orderBy(asc(court.name));
}

export async function getCourt(venueId: string, courtId: string) {
  const [row] = await db
    .select()
    .from(court)
    .where(and(eq(court.venueId, venueId), eq(court.id, courtId)))
    .limit(1);
  return row ?? null;
}

// Replays ainda validos (dentro do TTL) de todas as quadras do local.
export async function listVenueReplays(venueId: string, now = new Date()) {
  return db
    .select()
    .from(replay)
    .where(and(eq(replay.venueId, venueId), gt(replay.expiresAt, now)))
    .orderBy(desc(replay.createdAt));
}
