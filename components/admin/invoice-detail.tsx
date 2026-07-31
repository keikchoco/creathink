"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  CopyIcon,
  DownloadIcon,
  MailIcon,
  PencilIcon,
  PlusIcon,
  Share2Icon,
  Trash2Icon,
} from "lucide-react"

import {
  deleteInvoiceAction,
  duplicateInvoiceAction,
  sendInvoiceAction,
  setInvoiceStatusAction,
  recordInvoicePaymentAction,
  updateInvoicePaymentAction,
  deleteInvoicePaymentAction,
} from "@/actions/invoices"
import { formatCurrency } from "@/lib/currency"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FormDialog } from "@/components/admin/form-dialog"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { FormField } from "@/components/forms/form-field"
import { FormError } from "@/components/forms/form-error"
import { SubmitButton } from "@/components/forms/submit-button"
import { InvoiceStatusBadge } from "@/components/admin/invoice-status-badge"
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  type InvoiceCurrency,
  type InvoiceStatus,
  type PaymentMethod,
} from "@/types/invoice"

export interface InvoicePaymentData {
  id: string
  amount: number
  paymentDate: string
  method: PaymentMethod
  reference: string
  notes: string
}

export interface InvoiceActivityData {
  id: string
  type: string
  message: string
  createdAt: string
}

export interface InvoiceDetailData {
  id: string
  invoiceNumber: string
  publicId: string
  status: InvoiceStatus
  currency: InvoiceCurrency
  customer: {
    name: string
    email: string
    company: string
    billingAddress: string
  }
  items: {
    name: string
    description: string
    quantity: number
    unitPrice: number
  }[]
  discountType: "fixed" | "percentage" | null
  discountValue: number
  subtotal: number
  discountAmount: number
  total: number
  totalPaid: number
  payments: InvoicePaymentData[]
  dueDate: string | null
  paidAt: string | null
  sentAt: string | null
  lastSentAt: string | null
  sentCount: number
  notes: string
  createdAt: string
  updatedAt: string
}

interface PaymentFormState {
  amount: string
  paymentDate: string
  method: PaymentMethod
  reference: string
  notes: string
}

const emptyPayment: PaymentFormState = {
  amount: "",
  paymentDate: new Date().toISOString().slice(0, 10),
  method: "bank_transfer",
  reference: "",
  notes: "",
}

function formatDate(value: string | null): string {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function InvoiceDetail({
  invoice,
  activities,
}: {
  invoice: InvoiceDetailData
  activities: InvoiceActivityData[]
}) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [showCancelDialog, setShowCancelDialog] = React.useState(false)
  const [paymentDialog, setPaymentDialog] = React.useState<
    { mode: "create" } | { mode: "edit"; paymentId: string } | null
  >(null)
  const [paymentForm, setPaymentForm] = React.useState<PaymentFormState>(emptyPayment)
  const [paymentError, setPaymentError] = React.useState<string | null>(null)
  const [isSavingPayment, setIsSavingPayment] = React.useState(false)
  const [deletingPaymentId, setDeletingPaymentId] = React.useState<string | null>(null)
  const [isDeletingPayment, setIsDeletingPayment] = React.useState(false)

  const balance = Math.max(0, invoice.total - invoice.totalPaid)
  const publicUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/invoice/${invoice.publicId}`

  async function run(
    action: () => Promise<{ success: boolean; error?: { message: string } }>,
    successMessage: string
  ) {
    const response = await action()
    if (!response.success) {
      toast.error(response.error?.message ?? "Something went wrong")
      return false
    }
    toast.success(successMessage)
    router.refresh()
    return true
  }

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(publicUrl)
      toast.success("Invoice link copied to clipboard")
    } catch {
      toast.error("Unable to copy the link")
    }
  }

  async function handleDuplicate() {
    const response = await duplicateInvoiceAction(invoice.id)
    if (!response.success) {
      toast.error(response.error.message)
      return
    }
    toast.success("Invoice duplicated")
    router.push(`/admin/invoices/${response.data.id}`)
  }

  async function handleDelete() {
    setIsDeleting(true)
    const response = await deleteInvoiceAction(invoice.id)
    setIsDeleting(false)
    if (!response.success) {
      toast.error(response.error.message)
      return
    }
    toast.success("Invoice deleted")
    router.push("/admin/invoices")
  }

  function openRecordPayment() {
    setPaymentForm({ ...emptyPayment, amount: balance > 0 ? String(balance) : "" })
    setPaymentError(null)
    setPaymentDialog({ mode: "create" })
  }

  function openEditPayment(payment: InvoicePaymentData) {
    setPaymentForm({
      amount: String(payment.amount),
      paymentDate: payment.paymentDate.slice(0, 10),
      method: payment.method,
      reference: payment.reference,
      notes: payment.notes,
    })
    setPaymentError(null)
    setPaymentDialog({ mode: "edit", paymentId: payment.id })
  }

  async function handlePaymentSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!paymentDialog) return
    setPaymentError(null)
    setIsSavingPayment(true)

    const payload = {
      amount: paymentForm.amount,
      paymentDate: paymentForm.paymentDate,
      method: paymentForm.method,
      reference: paymentForm.reference,
      notes: paymentForm.notes,
    }

    const response =
      paymentDialog.mode === "create"
        ? await recordInvoicePaymentAction(invoice.id, payload)
        : await updateInvoicePaymentAction(invoice.id, paymentDialog.paymentId, payload)

    setIsSavingPayment(false)

    if (!response.success) {
      setPaymentError(response.error.message)
      return
    }

    toast.success(
      paymentDialog.mode === "create" ? "Payment recorded" : "Payment updated"
    )
    setPaymentDialog(null)
    router.refresh()
  }

  async function handleDeletePayment() {
    if (!deletingPaymentId) return
    setIsDeletingPayment(true)
    const response = await deleteInvoicePaymentAction(invoice.id, deletingPaymentId)
    setIsDeletingPayment(false)
    if (!response.success) {
      toast.error(response.error.message)
      return
    }
    toast.success("Payment deleted")
    setDeletingPaymentId(null)
    router.refresh()
  }

  const canMutate = invoice.status !== "cancelled"

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        {canMutate && (
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/admin/invoices/${invoice.id}/edit`} />}
          >
            <PencilIcon />
            Edit
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={handleDuplicate}>
          <CopyIcon />
          Duplicate
        </Button>
        <Button variant="outline" size="sm" onClick={handleShare}>
          <Share2Icon />
          Share
        </Button>
        <Button
          variant="outline"
          size="sm"
          render={
            <a href={`/api/invoices/${invoice.publicId}/pdf`} target="_blank" rel="noreferrer" />
          }
        >
          <DownloadIcon />
          Download PDF
        </Button>
        {canMutate && invoice.customer.email && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              run(() => sendInvoiceAction(invoice.id), "Invoice sent to customer")
            }
          >
            <MailIcon />
            {invoice.sentCount > 0 ? "Resend Invoice" : "Send Invoice"}
          </Button>
        )}
        {canMutate && invoice.status !== "paid" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              run(() => setInvoiceStatusAction(invoice.id, "paid"), "Marked as paid")
            }
          >
            Mark Paid
          </Button>
        )}
        {canMutate && (
          <Button variant="ghost" size="sm" onClick={() => setShowCancelDialog(true)}>
            Mark Cancelled
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => setShowDeleteDialog(true)}>
          <Trash2Icon />
          Delete
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-2 font-medium">Item</th>
                      <th className="pb-2 text-right font-medium">Qty</th>
                      <th className="pb-2 text-right font-medium">Unit Price</th>
                      <th className="pb-2 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item, index) => (
                      <tr key={index} className="border-b last:border-0">
                        <td className="py-3">
                          <div className="font-medium">{item.name}</div>
                          {item.description && (
                            <div className="text-xs text-muted-foreground">
                              {item.description}
                            </div>
                          )}
                        </td>
                        <td className="py-3 text-right">{item.quantity}</td>
                        <td className="py-3 text-right">
                          {formatCurrency(item.unitPrice, invoice.currency)}
                        </td>
                        <td className="py-3 text-right">
                          {formatCurrency(item.quantity * item.unitPrice, invoice.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-col items-end gap-1 text-sm">
                <div className="flex w-64 justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(invoice.subtotal, invoice.currency)}</span>
                </div>
                {invoice.discountAmount > 0 && (
                  <div className="flex w-64 justify-between">
                    <span className="text-muted-foreground">
                      Discount
                      {invoice.discountType === "percentage"
                        ? ` (${invoice.discountValue}%)`
                        : ""}
                    </span>
                    <span>-{formatCurrency(invoice.discountAmount, invoice.currency)}</span>
                  </div>
                )}
                <div className="flex w-64 justify-between border-t pt-2 text-base font-semibold">
                  <span>Grand Total</span>
                  <span>{formatCurrency(invoice.total, invoice.currency)}</span>
                </div>
                {invoice.totalPaid > 0 && (
                  <>
                    <div className="flex w-64 justify-between">
                      <span className="text-muted-foreground">Paid</span>
                      <span>-{formatCurrency(invoice.totalPaid, invoice.currency)}</span>
                    </div>
                    <div className="flex w-64 justify-between font-medium">
                      <span>Balance Due</span>
                      <span>{formatCurrency(balance, invoice.currency)}</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Payments</CardTitle>
              {canMutate && (
                <Button size="sm" variant="outline" onClick={openRecordPayment}>
                  <PlusIcon />
                  Record Payment
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {invoice.payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No payments recorded yet.
                </p>
              ) : (
                invoice.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {formatCurrency(payment.amount, invoice.currency)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {PAYMENT_METHOD_LABELS[payment.method]} ·{" "}
                        {formatDate(payment.paymentDate)}
                        {payment.reference && ` · Ref: ${payment.reference}`}
                      </span>
                      {payment.notes && (
                        <span className="text-xs text-muted-foreground">
                          {payment.notes}
                        </span>
                      )}
                    </div>
                    {canMutate && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditPayment(payment)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingPaymentId(payment.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
              {invoice.total > 0 && (
                <div className="flex justify-between border-t pt-3 text-sm font-medium">
                  <span>Remaining Balance</span>
                  <span>{formatCurrency(balance, invoice.currency)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 text-sm">
              {!invoice.customer.name &&
              !invoice.customer.email &&
              !invoice.customer.company &&
              !invoice.customer.billingAddress ? (
                <span className="text-muted-foreground">No customer details</span>
              ) : null}
              {invoice.customer.name && (
                <span className="font-medium">{invoice.customer.name}</span>
              )}
              {invoice.customer.email && (
                <span className="text-muted-foreground">{invoice.customer.email}</span>
              )}
              {invoice.customer.company && (
                <span className="text-muted-foreground">{invoice.customer.company}</span>
              )}
              {invoice.customer.billingAddress && (
                <span className="whitespace-pre-line text-muted-foreground">
                  {invoice.customer.billingAddress}
                </span>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <InvoiceStatusBadge status={invoice.status} />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDate(invoice.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Due</span>
                <span>{formatDate(invoice.dueDate)}</span>
              </div>
              {invoice.paidAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paid</span>
                  <span>{formatDate(invoice.paidAt)}</span>
                </div>
              )}
              {invoice.sentAt && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">First sent</span>
                    <span>{formatDate(invoice.sentAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last sent</span>
                    <span>{formatDate(invoice.lastSentAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Times sent</span>
                    <span>{invoice.sentCount}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              ) : (
                activities.map((activity) => (
                  <div key={activity.id} className="flex flex-col">
                    <span className="text-sm">{activity.message}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(activity.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <FormDialog
        open={paymentDialog !== null}
        onOpenChange={(open) => !open && setPaymentDialog(null)}
        title={paymentDialog?.mode === "edit" ? "Edit payment" : "Record payment"}
      >
        <form onSubmit={handlePaymentSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Amount" htmlFor="paymentAmount" required>
              <Input
                id="paymentAmount"
                type="number"
                min={0}
                step="0.01"
                value={paymentForm.amount}
                onChange={(event) =>
                  setPaymentForm((previous) => ({
                    ...previous,
                    amount: event.target.value,
                  }))
                }
              />
            </FormField>
            <FormField label="Payment date" htmlFor="paymentDate" required>
              <Input
                id="paymentDate"
                type="date"
                value={paymentForm.paymentDate}
                onChange={(event) =>
                  setPaymentForm((previous) => ({
                    ...previous,
                    paymentDate: event.target.value,
                  }))
                }
              />
            </FormField>
          </div>
          <FormField label="Method" htmlFor="paymentMethod" required>
            <Select
              value={paymentForm.method}
              onValueChange={(value) =>
                setPaymentForm((previous) => ({
                  ...previous,
                  method: value as PaymentMethod,
                }))
              }
            >
              <SelectTrigger className="w-48" id="paymentMethod">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method} value={method}>
                    {PAYMENT_METHOD_LABELS[method]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField
            label="Reference number"
            htmlFor="paymentReference"
            description="Optional"
          >
            <Input
              id="paymentReference"
              value={paymentForm.reference}
              onChange={(event) =>
                setPaymentForm((previous) => ({
                  ...previous,
                  reference: event.target.value,
                }))
              }
            />
          </FormField>
          <FormField label="Notes" htmlFor="paymentNotes" description="Optional">
            <Textarea
              id="paymentNotes"
              rows={2}
              value={paymentForm.notes}
              onChange={(event) =>
                setPaymentForm((previous) => ({
                  ...previous,
                  notes: event.target.value,
                }))
              }
            />
          </FormField>
          {paymentError && <FormError message={paymentError} />}
          <SubmitButton type="submit" isSubmitting={isSavingPayment} className="self-start">
            {paymentDialog?.mode === "edit" ? "Save payment" : "Record payment"}
          </SubmitButton>
        </form>
      </FormDialog>

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete invoice?"
        description={`Invoice ${invoice.invoiceNumber} and its payment history will be permanently removed.`}
        isConfirming={isDeleting}
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        title="Cancel invoice?"
        description={`Invoice ${invoice.invoiceNumber} will be marked as cancelled. It can no longer be edited or sent.`}
        isConfirming={false}
        onConfirm={async () => {
          const ok = await run(
            () => setInvoiceStatusAction(invoice.id, "cancelled"),
            "Invoice cancelled"
          )
          if (ok) setShowCancelDialog(false)
        }}
      />

      <ConfirmDialog
        open={deletingPaymentId !== null}
        onOpenChange={(open) => !open && setDeletingPaymentId(null)}
        title="Delete payment?"
        description="The payment record will be removed and the invoice balance recalculated. This action is logged in the invoice timeline."
        isConfirming={isDeletingPayment}
        onConfirm={handleDeletePayment}
      />
    </div>
  )
}

export { InvoiceDetail }
