"use client"

import * as React from "react"
import { useForm } from "@tanstack/react-form"
import { toast } from "sonner"

import { createServiceAction, updateServiceAction } from "@/actions/services"
import type { InferredServiceInput } from "@/schemas/service.schema"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FormField } from "@/components/forms/form-field"
import { FormError } from "@/components/forms/form-error"
import { SubmitButton } from "@/components/forms/submit-button"
import { TagInput } from "@/components/forms/tag-input"

const emptyService: InferredServiceInput = {
  title: "",
  slug: "",
  description: "",
  icon: "",
  features: [],
  order: 0,
}

interface ServiceFormProps {
  serviceId?: string
  defaultValues?: InferredServiceInput
  onSuccess?: () => void
}

function ServiceForm({ serviceId, defaultValues, onSuccess }: ServiceFormProps) {
  const [formError, setFormError] = React.useState<string | null>(null)

  const form = useForm({
    defaultValues: defaultValues ?? emptyService,
    onSubmit: async ({ value }) => {
      setFormError(null)

      const response = serviceId
        ? await updateServiceAction(serviceId, value)
        : await createServiceAction(value)

      if (!response.success) {
        setFormError(response.error.message)
        return
      }

      toast.success(serviceId ? "Service updated" : "Service created")
      onSuccess?.()
    },
  })

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        form.handleSubmit()
      }}
    >
      <form.Field name="title">
        {(field) => (
          <FormField label="Title" htmlFor="title" required>
            <Input
              id="title"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
            />
          </FormField>
        )}
      </form.Field>

      <form.Field name="slug">
        {(field) => (
          <FormField label="Slug" htmlFor="slug" description="Leave blank to auto-generate from title">
            <Input
              id="slug"
              value={field.state.value ?? ""}
              onChange={(event) => field.handleChange(event.target.value)}
            />
          </FormField>
        )}
      </form.Field>

      <form.Field name="description">
        {(field) => (
          <FormField label="Description" htmlFor="description" required>
            <Textarea
              id="description"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              rows={4}
            />
          </FormField>
        )}
      </form.Field>

      <form.Field name="icon">
        {(field) => (
          <FormField
            label="Icon"
            htmlFor="icon"
            required
            description="A lucide-react icon name, e.g. Rocket"
          >
            <Input
              id="icon"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
            />
          </FormField>
        )}
      </form.Field>

      <form.Field name="features">
        {(field) => (
          <FormField label="Features" htmlFor="features" description="Press comma or enter to add">
            <TagInput id="features" value={field.state.value} onChange={field.handleChange} />
          </FormField>
        )}
      </form.Field>

      <form.Field name="order">
        {(field) => (
          <FormField label="Order" htmlFor="order" className="hidden">
            <Input
              id="order"
              type="number"
              value={field.state.value}
              onChange={(event) => field.handleChange(Number(event.target.value))}
            />
          </FormField>
        )}
      </form.Field>

      {formError && <FormError message={formError} />}

      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <SubmitButton type="submit" isSubmitting={isSubmitting} className="self-start">
            {serviceId ? "Save changes" : "Create service"}
          </SubmitButton>
        )}
      </form.Subscribe>
    </form>
  )
}

export { ServiceForm }
