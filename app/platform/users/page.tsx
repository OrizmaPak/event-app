import { PlatformUsers } from "@/components/platform/PlatformUsers";
import { PlatformPageHeading } from "@/components/platform/PlatformPageHeading";
export default function PlatformUsersPage() { return <div className="platform-page"><PlatformPageHeading eyebrow="PLATFORM ACCESS · USER CONTROL" title="Users" description="Activate, suspend, or deactivate accounts across the platform with a clear audit trail." section="User governance" /><PlatformUsers /></div>; }
