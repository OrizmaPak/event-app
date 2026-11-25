import { auditLogs } from "@/db/schema";
import { getDatabase } from "@/lib/db/client";

export function writeAudit(input: {
  organizerId?: string | null;
  eventId?: string | null;
  actorUserId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  reason?: string | null;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  return getDatabase().insert(auditLogs).values({
    organizerId: input.organizerId,
    eventId: input.eventId,
    actorUserId: input.actorUserId,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    reason: input.reason,
    requestId: input.requestId,
    metadata: input.metadata ?? {},
  });
}
