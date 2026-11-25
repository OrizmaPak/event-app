import { PlatformPayouts } from "@/components/platform/PlatformPayouts";
import { PlatformPageHeading } from "@/components/platform/PlatformPageHeading";

export default function PlatformPayoutsPage() { return <div className="platform-page"><PlatformPageHeading eyebrow="PLATFORM FINANCE · PAYOUT CONTROL" title="Payout approvals" description="Review organizer settlement requests, verify destination details, and approve or reject payouts." section="Settlement governance" /><PlatformPayouts /></div>; }
