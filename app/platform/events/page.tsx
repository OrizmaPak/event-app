import { PlatformEventApprovals } from "@/components/platform/PlatformEventApprovals";
import { PlatformPageHeading } from "@/components/platform/PlatformPageHeading";

export default function PlatformEventsPage() { return <div className="platform-page"><PlatformPageHeading eyebrow="PLATFORM ACCESS · EVENT CONTROL" title="Event approvals" description="Review organizer-submitted event pages before they become visible to guests." section="Event governance" /><PlatformEventApprovals /></div>; }
