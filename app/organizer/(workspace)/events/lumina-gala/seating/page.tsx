import { EventManagementHeader } from "@/components/dashboard/DashboardElements";
import { SeatingManager } from "@/components/dashboard/SeatingManager";
import { guests, tables } from "@/lib/data/mock-data";
export default function SeatingPage() { return <><EventManagementHeader /><SeatingManager initialTables={tables} initialGuests={guests} /></>; }
