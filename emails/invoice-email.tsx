import { Button, Heading, Section, Text } from "@react-email/components"

import { EmailLayout } from "@/emails/components/email-layout"
import { SummaryCard } from "@/emails/components/summary-card"
import { InvoiceItemsTable } from "@/emails/components/invoice-items-table"

interface InvoiceEmailPaymentMethod {
  label: string
  details: string
}

interface InvoiceEmailItem {
  name: string
  description?: string
  quantity: number
  unitPrice: string
  lineTotal: string
}

interface InvoiceEmailProps {
  customerName: string
  invoiceNumber: string
  amountDue: string
  dueDate: string | null
  invoiceUrl: string
  items?: InvoiceEmailItem[]
  paymentMethods?: InvoiceEmailPaymentMethod[]
}

function InvoiceEmail({
  customerName,
  invoiceNumber,
  amountDue,
  dueDate,
  invoiceUrl,
  items = [],
  paymentMethods = [],
}: InvoiceEmailProps) {
  return (
    <EmailLayout
      previewText={`Invoice ${invoiceNumber} — ${amountDue} due${
        items.length > 0 ? ` for ${items.length} item${items.length === 1 ? "" : "s"}` : ""
      }`}
    >
      <Heading className="m-0 mb-4 text-[18px] text-[#18181b]">
        Invoice {invoiceNumber}
      </Heading>
      <Text className="m-0 mb-4 text-[14px] leading-6 text-[#3f3f46]">
        Hi {customerName}, you have received an invoice from CreaThink. You can
        view the full invoice, print it, or download a PDF using the button
        below.
      </Text>
      <SummaryCard
        title="Invoice summary"
        rows={[
          { label: "Invoice number", value: invoiceNumber },
          { label: "Amount due", value: amountDue },
          ...(dueDate ? [{ label: "Due date", value: dueDate }] : []),
        ]}
      />

      {items.length > 0 && <InvoiceItemsTable items={items} />}

      <Section className="mt-6 mb-6 text-center">
        <Button
          href={invoiceUrl}
          className="rounded-lg bg-[#0d0f0c] px-6 py-3 text-[14px] font-semibold text-white"
        >
          View Invoice
        </Button>
      </Section>

      {paymentMethods.length > 0 && (
        <SummaryCard
          title="Payment methods"
          rows={paymentMethods.map((method) => ({
            label: method.label,
            value: method.details,
          }))}
        />
      )}

      <Text className="m-0 mt-6 text-[13px] text-[#71717a]">
        If the button doesn&apos;t work, copy and paste this link into your
        browser: {invoiceUrl}
      </Text>
    </EmailLayout>
  )
}

export { InvoiceEmail }
export default InvoiceEmail
