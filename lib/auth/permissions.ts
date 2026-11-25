export const permissionCatalog = [
  ["workspace.view", "Workspace", "View workspace"],
  ["workspace.manage", "Workspace", "Manage workspace"],
  ["resources.view", "Resources", "View organization listings"],
  ["resources.manage", "Resources", "Manage organization listings"],
  ["team.view", "Team", "View team"],
  ["team.manage", "Team", "Manage team"],
  ["roles.manage", "Team", "Manage roles and permissions"],
  ["events.view", "Events", "View events"],
  ["events.create", "Events", "Create events"],
  ["events.update", "Events", "Edit events"],
  ["events.publish", "Events", "Publish or cancel events"],
  ["page.manage", "Events", "Manage event pages"],
  ["tickets.manage", "Admissions", "Manage tickets and pricing"],
  ["seating.manage", "Admissions", "Manage seating"],
  ["guests.view", "Guests", "View guests"],
  ["guests.manage", "Guests", "Manage guests and invitations"],
  ["guests.export", "Guests", "Export guest data"],
  ["messages.manage", "Communications", "Send event messages"],
  ["analytics.view", "Reports", "View analytics"],
  ["finance.view", "Finance", "View payments and balances"],
  ["refunds.request", "Finance", "Request refunds"],
  ["checkin.operate", "Check-in", "Check in attendees"],
  ["checkin.supervise", "Check-in", "Reverse check-ins and supervise entrances"],
  ["audit.view", "Security", "View audit history"],
] as const;

export type PermissionKey = typeof permissionCatalog[number][0];

export const builtInRoles: Record<string, PermissionKey[]> = {
  owner: permissionCatalog.map(([key]) => key),
  manager: permissionCatalog.map(([key]) => key).filter((key) => !["roles.manage", "finance.view", "refunds.request", "audit.view", "resources.view", "resources.manage"].includes(key)),
  event_manager: ["workspace.view", "events.view", "events.create", "events.update", "events.publish", "page.manage", "tickets.manage", "seating.manage", "guests.view", "guests.manage", "messages.manage", "analytics.view"],
  guest_manager: ["workspace.view", "events.view", "guests.view", "guests.manage", "guests.export", "messages.manage"],
  finance: ["workspace.view", "events.view", "analytics.view", "finance.view", "refunds.request"],
  checkin_supervisor: ["workspace.view", "events.view", "guests.view", "checkin.operate", "checkin.supervise"],
  checkin_staff: ["workspace.view", "events.view", "checkin.operate"],
  analyst: ["workspace.view", "events.view", "guests.view", "analytics.view", "finance.view"],
};
