import { EventManagementHeader } from "@/components/dashboard/DashboardElements";
import { SeatPlanBuilder } from "@/components/dashboard/SeatPlanBuilder";
import { demoLayoutObjects } from "@/lib/data/seating-data";

export default function SeatingPage() {
  return <><EventManagementHeader /><SeatPlanBuilder initialObjects={demoLayoutObjects} eyebrow="Published event seating" heading="Manage the Lumina seating plan" /></>;
}
