import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/dashboard/AuthForms";

export const metadata: Metadata = { title: "User sign in" };
export default function UserLoginPage() { return <Suspense fallback={<div className="auth-form"><p>Preparing sign in…</p></div>}><LoginForm /></Suspense>; }
