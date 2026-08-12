import Link from "next/link";
import { AuthFeatureList } from "@/components/dashboard/AuthForms";
import { Brand } from "@/components/shared/Brand";

export default function OrganizerAuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="auth-page"><section className="auth-page__form"><header><Brand /><Link href="/">Back to website</Link></header><div className="auth-page__form-inner">{children}</div><footer>© 2026 NASA EVENT · Frontend prototype</footer></section><aside className="auth-page__visual"><AuthFeatureList /></aside></main>;
}
