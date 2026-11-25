import { PageHeader } from "@/components/dashboard/DashboardElements";
import { CreateOrganizationForm } from "@/components/dashboard/CreateOrganizationForm";

export default function CreateOrganizationPage() { return <><PageHeader eyebrow="ORGANIZATION" title="Start organizing" description="Add the organization name now. Public profile details can be completed later." /><CreateOrganizationForm /></>; }
