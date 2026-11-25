import { PageHeader } from "@/components/dashboard/DashboardElements";
import { ThemeSettings } from "@/components/dashboard/ThemeSettings";
import { MfaSettings } from "@/components/dashboard/MfaSettings";
export default function SettingsPage() { return <><PageHeader eyebrow="Workspace preferences" title="Appearance & settings" description="Choose a comfortable interface, signature colour and account security settings." /><ThemeSettings /><MfaSettings /></>; }
