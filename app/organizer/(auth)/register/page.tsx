import type { Metadata } from "next";
import { AccountRegisterForm } from "@/components/dashboard/UserAccountForms";
export const metadata: Metadata = { title: "Create account" };
export default function RegisterPage() { return <AccountRegisterForm />; }
