import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/dashboard/AuthForms";
export const metadata: Metadata = { title: "Reset password" };
export default function ForgotPasswordPage() { return <ForgotPasswordForm />; }
