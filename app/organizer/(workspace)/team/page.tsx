import { Plus } from "lucide-react";
import { MockButton, PageHeader } from "@/components/dashboard/DashboardElements";
import { TeamManager } from "@/components/dashboard/TeamManager";
import { team } from "@/lib/data/mock-data";
export default function TeamPage() { return <><PageHeader eyebrow="Access and permissions" title="Your team" description="Give each person only the access they need, for only as long as they need it." actions={<MockButton label="Invite member" icon={<Plus size={14} />} className="button button--brand" />} /><TeamManager initialTeam={team} /></>; }
