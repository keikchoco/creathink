"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { GripVerticalIcon, PlusIcon, Trash2Icon } from "lucide-react"

import { updatePaymentMethodsAction } from "@/actions/settings"
import { paymentSettingsSchema } from "@/schemas/payment-settings.schema"
import { Card, CardContent } from "@/components/ui/card"
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
import { FormField } from "@/components/forms/form-field"
import { FormError } from "@/components/forms/form-error"
import { SubmitButton } from "@/components/forms/submit-button"
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/types/invoice"
import { cn } from "@/lib/utils"

interface PaymentMethodFormEntry {
  method: PaymentMethod
  label: string
  details: string
  enabled: boolean
}

interface PaymentMethodsFormProps {
  defaultValues: PaymentMethodFormEntry[]
}

function emptyEntry(): PaymentMethodFormEntry {
  return { method: "bank_transfer", label: "", details: "", enabled: true }
}

function PaymentMethodsForm({ defaultValues }: PaymentMethodsFormProps) {
  const router = useRouter()
  const [methods, setMethods] = React.useState<PaymentMethodFormEntry[]>(
    defaultValues.length > 0 ? defaultValues : [emptyEntry()]
  )
  const [formError, setFormError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  function updateEntry(index: number, patch: Partial<PaymentMethodFormEntry>) {
    setMethods((previous) =>
      previous.map((entry, i) => (i === index ? { ...entry, ...patch } : entry))
    )
  }

  function addEntry() {
    setMethods((previous) => [...previous, emptyEntry()])
  }

  function removeEntry(index: number) {
    setMethods((previous) => previous.filter((_, i) => i !== index))
  }

  function moveEntry(index: number, direction: -1 | 1) {
    setMethods((previous) => {
      const target = index + direction
      if (target < 0 || target >= previous.length) return previous
      const next = [...previous]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setFormError(null)

    const payload = {
      methods: methods.map((entry, index) => ({ ...entry, order: index })),
    }

    const parsed = paymentSettingsSchema.safeParse(payload)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      setFormError(issue ? issue.message : "Please check the form for errors.")
      return
    }

    setIsSubmitting(true)
    const response = await updatePaymentMethodsAction(parsed.data)
    setIsSubmitting(false)

    if (!response.success) {
      setFormError(response.error.message)
      return
    }

    toast.success("Payment methods updated")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {methods.map((entry, index) => (
        <Card key={index}>
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="flex items-start gap-3">
              <div className="mt-2 flex flex-col items-center gap-1 text-muted-foreground">
                <GripVerticalIcon className="size-4" />
              </div>
              <div className="grid flex-1 gap-4 sm:grid-cols-2">
                <FormField label="Type" htmlFor={`method-type-${index}`} required>
                  <Select
                    value={entry.method}
                    onValueChange={(value) =>
                      updateEntry(index, { method: value as PaymentMethod })
                    }
                  >
                    <SelectTrigger className="w-full" id={`method-type-${index}`}>
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
                  label="Label"
                  htmlFor={`method-label-${index}`}
                  description="Shown to the client, e.g. “BDO Bank Transfer”"
                  required
                >
                  <Input
                    id={`method-label-${index}`}
                    value={entry.label}
                    onChange={(event) =>
                      updateEntry(index, { label: event.target.value })
                    }
                    placeholder={PAYMENT_METHOD_LABELS[entry.method]}
                  />
                </FormField>
              </div>
            </div>

            <FormField
              label="Details"
              htmlFor={`method-details-${index}`}
              description="Account name, number, GCash number, PayPal.me link, etc."
              required
            >
              <Textarea
                id={`method-details-${index}`}
                rows={3}
                value={entry.details}
                onChange={(event) =>
                  updateEntry(index, { details: event.target.value })
                }
              />
            </FormField>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <button
                  type="button"
                  role="switch"
                  aria-checked={entry.enabled}
                  onClick={() => updateEntry(index, { enabled: !entry.enabled })}
                  className={cn(
                    "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                    entry.enabled ? "bg-primary" : "bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 left-0.5 size-5 rounded-full bg-background transition-transform",
                      entry.enabled && "translate-x-5"
                    )}
                  />
                </button>
                Show on invoices
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={index === 0}
                  onClick={() => moveEntry(index, -1)}
                >
                  Move up
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={index === methods.length - 1}
                  onClick={() => moveEntry(index, 1)}
                >
                  Move down
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeEntry(index)}
                >
                  <Trash2Icon />
                  Remove
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <Button type="button" variant="outline" className="self-start" onClick={addEntry}>
        <PlusIcon />
        Add payment method
      </Button>

      {formError && <FormError message={formError} />}

      <SubmitButton type="submit" isSubmitting={isSubmitting} className="self-start">
        Save payment methods
      </SubmitButton>
    </form>
  )
}

export { PaymentMethodsForm }
