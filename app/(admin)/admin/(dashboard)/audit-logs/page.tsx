import { requirePermission } from "@/lib/permissions"
import { listAuditLogs } from "@/lib/audit-log"
import { getUserNames } from "@/lib/admin-users"
import { Typography } from "@/components/shared/typography"
import { ErrorState } from "@/components/shared/error-state"
import { EmptyState } from "@/components/shared/empty-state"
import { AuditLogsTable, type AuditLogRow } from "@/components/admin/audit-logs-table"

interface AdminAuditLogsPageProps {
  searchParams: Promise<Record<string, string | undefined>>
}

export default async function AdminAuditLogsPage({ searchParams }: AdminAuditLogsPageProps) {
  try {
    await requirePermission("auditLogs", "view")
  } catch {
    return (
      <ErrorState
        title="No permission"
        description="You don't have permission to view audit logs."
      />
    )
  }

  const params = await searchParams
  const page = Number(params.page ?? "1") || 1
  const limit = 30

  let rows: AuditLogRow[] = []
  let total = 0
  let loadFailed = false

  try {
    const result = await listAuditLogs({}, { page, limit, search: params.q })

    const userNames = await getUserNames(result.items.map((item) => item.userId))

    rows = result.items.map((item) => ({
      id: String(item._id),
      userId: item.userId,
      userName: userNames[item.userId] ?? "",
      action: item.action,
      resource: item.resource,
      resourceId: item.resourceId,
      createdAt: new Date(item.createdAt).toISOString(),
    }))
    total = result.total
  } catch {
    loadFailed = true
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <Typography as="h1" variant="h1">
        Audit Logs
      </Typography>

      {loadFailed ? (
        <ErrorState
          title="Unable to load audit logs"
          description="The database isn't reachable right now. Check MONGODB_URI in .env.local."
        />
      ) : rows.length === 0 ? (
        <EmptyState title="No activity yet" description="Administrator actions will appear here." />
      ) : (
        <AuditLogsTable rows={rows} total={total} page={page} limit={limit} />
      )}
    </div>
  )
}
