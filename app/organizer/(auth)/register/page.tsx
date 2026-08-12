import type { Metadata } from "next";
import { RegisterForm } from "@/components/dashboard/AuthForms";
export const metadata: Metadata = { title: "Create organizer account" };
export default function RegisterPage() { return <RegisterForm />; }
