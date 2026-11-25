import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/dashboard/AuthForms";

export const metadata: Metadata = { title: "Choose a new password" };
export default function ResetPasswordPage() { return <Suspense fallback={<div className="auth-form"><p>Preparing password reset...</p></div>}><ResetPasswordForm /></Suspense>; }
