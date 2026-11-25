import { PlatformRefunds } from "@/components/platform/PlatformRefunds";
import { PlatformPageHeading } from "@/components/platform/PlatformPageHeading";

export default function PlatformPage() {
  return <div className="platform-page"><PlatformPageHeading eyebrow="PLATFORM OPERATIONS · REFUNDS" title="Financial approvals" description="Review organizer refund requests before provider execution. Every decision is audited and clearly recorded." section="Refund review" /><PlatformRefunds /></div>;
}
