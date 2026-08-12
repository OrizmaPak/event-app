import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/dashboard/AuthForms";
export const metadata: Metadata = { title: "Organizer sign in" };
export default function LoginPage() { return <Suspense fallback={<div className="auth-form"><p>Preparing sign in…</p></div>}><LoginForm /></Suspense>; }
