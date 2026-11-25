export function loginDestination(returnTo: string | null, platformMember: boolean) {
  const fallback = platformMember ? "/platform" : "/organizer";
  if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//") || /[\\\r\n]/.test(returnTo)) return fallback;
  if (platformMember && /^\/organizer(?:\/|\?|$)/.test(returnTo)) return fallback;
  if (!platformMember && /^\/platform(?:\/|\?|$)/.test(returnTo)) return fallback;
  return returnTo;
}
