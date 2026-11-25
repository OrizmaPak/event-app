import { AuthFeatureList } from "@/components/dashboard/AuthForms";
import { Brand } from "@/components/shared/Brand";

export default function UserAuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="auth-page"><section className="auth-page__form"><header><Brand /><a href="/">Back to website</a></header><div className="auth-page__form-inner">{children}</div><footer>© 2026 NASA EVENT · User access</footer></section><aside className="auth-page__visual"><AuthFeatureList /></aside></main>;
}
