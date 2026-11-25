import { redirect } from "next/navigation";
import { Brand } from "@/components/shared/Brand";
import { PlatformHeaderActions } from "@/components/platform/PlatformHeaderActions";
import { PlatformNavigation } from "@/components/platform/PlatformNavigation";
import { getPlatformPrincipal } from "@/lib/auth/policy";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const principal = await getPlatformPrincipal();
  if (!principal) redirect("/organizer/login?returnTo=/platform");
  const mfaRequired = process.env.PLATFORM_MFA_REQUIRED !== "false";
  return <div className="platform-app"><header><Brand /><PlatformNavigation /><PlatformHeaderActions name={principal.user.firstName} role={principal.role} /></header><main>{mfaRequired && !principal.mfaEnabled ? <div className="platform-page"><h1>Secure your administrator account</h1><p>Set up and verify an authenticator to unlock platform operations.</p></div> : children}</main></div>;
}
