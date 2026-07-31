import { Button, Heading, Section, Text } from "@react-email/components"

import { EmailLayout } from "@/emails/components/email-layout"
import { SummaryCard } from "@/emails/components/summary-card"

interface InvoiceEmailProps {
  customerName: string
  invoiceNumber: string
  amountDue: string
  dueDate: string | null
  invoiceUrl: string
}

function InvoiceEmail({
  customerName,
  invoiceNumber,
  amountDue,
  dueDate,
  invoiceUrl,
}: InvoiceEmailProps) {
  return (
    <EmailLayout previewText={`Invoice ${invoiceNumber} — ${amountDue} due`}>
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
      <Section className="mt-6 text-center">
        <Button
          href={invoiceUrl}
          className="rounded-lg bg-[#0d0f0c] px-6 py-3 text-[14px] font-semibold text-white"
        >
          View Invoice
        </Button>
      </Section>
      <Text className="m-0 mt-6 text-[13px] text-[#71717a]">
        If the button doesn&apos;t work, copy and paste this link into your
        browser: {invoiceUrl}
      </Text>
    </EmailLayout>
  )
}

export { InvoiceEmail }
export default InvoiceEmail
