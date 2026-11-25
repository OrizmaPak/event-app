import { ResourceApprovals } from "@/components/resources/ResourceApprovals";
import { requirePlatformRole } from "@/lib/auth/policy";
import { notFound } from "next/navigation";
export default async function ResourceApprovalsPage() { if (!await requirePlatformRole("super_admin")) notFound(); return <ResourceApprovals />; }
