import Link from "next/link"
import { FolderPlusIcon, BriefcaseIcon, InboxIcon, UploadIcon, ReceiptIcon } from "lucide-react"

import { getContentOverview, getInquiryOverview, type ContentOverview, type InquiryOverview } from "@/lib/dashboard"
import { getCurrentAdmin, hasPermission } from "@/lib/permissions"
import { invoiceService } from "@/services/invoice.service"
import { formatCurrency } from "@/lib/currency"
import type { InvoiceCurrency } from "@/types/invoice"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ErrorState } from "@/components/shared/error-state"
import { Typography } from "@/components/shared/typography"

async function fetchContentOverview(): Promise<ContentOverview | null> {
  try {
    return await getContentOverview()
  } catch {
    return null
  }
}

async function fetchInquiryOverview(): Promise<InquiryOverview | null> {
  try {
    return await getInquiryOverview()
  } catch {
    return null
  }
}

async function ContentOverviewCard() {
  const overview = await fetchContentOverview()

  if (!overview) {
    return (
      <ErrorState
        title="Unable to load content overview"
        description="The database isn't reachable right now. Check MONGODB_URI in .env.local."
      />
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Content Overview</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Total" value={overview.total} />
        <Stat label="Published" value={overview.published} />
        <Stat label="Draft" value={overview.draft} />
        <Stat label="Archived" value={overview.archived} />
      </CardContent>
    </Card>
  )
}

async function InquiryOverviewCard() {
  const overview = await fetchInquiryOverview()

  if (!overview) {
    return (
      <ErrorState
        title="Unable to load inquiry overview"
        description="The database isn't reachable right now. Check MONGODB_URI in .env.local."
      />
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inquiry Overview</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <Stat label="New inquiries" value={overview.newInquiries} />
        <Stat label="Unread messages" value={overview.unreadMessages} />
      </CardContent>
    </Card>
  )
}

async function InvoiceOverviewCard() {
  const admin = await getCurrentAdmin()
  if (!hasPermission(admin, "invoices", "view")) return null

  let stats: Awaited<ReturnType<typeof invoiceService.getStats>>
  try {
    stats = await invoiceService.getStats()
  } catch {
    return (
      <ErrorState
        title="Unable to load invoice overview"
        description="The database isn't reachable right now."
      />
    )
  }

  const currencies = Object.keys(stats) as InvoiceCurrency[]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice Overview</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {currencies.length === 0 ? (
          <p className="text-sm text-muted-foreground">No invoices yet.</p>
        ) : (
          currencies.map((currency) => {
            const entry = stats[currency]
            return (
              <div key={currency} className="flex flex-col gap-3">
                <span className="text-xs font-medium text-muted-foreground">{currency}</span>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <TextStat
                    label="Total revenue"
                    value={formatCurrency(entry.totalRevenue, currency)}
                  />
                  <TextStat
                    label="Outstanding"
                    value={formatCurrency(entry.outstandingRevenue, currency)}
                  />
                  <TextStat
                    label="Revenue this month"
                    value={formatCurrency(entry.revenueThisMonth, currency)}
                  />
                  <TextStat
                    label="Avg invoice value"
                    value={formatCurrency(entry.averageInvoiceValue, currency)}
                  />
                  <Stat label="Paid invoices" value={entry.paidCount} />
                  <Stat label="Overdue" value={entry.overdueCount} />
                  <Stat label="Drafts" value={entry.draftCount} />
                  <Stat label="This month" value={entry.invoicesThisMonth} />
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}

function TextStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-lg font-semibold text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-2xl font-semibold text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

const quickActions = [
  { label: "Create Project", href: "/admin/projects", icon: FolderPlusIcon },
  { label: "Add Service", href: "/admin/services", icon: BriefcaseIcon },
  { label: "Review Inquiry", href: "/admin/inquiries", icon: InboxIcon },
  { label: "Upload Media", href: "/admin/media", icon: UploadIcon },
  { label: "New Invoice", href: "/admin/invoices/new", icon: ReceiptIcon },
]

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <Typography as="h1" variant="h1">
        Dashboard
      </Typography>

      <div className="grid gap-4 md:grid-cols-2">
        <ContentOverviewCard />
        <InquiryOverviewCard />
      </div>

      <InvoiceOverviewCard />

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {quickActions.map((action) => (
            <Button key={action.href} variant="outline" render={<Link href={action.href} />}>
              <action.icon />
              {action.label}
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
