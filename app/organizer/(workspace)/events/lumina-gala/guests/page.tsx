import { EventManagementHeader } from "@/components/dashboard/DashboardElements";
import { GuestManager } from "@/components/dashboard/GuestManager";
import { guests } from "@/lib/data/mock-data";
export default function GuestsPage() { return <><EventManagementHeader /><GuestManager initialGuests={guests} /></>; }
