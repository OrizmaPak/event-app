import { UserProfileForm } from "@/components/dashboard/UserProfileForm";
import { PageHeader } from "@/components/dashboard/DashboardElements";

export default function UserProfilePage() { return <><PageHeader eyebrow="ACCOUNT PROFILE" title="Your profile" description="Keep the personal details organizers use when they invite or contact you." /><UserProfileForm /></>; }
