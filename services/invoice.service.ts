import "server-only"
import { randomBytes } from "crypto"

import { invoiceRepository, type InvoiceFilter, type InvoiceListOptions } from "@/repositories/invoice.repository"
import { invoiceItemLibraryRepository } from "@/repositories/invoice-item-library.repository"
import { invoiceActivityRepository } from "@/repositories/invoice-activity.repository"
import { NotFoundError, ValidationError } from "@/lib/errors"
import { sendEmail } from "@/lib/mailer"
import { formatCurrency } from "@/lib/currency"
import { SITE_URL } from "@/lib/site"
import { InvoiceEmail } from "@/emails/invoice-email"
import type { InvoiceDocument, InvoicePayment } from "@/models/Invoice"
import type { InvoiceActivityDocument } from "@/models/InvoiceActivity"
import type { InvoiceItemLibraryDocument } from "@/models/InvoiceItemLibrary"
import type { InvoiceStats } from "@/repositories/invoice.repository"
import type {
  InferredInvoiceInput,
  InferredInvoicePaymentInput,
} from "@/schemas/invoice.schema"
import type { InvoiceCurrency, InvoiceStatus } from "@/types/invoice"
import type { PaginatedResult } from "@/types/api"

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

function computeTotals(input: InferredInvoiceInput) {
  const subtotal = roundMoney(
    input.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  )

  let discountAmount = 0
  if (input.discountType === "fixed") {
    discountAmount = Math.min(input.discountValue, subtotal)
  } else if (input.discountType === "percentage") {
    discountAmount = subtotal * (Math.min(input.discountValue, 100) / 100)
  }
  discountAmount = roundMoney(discountAmount)

  return { subtotal, discountAmount, total: roundMoney(subtotal - discountAmount) }
}

function parseDueDate(
  raw: string,
  notBefore: Date
): Date | null {
  if (!raw) return null
  const due = new Date(raw)
  const floor = new Date(notBefore.getFullYear(), notBefore.getMonth(), notBefore.getDate())
  if (due < floor) {
    throw new ValidationError("Due date cannot be before the invoice creation date")
  }
  return due
}

export function isInvoiceOverdue(invoice: {
  status: InvoiceStatus
  dueDate: Date | null
}): boolean {
  return (
    (invoice.status === "sent" || invoice.status === "partially_paid") &&
    invoice.dueDate !== null &&
    new Date(invoice.dueDate) < new Date()
  )
}

export function effectiveStatus(invoice: {
  status: InvoiceStatus
  dueDate: Date | null
}): InvoiceStatus {
  return isInvoiceOverdue(invoice) ? "overdue" : invoice.status
}

function statusAfterPayments(invoice: InvoiceDocument): InvoiceStatus {
  if (invoice.status === "cancelled") return "cancelled"
  const totalPaid = roundMoney(
    invoice.payments.reduce((sum, payment) => sum + payment.amount, 0)
  )
  if (invoice.total > 0 && totalPaid >= invoice.total) return "paid"
  if (totalPaid > 0) return "partially_paid"
  return invoice.sentAt ? "sent" : "draft"
}

async function syncItemLibrary(input: InferredInvoiceInput): Promise<void> {
  for (const item of input.items) {
    await invoiceItemLibraryRepository.recordUsage({
      name: item.name.trim(),
      description: item.description,
      unitPrice: item.unitPrice,
      currency: input.currency,
    })
  }
}

async function list(
  filter: InvoiceFilter,
  options?: InvoiceListOptions
): Promise<PaginatedResult<InvoiceDocument>> {
  return invoiceRepository.findAll(filter, options)
}

async function getById(id: string): Promise<InvoiceDocument> {
  const invoice = await invoiceRepository.findById(id)
  if (!invoice) throw new NotFoundError("Invoice not found")
  return invoice
}

async function getByPublicId(publicId: string): Promise<InvoiceDocument | null> {
  if (!publicId) return null
  return invoiceRepository.findByPublicId(publicId)
}

async function create(
  input: InferredInvoiceInput,
  userId: string
): Promise<InvoiceDocument> {
  const totals = computeTotals(input)
  const dueDate = parseDueDate(input.dueDate, new Date())

  const invoice = await invoiceRepository.create({
    invoiceNumber: await invoiceRepository.nextInvoiceNumber(),
    publicId: randomBytes(16).toString("base64url"),
    customer: input.customer,
    items: input.items,
    currency: input.currency,
    discountType: input.discountType,
    discountValue: input.discountValue,
    ...totals,
    payments: [],
    totalPaid: 0,
    status: "draft",
    dueDate,
    notes: input.notes,
    createdBy: userId,
    updatedBy: userId,
  })

  await syncItemLibrary(input)
  await invoiceActivityRepository.log({
    invoiceId: String(invoice._id),
    type: "created",
    message: `Invoice ${invoice.invoiceNumber} created`,
    userId,
  })

  return invoice
}

async function update(
  id: string,
  input: InferredInvoiceInput,
  userId: string
): Promise<InvoiceDocument> {
  const existing = await getById(id)

  if (existing.status === "cancelled") {
    throw new ValidationError("Cancelled invoices cannot be edited")
  }

  const totals = computeTotals(input)
  const dueDate = parseDueDate(input.dueDate, existing.createdAt)

  const updated = await invoiceRepository.update(id, {
    customer: input.customer,
    items: input.items,
    currency: input.currency,
    discountType: input.discountType,
    discountValue: input.discountValue,
    ...totals,
    dueDate,
    notes: input.notes,
    updatedBy: userId,
  })
  if (!updated) throw new NotFoundError("Invoice not found")

  // Totals may have changed relative to recorded payments.
  const nextStatus = statusAfterPayments(updated)
  const totalPaid = roundMoney(
    updated.payments.reduce((sum, payment) => sum + payment.amount, 0)
  )
  const final = await invoiceRepository.update(id, {
    status: nextStatus,
    totalPaid,
    paidAt: nextStatus === "paid" ? (updated.paidAt ?? new Date()) : null,
  })

  await syncItemLibrary(input)
  await invoiceActivityRepository.log({
    invoiceId: id,
    type: "updated",
    message: `Invoice ${updated.invoiceNumber} updated`,
    userId,
  })

  return final ?? updated
}

async function duplicate(id: string, userId: string): Promise<InvoiceDocument> {
  const source = await getById(id)

  const copy = await invoiceRepository.create({
    invoiceNumber: await invoiceRepository.nextInvoiceNumber(),
    publicId: randomBytes(16).toString("base64url"),
    customer: source.customer,
    items: source.items.map((item) => ({
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    currency: source.currency,
    discountType: source.discountType,
    discountValue: source.discountValue,
    subtotal: source.subtotal,
    discountAmount: source.discountAmount,
    total: source.total,
    payments: [],
    totalPaid: 0,
    status: "draft",
    dueDate: null,
    notes: source.notes,
    createdBy: userId,
    updatedBy: userId,
  })

  await invoiceActivityRepository.log({
    invoiceId: String(copy._id),
    type: "duplicated",
    message: `Duplicated from ${source.invoiceNumber}`,
    userId,
    meta: { sourceInvoiceId: String(source._id) },
  })

  return copy
}

async function remove(id: string, userId: string): Promise<void> {
  const invoice = await getById(id)
  await invoiceRepository.hardDelete(id)
  await invoiceActivityRepository.log({
    invoiceId: id,
    type: "status_changed",
    message: `Invoice ${invoice.invoiceNumber} deleted`,
    userId,
  })
}

async function setStatus(
  id: string,
  status: "paid" | "cancelled" | "sent" | "draft",
  userId: string
): Promise<InvoiceDocument> {
  const invoice = await getById(id)

  const updated = await invoiceRepository.update(id, {
    status,
    paidAt: status === "paid" ? new Date() : status === "cancelled" ? invoice.paidAt : null,
    updatedBy: userId,
  })
  if (!updated) throw new NotFoundError("Invoice not found")

  await invoiceActivityRepository.log({
    invoiceId: id,
    type: "status_changed",
    message: `Status changed from ${invoice.status} to ${status}`,
    userId,
    meta: { from: invoice.status, to: status },
  })

  return updated
}

async function recordPayment(
  id: string,
  input: InferredInvoicePaymentInput,
  userId: string
): Promise<InvoiceDocument> {
  const invoice = await getById(id)
  if (invoice.status === "cancelled") {
    throw new ValidationError("Cannot record payments on a cancelled invoice")
  }

  invoice.payments.push({
    amount: roundMoney(input.amount),
    paymentDate: new Date(input.paymentDate),
    method: input.method,
    reference: input.reference,
    notes: input.notes,
    recordedBy: userId,
    createdAt: new Date(),
  } as InvoicePayment)

  invoice.totalPaid = roundMoney(
    invoice.payments.reduce((sum, payment) => sum + payment.amount, 0)
  )
  const nextStatus = statusAfterPayments(invoice)
  invoice.status = nextStatus
  invoice.paidAt = nextStatus === "paid" ? (invoice.paidAt ?? new Date()) : null
  invoice.updatedBy = userId
  await invoice.save()

  await invoiceActivityRepository.log({
    invoiceId: id,
    type: "payment_recorded",
    message: `Payment of ${formatCurrency(input.amount, invoice.currency)} recorded (${input.method})`,
    userId,
    meta: { amount: input.amount, method: input.method, reference: input.reference },
  })

  return invoice
}

async function updatePayment(
  id: string,
  paymentId: string,
  input: InferredInvoicePaymentInput,
  userId: string
): Promise<InvoiceDocument> {
  const invoice = await getById(id)
  const payment = invoice.payments.find((entry) => String(entry._id) === paymentId)
  if (!payment) throw new NotFoundError("Payment not found")

  const previous = { amount: payment.amount, method: payment.method }

  payment.amount = roundMoney(input.amount)
  payment.paymentDate = new Date(input.paymentDate)
  payment.method = input.method
  payment.reference = input.reference
  payment.notes = input.notes

  invoice.totalPaid = roundMoney(
    invoice.payments.reduce((sum, entry) => sum + entry.amount, 0)
  )
  const nextStatus = statusAfterPayments(invoice)
  invoice.status = nextStatus
  invoice.paidAt = nextStatus === "paid" ? (invoice.paidAt ?? new Date()) : null
  invoice.updatedBy = userId
  await invoice.save()

  await invoiceActivityRepository.log({
    invoiceId: id,
    type: "payment_updated",
    message: `Payment updated: ${formatCurrency(previous.amount, invoice.currency)} → ${formatCurrency(input.amount, invoice.currency)}`,
    userId,
    meta: { paymentId, previous, next: { amount: input.amount, method: input.method } },
  })

  return invoice
}

async function deletePayment(
  id: string,
  paymentId: string,
  userId: string
): Promise<InvoiceDocument> {
  const invoice = await getById(id)
  const payment = invoice.payments.find((entry) => String(entry._id) === paymentId)
  if (!payment) throw new NotFoundError("Payment not found")

  const removed = {
    amount: payment.amount,
    method: payment.method,
    paymentDate: payment.paymentDate,
    reference: payment.reference,
  }

  invoice.payments = invoice.payments.filter(
    (entry) => String(entry._id) !== paymentId
  )
  invoice.totalPaid = roundMoney(
    invoice.payments.reduce((sum, entry) => sum + entry.amount, 0)
  )
  const nextStatus = statusAfterPayments(invoice)
  invoice.status = nextStatus
  invoice.paidAt = nextStatus === "paid" ? (invoice.paidAt ?? new Date()) : null
  invoice.updatedBy = userId
  await invoice.save()

  await invoiceActivityRepository.log({
    invoiceId: id,
    type: "payment_deleted",
    message: `Payment of ${formatCurrency(removed.amount, invoice.currency)} deleted`,
    userId,
    meta: { deletedPayment: removed },
  })

  return invoice
}

async function send(id: string, userId: string): Promise<InvoiceDocument> {
  const invoice = await getById(id)

  if (invoice.status === "cancelled") {
    throw new ValidationError("Cannot send a cancelled invoice")
  }
  if (!invoice.customer.email) {
    throw new ValidationError("This invoice has no customer email address")
  }

  const publicUrl = `${SITE_URL}/invoice/${invoice.publicId}`
  const balance = roundMoney(invoice.total - invoice.totalPaid)

  await sendEmail({
    to: invoice.customer.email,
    subject: `Invoice ${invoice.invoiceNumber} from CreaThink`,
    react: InvoiceEmail({
      customerName: invoice.customer.name || "there",
      invoiceNumber: invoice.invoiceNumber,
      amountDue: formatCurrency(balance, invoice.currency),
      dueDate: invoice.dueDate
        ? new Date(invoice.dueDate).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : null,
      invoiceUrl: publicUrl,
    }),
  })

  const now = new Date()
  const updated = await invoiceRepository.update(id, {
    status: invoice.status === "draft" ? "sent" : invoice.status,
    sentAt: invoice.sentAt ?? now,
    lastSentAt: now,
    sentCount: invoice.sentCount + 1,
    updatedBy: userId,
  })
  if (!updated) throw new NotFoundError("Invoice not found")

  await invoiceActivityRepository.log({
    invoiceId: id,
    type: "sent",
    message: `Invoice emailed to ${invoice.customer.email}`,
    userId,
  })

  return updated
}

async function searchLibrary(
  query: string,
  currency: InvoiceCurrency
): Promise<InvoiceItemLibraryDocument[]> {
  return invoiceItemLibraryRepository.search(query, currency)
}

async function getActivity(id: string): Promise<InvoiceActivityDocument[]> {
  return invoiceActivityRepository.findByInvoice(id)
}

async function getStats(): Promise<Record<string, InvoiceStats>> {
  return invoiceRepository.stats()
}

export const invoiceService = {
  list,
  getById,
  getByPublicId,
  create,
  update,
  duplicate,
  remove,
  setStatus,
  recordPayment,
  updatePayment,
  deletePayment,
  send,
  searchLibrary,
  getActivity,
  getStats,
}
