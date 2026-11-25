import { events, guests, organizers, tables, team } from "@/lib/data/mock-data";
import type { EventRecord, Guest, Organizer, TableRecord, TeamMember } from "@/lib/data/types";
import { getDatabaseEvent, listDatabaseDiscoveryEvents } from "@/lib/db/events";
import { getDatabaseOrganizer, listDatabaseOrganizers } from "@/lib/db/organizers";

export interface NasaEventClient {
  listPublishedEvents(): Promise<EventRecord[]>;
  getEvent(slug: string): Promise<EventRecord | null>;
  listOrganizers(): Promise<Organizer[]>;
  getOrganizer(slug: string): Promise<Organizer | null>;
  listGuests(eventId: string): Promise<Guest[]>;
  listTables(eventId: string): Promise<TableRecord[]>;
  listTeam(): Promise<TeamMember[]>;
}

/**
 * This adapter is the only mock-data boundary used by server-rendered pages.
 * A future API client can implement the same interface without changing page UI.
 */
export const nasaClient: NasaEventClient = {
  async listPublishedEvents() {
    if (process.env.DATABASE_URL) {
      return listDatabaseDiscoveryEvents();
    }
    return events.filter((event) => event.status === "published" && (event.visibility === "public" || event.privateListing === "listed"));
  },
  async getEvent(slug) {
    if (process.env.DATABASE_URL) {
      return getDatabaseEvent(slug);
    }
    return events.find((event) => event.slug === slug) ?? null;
  },
  async listOrganizers() {
    if (process.env.DATABASE_URL) {
      return listDatabaseOrganizers();
    }
    return organizers;
  },
  async getOrganizer(slug) {
    if (process.env.DATABASE_URL) {
      return getDatabaseOrganizer(slug);
    }
    return organizers.find((organizer) => organizer.slug === slug) ?? null;
  },
  async listGuests(eventId) {
    return guests.filter((guest) => guest.eventId === eventId);
  },
  async listTables() {
    return tables;
  },
  async listTeam() {
    return team;
  },
};
