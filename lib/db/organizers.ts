import { asc, eq } from "drizzle-orm";
import { organizers } from "@/db/schema";
import type { Organizer, PortfolioGalleryImage } from "@/lib/data/types";
import { getDatabase } from "./client";

function toOrganizer(row: typeof organizers.$inferSelect): Organizer {
  const profile = row.profile as Partial<Organizer> & { about?: string; visible?: boolean; gallery?: PortfolioGalleryImage[] };
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    initials: profile.initials ?? row.name.split(/\s+/).map((word) => word[0]).join("").slice(0, 2).toUpperCase(),
    tagline: profile.tagline ?? "Thoughtful events, made personal.",
    bio: profile.about ?? profile.bio ?? "",
    city: profile.city ?? "Nigeria",
    email: row.email,
    phone: row.phone ?? "",
    website: profile.website ?? "",
    accent: profile.accent ?? "#7557ff",
    eventsHosted: profile.eventsHosted ?? 0,
    guestsWelcomed: profile.guestsWelcomed ?? 0,
    rating: profile.rating ?? 0,
    verified: profile.verified ?? false,
    gallery: profile.gallery ?? [],
  };
}

export async function getDatabaseOrganizer(slug: string) {
  const [row] = await getDatabase().select().from(organizers).where(eq(organizers.slug, slug)).limit(1);
  if (!row || row.status !== "active" || (row.profile as { visible?: boolean }).visible === false) return null;
  return toOrganizer(row);
}

export async function listDatabaseOrganizers() {
  const rows = await getDatabase().select().from(organizers).orderBy(asc(organizers.name));
  return rows.filter((row) => row.status === "active" && (row.profile as { visible?: boolean }).visible !== false).map(toOrganizer);
}
