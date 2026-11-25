import type { Metadata } from "next";
import { UserRegisterForm } from "@/components/dashboard/UserAccountForms";

export const metadata: Metadata = { title: "Create user account" };
export default function UserRegisterPage() { return <UserRegisterForm />; }
