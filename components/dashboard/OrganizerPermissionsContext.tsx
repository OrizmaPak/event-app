"use client";

import { createContext, useContext } from "react";

const OrganizerPermissionsContext = createContext<string[]>([]);

export function OrganizerPermissionsProvider({ permissions, children }: { permissions: string[]; children: React.ReactNode }) {
  return <OrganizerPermissionsContext.Provider value={permissions}>{children}</OrganizerPermissionsContext.Provider>;
}

export function useOrganizerPermissions() {
  return useContext(OrganizerPermissionsContext);
}
