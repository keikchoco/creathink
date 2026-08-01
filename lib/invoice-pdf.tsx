import "server-only"
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer"

import { SITE_NAME, SITE_URL, CONTACT_EMAIL } from "@/lib/site"
import type { InvoiceDocument } from "@/models/Invoice"
import type { InvoiceCurrency, InvoiceStatus } from "@/types/invoice"
import { INVOICE_CLIENT_STATUS_LABELS } from "@/types/invoice"

// @react-pdf's built-in fonts don't include the peso glyph reliably, so we
// format amounts with explicit currency codes instead of symbols.
function formatPdfAmount(amount: number, currency: InvoiceCurrency): string {
  return `${currency} ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatDate(value: Date | string | null): string {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 10, fontFamily: "Helvetica", color: "#18181b" },
  logoChip: {
    backgroundColor: "#0d0f0c",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignSelf: "flex-start",
  },
  logoImage: { height: 22 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  brand: { fontSize: 20, fontFamily: "Helvetica-Bold" },
  brandMeta: { marginTop: 4, color: "#52525b", lineHeight: 1.5 },
  invoiceTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", textAlign: "right" },
  invoiceMeta: { marginTop: 4, color: "#52525b", textAlign: "right", lineHeight: 1.5 },
  section: { marginBottom: 24 },
  sectionLabel: {
    fontSize: 8,
    color: "#71717a",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  bold: { fontFamily: "Helvetica-Bold" },
  muted: { color: "#52525b", lineHeight: 1.5 },
  table: { marginBottom: 16 },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#18181b",
    paddingBottom: 6,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e4e4e7",
    paddingVertical: 6,
  },
  colName: { flex: 5 },
  colQty: { flex: 1, textAlign: "right" },
  colPrice: { flex: 2, textAlign: "right" },
  colTotal: { flex: 2, textAlign: "right" },
  itemDescription: { color: "#71717a", marginTop: 2 },
  totals: { alignSelf: "flex-end", width: 220, marginTop: 8 },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  grandTotal: {
    borderTopWidth: 1,
    borderTopColor: "#18181b",
    marginTop: 4,
    paddingTop: 6,
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
  },
  paymentMethods: {
    marginBottom: 24,
    padding: 12,
    backgroundColor: "#fafafa",
    borderRadius: 6,
  },
  paymentMethodRow: { marginTop: 6 },
  footer: {
    position: "absolute",
    bottom: 32,
    left: 48,
    right: 48,
    borderTopWidth: 0.5,
    borderTopColor: "#e4e4e7",
    paddingTop: 8,
    color: "#a1a1aa",
    fontSize: 8,
    textAlign: "center",
  },
})

interface InvoicePdfProps {
  invoice: Pick<
    InvoiceDocument,
    | "invoiceNumber"
    | "customer"
    | "items"
    | "currency"
    | "discountType"
    | "discountValue"
    | "subtotal"
    | "discountAmount"
    | "total"
    | "totalPaid"
    | "dueDate"
    | "createdAt"
    | "paidAt"
    | "notes"
  > & { status: InvoiceStatus }
  logoSrc?: string
  paymentMethods?: { label: string; details: string }[]
}

export function InvoicePdf({ invoice, logoSrc, paymentMethods = [] }: InvoicePdfProps) {
  const balance = Math.max(0, invoice.total - invoice.totalPaid)
  const showPaymentMethods =
    invoice.status !== "paid" && invoice.status !== "cancelled" && balance > 0

  return (
    <Document title={`Invoice ${invoice.invoiceNumber}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            {logoSrc ? (
              <View style={styles.logoChip}>
                {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf Image has no alt prop */}
                <Image style={styles.logoImage} src={logoSrc} />
              </View>
            ) : (
              <Text style={styles.brand}>{SITE_NAME}</Text>
            )}
            <Text style={styles.brandMeta}>
              {SITE_URL.replace(/^https?:\/\//, "")}
              {"\n"}
              {CONTACT_EMAIL}
            </Text>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceMeta}>
              {invoice.invoiceNumber}
              {"\n"}
              Status: {INVOICE_CLIENT_STATUS_LABELS[invoice.status]}
            </Text>
          </View>
        </View>

        <View style={[styles.section, { flexDirection: "row", justifyContent: "space-between" }]}>
          <View style={{ maxWidth: 260 }}>
            <Text style={styles.sectionLabel}>Billed To</Text>
            <Text style={styles.bold}>{invoice.customer.name || "—"}</Text>
            <Text style={styles.muted}>
              {invoice.customer.email}
              {invoice.customer.company ? `\n${invoice.customer.company}` : ""}
              {invoice.customer.billingAddress ? `\n${invoice.customer.billingAddress}` : ""}
            </Text>
          </View>
          <View>
            <Text style={styles.sectionLabel}>Dates</Text>
            <Text style={styles.muted}>
              Issued: {formatDate(invoice.createdAt)}
              {"\n"}
              Due: {formatDate(invoice.dueDate)}
              {invoice.paidAt ? `\nPaid: ${formatDate(invoice.paidAt)}` : ""}
            </Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.colName, styles.bold]}>Item</Text>
            <Text style={[styles.colQty, styles.bold]}>Qty</Text>
            <Text style={[styles.colPrice, styles.bold]}>Unit Price</Text>
            <Text style={[styles.colTotal, styles.bold]}>Total</Text>
          </View>
          {invoice.items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <View style={styles.colName}>
                <Text>{item.name}</Text>
                {item.description ? (
                  <Text style={styles.itemDescription}>{item.description}</Text>
                ) : null}
              </View>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>
                {formatPdfAmount(item.unitPrice, invoice.currency)}
              </Text>
              <Text style={styles.colTotal}>
                {formatPdfAmount(item.quantity * item.unitPrice, invoice.currency)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalsRow}>
            <Text>Subtotal</Text>
            <Text>{formatPdfAmount(invoice.subtotal, invoice.currency)}</Text>
          </View>
          {invoice.discountAmount > 0 && (
            <View style={styles.totalsRow}>
              <Text>
                Discount
                {invoice.discountType === "percentage"
                  ? ` (${invoice.discountValue}%)`
                  : ""}
              </Text>
              <Text>-{formatPdfAmount(invoice.discountAmount, invoice.currency)}</Text>
            </View>
          )}
          <View style={[styles.totalsRow, styles.grandTotal]}>
            <Text>Grand Total</Text>
            <Text>{formatPdfAmount(invoice.total, invoice.currency)}</Text>
          </View>
          {invoice.totalPaid > 0 && (
            <>
              <View style={styles.totalsRow}>
                <Text>Paid</Text>
                <Text>-{formatPdfAmount(invoice.totalPaid, invoice.currency)}</Text>
              </View>
              <View style={[styles.totalsRow, styles.bold]}>
                <Text>Balance Due</Text>
                <Text>{formatPdfAmount(balance, invoice.currency)}</Text>
              </View>
            </>
          )}
        </View>

        {showPaymentMethods && paymentMethods.length > 0 ? (
          <View style={styles.paymentMethods}>
            <Text style={styles.sectionLabel}>Payment Methods</Text>
            {paymentMethods.map((method, index) => (
              <View key={index} style={index > 0 ? styles.paymentMethodRow : undefined}>
                <Text style={styles.bold}>{method.label}</Text>
                <Text style={styles.muted}>{method.details}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {invoice.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Notes</Text>
            <Text style={styles.muted}>{invoice.notes}</Text>
          </View>
        ) : null}

        <Text style={styles.footer}>
          Thank you for your business. {SITE_NAME} · {SITE_URL.replace(/^https?:\/\//, "")}
        </Text>
      </Page>
    </Document>
  )
}
