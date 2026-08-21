import { events, guests, organizers, tables, team } from "@/lib/data/mock-data";
import type { EventRecord, Guest, Organizer, TableRecord, TeamMember } from "@/lib/data/types";
import { getDatabaseEvent, listDatabaseDiscoveryEvents } from "@/lib/db/events";

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
      try { return await listDatabaseDiscoveryEvents(); } catch (error) { console.warn("Database event listing unavailable; using demo records.", error); }
    }
    return events.filter((event) => event.status === "published" && (event.visibility === "public" || event.privateListing === "listed"));
  },
  async getEvent(slug) {
    if (process.env.DATABASE_URL) {
      try { return await getDatabaseEvent(slug); } catch (error) { console.warn("Database event lookup unavailable; using demo records.", error); }
    }
    return events.find((event) => event.slug === slug) ?? null;
  },
  async listOrganizers() {
    return organizers;
  },
  async getOrganizer(slug) {
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
