import { PlatformOrganizers } from "@/components/platform/PlatformOrganizers";
import { PlatformPageHeading } from "@/components/platform/PlatformPageHeading";
export default function PlatformOrganizersPage() { return <div className="platform-page"><PlatformPageHeading eyebrow="PLATFORM ACCESS · ORGANIZER CONTROL" title="Organizers" description="Review new organizations, approve trusted workspaces, and control access across the platform." section="Organizer review" /><PlatformOrganizers /></div>; }
