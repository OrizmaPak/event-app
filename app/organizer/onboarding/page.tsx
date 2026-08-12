import type { Metadata } from "next";
import { OnboardingWizard } from "@/components/dashboard/OnboardingWizard";
export const metadata: Metadata = { title: "Organizer setup" };
export default function OnboardingPage() { return <OnboardingWizard />; }
