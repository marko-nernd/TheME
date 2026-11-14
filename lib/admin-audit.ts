import { db } from "@/db";
import { adminAuditLogs } from "@/db/schema";

export async function recordAdminAudit(input: {
  adminId: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
  detail?: string;
}) {
  await db.insert(adminAuditLogs).values({
    adminId: input.adminId,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId ?? null,
    beforeData: input.beforeData ?? null,
    afterData: input.afterData ?? null,
    detail: input.detail ?? "",
  });
}
