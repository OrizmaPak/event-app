import { cookies } from "next/headers";
import { organizerSessionCookie, verifyOrganizerSession } from "@/lib/security/organizer-session";

export async function getOrganizerSession() {
  const token = (await cookies()).get(organizerSessionCookie)?.value;
  return token ? verifyOrganizerSession(token) : null;
}
