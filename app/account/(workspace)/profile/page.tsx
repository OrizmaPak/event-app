import { PageHeader } from "@/components/dashboard/DashboardElements";
import { UserProfileForm } from "@/components/dashboard/UserProfileForm";

export default function AccountProfilePage() { return <><PageHeader eyebrow="ACCOUNT PROFILE" title="Your profile" description="Keep the personal details used for invitations and organization access." /><UserProfileForm /></>; }
