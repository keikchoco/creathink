"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon } from "lucide-react"

import {
  createInvoiceAction,
  updateInvoiceAction,
  searchInvoiceItemLibraryAction,
  type LibraryItemOption,
} from "@/actions/invoices"
import { invoiceSchema, type InferredInvoiceInput } from "@/schemas/invoice.schema"
import { formatCurrency } from "@/lib/currency"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox"
import { FormField } from "@/components/forms/form-field"
import { FormError } from "@/components/forms/form-error"
import { SubmitButton } from "@/components/forms/submit-button"
import type { InvoiceCurrency } from "@/types/invoice"

interface InvoiceFormItem {
  name: string
  description: string
  quantity: number
  unitPrice: number
}

export interface InvoiceFormValues {
  customer: {
    name: string
    email: string
    company: string
    billingAddress: string
  }
  items: InvoiceFormItem[]
  currency: InvoiceCurrency
  discountType: "fixed" | "percentage" | "none"
  discountValue: number
  dueDate: string
  notes: string
}

const emptyItem: InvoiceFormItem = {
  name: "",
  description: "",
  quantity: 1,
  unitPrice: 0,
}

const emptyValues: InvoiceFormValues = {
  customer: { name: "", email: "", company: "", billingAddress: "" },
  items: [{ ...emptyItem }],
  currency: "PHP",
  discountType: "none",
  discountValue: 0,
  dueDate: "",
  notes: "",
}

interface InvoiceFormProps {
  invoiceId?: string
  defaultValues?: InvoiceFormValues
}

function InvoiceForm({ invoiceId, defaultValues }: InvoiceFormProps) {
  const router = useRouter()
  const [values, setValues] = React.useState<InvoiceFormValues>(
    defaultValues ?? emptyValues
  )
  const [formError, setFormError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [libraryItems, setLibraryItems] = React.useState<LibraryItemOption[]>([])

  React.useEffect(() => {
    let cancelled = false
    searchInvoiceItemLibraryAction("", values.currency).then((response) => {
      if (!cancelled && response.success) {
        setLibraryItems(response.data)
      }
    })
    return () => {
      cancelled = true
    }
  }, [values.currency])

  function setCustomer(field: keyof InvoiceFormValues["customer"], value: string) {
    setValues((previous) => ({
      ...previous,
      customer: { ...previous.customer, [field]: value },
    }))
  }

  function setItem(index: number, field: keyof InvoiceFormItem, value: string | number) {
    setValues((previous) => ({
      ...previous,
      items: previous.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }))
  }

  function addItem(item?: InvoiceFormItem) {
    setValues((previous) => ({
      ...previous,
      items: [...previous.items, item ?? { ...emptyItem }],
    }))
  }

  function removeItem(index: number) {
    setValues((previous) => ({
      ...previous,
      items: previous.items.filter((_, i) => i !== index),
    }))
  }

  function moveItem(index: number, direction: -1 | 1) {
    setValues((previous) => {
      const target = index + direction
      if (target < 0 || target >= previous.items.length) return previous
      const items = [...previous.items]
      ;[items[index], items[target]] = [items[target], items[index]]
      return { ...previous, items }
    })
  }

  const subtotal = values.items.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0),
    0
  )
  const discountAmount =
    values.discountType === "fixed"
      ? Math.min(values.discountValue || 0, subtotal)
      : values.discountType === "percentage"
        ? subtotal * (Math.min(values.discountValue || 0, 100) / 100)
        : 0
  const grandTotal = Math.max(0, subtotal - discountAmount)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setFormError(null)

    const payload: InferredInvoiceInput | Record<string, unknown> = {
      customer: values.customer,
      items: values.items,
      currency: values.currency,
      discountType: values.discountType === "none" ? null : values.discountType,
      discountValue: values.discountValue,
      dueDate: values.dueDate,
      notes: values.notes,
    }

    const parsed = invoiceSchema.safeParse(payload)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      setFormError(issue ? issue.message : "Please check the form for errors.")
      return
    }

    setIsSubmitting(true)
    const response = invoiceId
      ? await updateInvoiceAction(invoiceId, parsed.data)
      : await createInvoiceAction(parsed.data)
    setIsSubmitting(false)

    if (!response.success) {
      setFormError(response.error.message)
      return
    }

    toast.success(invoiceId ? "Invoice updated" : "Invoice created")
    router.push(`/admin/invoices/${response.data.id}`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Customer</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <FormField label="Name" htmlFor="customerName" description="Optional">
              <Input
                id="customerName"
                value={values.customer.name}
                onChange={(event) => setCustomer("name", event.target.value)}
              />
            </FormField>
            <FormField
              label="Email"
              htmlFor="customerEmail"
              description="Optional — required only to send the invoice by email"
            >
              <Input
                id="customerEmail"
                type="email"
                value={values.customer.email}
                onChange={(event) => setCustomer("email", event.target.value)}
              />
            </FormField>
            <FormField label="Company" htmlFor="customerCompany" description="Optional">
              <Input
                id="customerCompany"
                value={values.customer.company}
                onChange={(event) => setCustomer("company", event.target.value)}
              />
            </FormField>
            <FormField
              label="Billing address"
              htmlFor="billingAddress"
              description="Optional"
            >
              <Textarea
                id="billingAddress"
                rows={3}
                value={values.customer.billingAddress}
                onChange={(event) => setCustomer("billingAddress", event.target.value)}
              />
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <FormField label="Currency" htmlFor="currency" required>
              <Select
                value={values.currency}
                onValueChange={(value) =>
                  setValues((previous) => ({
                    ...previous,
                    currency: value as InvoiceCurrency,
                  }))
                }
              >
                <SelectTrigger className="w-40" id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PHP">PHP (₱)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="AUD">AUD ($)</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Due date" htmlFor="dueDate" description="Optional">
              <Input
                id="dueDate"
                type="date"
                value={values.dueDate}
                onChange={(event) =>
                  setValues((previous) => ({ ...previous, dueDate: event.target.value }))
                }
                className="w-48"
              />
            </FormField>
            <div className="flex flex-wrap items-end gap-3">
              <FormField label="Discount" htmlFor="discountType">
                <Select
                  value={values.discountType}
                  onValueChange={(value) =>
                    setValues((previous) => ({
                      ...previous,
                      discountType: value as InvoiceFormValues["discountType"],
                      discountValue: value === "none" ? 0 : previous.discountValue,
                    }))
                  }
                >
                  <SelectTrigger className="w-40" id="discountType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No discount</SelectItem>
                    <SelectItem value="fixed">Fixed amount</SelectItem>
                    <SelectItem value="percentage">Percentage</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              {values.discountType !== "none" && (
                <FormField
                  label={values.discountType === "percentage" ? "Percent (%)" : "Amount"}
                  htmlFor="discountValue"
                >
                  <Input
                    id="discountValue"
                    type="number"
                    min={0}
                    step="0.01"
                    value={values.discountValue}
                    onChange={(event) =>
                      setValues((previous) => ({
                        ...previous,
                        discountValue: Number(event.target.value),
                      }))
                    }
                    className="w-32"
                  />
                </FormField>
              )}
            </div>
            <FormField label="Notes" htmlFor="notes" description="Optional — shown on the invoice">
              <Textarea
                id="notes"
                rows={3}
                value={values.notes}
                onChange={(event) =>
                  setValues((previous) => ({ ...previous, notes: event.target.value }))
                }
              />
            </FormField>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle>Items</CardTitle>
          <div className="w-72">
            <Combobox
              items={libraryItems}
              itemToStringLabel={(item) => item?.name ?? ""}
              value={null as LibraryItemOption | null}
              onValueChange={(item) => {
                if (item) {
                  addItem({
                    name: item.name,
                    description: item.description,
                    quantity: 1,
                    unitPrice: item.unitPrice,
                  })
                }
              }}
            >
              <ComboboxInput placeholder="Add from item library..." />
              <ComboboxContent>
                <ComboboxEmpty>No saved items yet.</ComboboxEmpty>
                <ComboboxList>
                  {(item: LibraryItemOption) => (
                    <ComboboxItem key={item.id} value={item}>
                      <div className="flex w-full items-center justify-between gap-2">
                        <span className="truncate">{item.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatCurrency(item.unitPrice, values.currency)}
                        </span>
                      </div>
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {values.items.map((item, index) => (
            <div
              key={index}
              className="flex flex-col gap-3 rounded-lg border p-4"
            >
              <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
                <FormField label="Item name" htmlFor={`item-name-${index}`} required>
                  <Input
                    id={`item-name-${index}`}
                    value={item.name}
                    onChange={(event) => setItem(index, "name", event.target.value)}
                  />
                </FormField>
                <FormField label="Qty" htmlFor={`item-qty-${index}`} required>
                  <Input
                    id={`item-qty-${index}`}
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.quantity}
                    onChange={(event) =>
                      setItem(index, "quantity", Number(event.target.value))
                    }
                    className="w-24"
                  />
                </FormField>
                <FormField label="Unit price" htmlFor={`item-price-${index}`} required>
                  <Input
                    id={`item-price-${index}`}
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(event) =>
                      setItem(index, "unitPrice", Number(event.target.value))
                    }
                    className="w-32"
                  />
                </FormField>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Line total</span>
                  <span className="flex h-9 items-center text-sm font-medium">
                    {formatCurrency(
                      (item.quantity || 0) * (item.unitPrice || 0),
                      values.currency
                    )}
                  </span>
                </div>
              </div>
              <FormField
                label="Description"
                htmlFor={`item-desc-${index}`}
                description="Optional"
              >
                <Input
                  id={`item-desc-${index}`}
                  value={item.description}
                  onChange={(event) => setItem(index, "description", event.target.value)}
                />
              </FormField>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Move item up"
                  disabled={index === 0}
                  onClick={() => moveItem(index, -1)}
                >
                  <ArrowUpIcon />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Move item down"
                  disabled={index === values.items.length - 1}
                  onClick={() => moveItem(index, 1)}
                >
                  <ArrowDownIcon />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={values.items.length <= 1}
                  onClick={() => removeItem(index)}
                >
                  <Trash2Icon />
                  Remove
                </Button>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            className="self-start"
            onClick={() => addItem()}
          >
            <PlusIcon />
            Add item
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col items-end gap-1 py-4 text-sm">
          <div className="flex w-64 justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(subtotal, values.currency)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex w-64 justify-between">
              <span className="text-muted-foreground">
                Discount
                {values.discountType === "percentage" ? ` (${values.discountValue}%)` : ""}
              </span>
              <span>-{formatCurrency(discountAmount, values.currency)}</span>
            </div>
          )}
          <div className="flex w-64 justify-between border-t pt-2 text-base font-semibold">
            <span>Grand Total</span>
            <span>{formatCurrency(grandTotal, values.currency)}</span>
          </div>
        </CardContent>
      </Card>

      {formError && <FormError message={formError} />}

      <div className="flex gap-2">
        <SubmitButton type="submit" isSubmitting={isSubmitting}>
          {invoiceId ? "Save changes" : "Create invoice"}
        </SubmitButton>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

export { InvoiceForm }
