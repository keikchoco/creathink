import { cn } from "@/lib/utils"
import { INVOICE_CLIENT_STATUS_LABELS, type InvoiceStatus } from "@/types/invoice"

const STATUS_CLASSES: Record<InvoiceStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  paid: "bg-green-500/10 text-green-600 dark:text-green-400",
  partially_paid: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  overdue: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground line-through",
}

function InvoiceStatusBadge({
  status,
  className,
}: {
  status: InvoiceStatus
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        STATUS_CLASSES[status],
        className
      )}
    >
      {INVOICE_CLIENT_STATUS_LABELS[status]}
    </span>
  )
}

export { InvoiceStatusBadge }
