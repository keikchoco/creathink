"use client"

import { DataTable, type DataTableColumn } from "@/components/admin/data-table"

export interface AuditLogRow {
  id: string
  userId: string
  userName: string
  action: string
  resource: string
  resourceId: string
  createdAt: string
}

interface AuditLogsTableProps {
  rows: AuditLogRow[]
  total: number
  page: number
  limit: number
}

function AuditLogsTable({ rows, total, page, limit }: AuditLogsTableProps) {
  const columns: DataTableColumn<AuditLogRow>[] = [
    {
      key: "createdAt",
      label: "When",
      render: (row) => new Date(row.createdAt).toLocaleString(),
    },
    { key: "action", label: "Action", render: (row) => <span className="capitalize">{row.action.toLowerCase()}</span> },
    { key: "resource", label: "Resource", render: (row) => row.resource },
    {
      key: "resourceId",
      label: "Resource ID",
      render: (row) => <code className="text-xs text-muted-foreground">{row.resourceId}</code>,
    },
    {
      key: "userId",
      label: "Admin",
      render: (row) =>
        row.userName ? (
          <span title={row.userId}>{row.userName}</span>
        ) : (
          <code className="text-xs text-muted-foreground">{row.userId}</code>
        ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={rows}
      total={total}
      page={page}
      limit={limit}
      basePath="/admin/audit-logs"
      getRowId={(row) => row.id}
      searchPlaceholder="Search..."
    />
  )
}

export { AuditLogsTable }
