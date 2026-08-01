"use client"

import * as React from "react"
import { useForm } from "@tanstack/react-form"
import { toast } from "sonner"

import {
  createTestimonialAction,
  updateTestimonialAction,
  generateTestimonialLinkAction,
} from "@/actions/testimonials"
import type { InferredTestimonialInput } from "@/schemas/testimonial.schema"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
import { MediaPicker } from "@/components/admin/media-picker"
import { StarPicker } from "@/components/shared/star-picker"

const REVIEW_MAX_LENGTH = 120

const emptyTestimonial: InferredTestimonialInput = {
  clientName: "",
  position: "",
  company: "",
  image: "",
  review: "",
  ratingQuality: 5,
  ratingCommunication: 5,
  ratingValueForMoney: 5,
  projectId: null,
  order: 0,
}

interface TestimonialFormProps {
  testimonialId?: string
  defaultValues?: InferredTestimonialInput
  projectOptions: { id: string; title: string }[]
  onSuccess?: () => void
}

function TestimonialForm({
  testimonialId,
  defaultValues,
  projectOptions,
  onSuccess,
}: TestimonialFormProps) {
  const [formError, setFormError] = React.useState<string | null>(null)
  const [isGeneratingLink, setIsGeneratingLink] = React.useState(false)

  const projectItems = React.useMemo(
    () => [{ id: "", title: "None" }, ...projectOptions],
    [projectOptions]
  )

  const form = useForm({
    defaultValues: defaultValues ?? emptyTestimonial,
    onSubmit: async ({ value }) => {
      setFormError(null)

      const response = testimonialId
        ? await updateTestimonialAction(testimonialId, value)
        : await createTestimonialAction(value)

      if (!response.success) {
        setFormError(response.error.message)
        return
      }

      toast.success(
        testimonialId ? "Testimonial updated" : "Testimonial created"
      )
      onSuccess?.()
    },
  })

  async function generateTestimonialLink() {
    setFormError(null)

    const projectId = form.getFieldValue("projectId")
    if (!projectId) {
      setFormError(
        "Select a related project before generating a testimonial link."
      )
      return
    }

    setIsGeneratingLink(true)
    try {
      const response = await generateTestimonialLinkAction(projectId)

      if (!response.success) {
        setFormError(response.error.message)
        return
      }

      const link = `${window.location.origin}/testimonials/create?token=${response.data.token}`

      if (navigator.clipboard) {
        await navigator.clipboard.writeText(link)
        toast.success("Testimonial link copied to clipboard")
      } else {
        toast.success(`Testimonial link: ${link}`)
      }

      onSuccess?.()
    } finally {
      setIsGeneratingLink(false)
    }
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        form.handleSubmit()
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <form.Field name="clientName">
          {(field) => (
            <FormField label="Client name" htmlFor="clientName" required>
              <Input
                id="clientName"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            </FormField>
          )}
        </form.Field>

        <form.Field name="position">
          {(field) => (
            <FormField label="Position" htmlFor="position" description="Optional">
              <Input
                id="position"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            </FormField>
          )}
        </form.Field>

        <form.Field name="company">
          {(field) => (
            <FormField
              label="Company"
              htmlFor="company"
              description="Optional"
              className="sm:col-span-2"
            >
              <Input
                id="company"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
              />
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
                onChange={(event) =>
                  field.handleChange(Number(event.target.value))
                }
              />
            </FormField>
          )}
        </form.Field>
      </div>

      <form.Field name="image">
        {(field) => (
          <FormField
            label="Profile image"
            htmlFor="image"
            description="Optional — initials will be shown if left empty"
          >
            <MediaPicker
              value={field.state.value ?? ""}
              onSelect={field.handleChange}
            />
          </FormField>
        )}
      </form.Field>

      <form.Field name="review">
        {(field) => (
          <FormField label="Review" htmlFor="review" required>
            <Textarea
              id="review"
              value={field.state.value}
              onChange={(event) =>
                field.handleChange(event.target.value.slice(0, REVIEW_MAX_LENGTH))
              }
              rows={4}
              maxLength={REVIEW_MAX_LENGTH}
            />
            <span className="self-end text-xs text-muted-foreground">
              {field.state.value.length}/{REVIEW_MAX_LENGTH}
            </span>
          </FormField>
        )}
      </form.Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <form.Field name="ratingQuality">
          {(field) => (
            <FormField label="Quality" htmlFor="ratingQuality" required>
              <StarPicker
                id="ratingQuality"
                label="quality"
                value={field.state.value}
                onChange={field.handleChange}
              />
            </FormField>
          )}
        </form.Field>

        <form.Field name="ratingCommunication">
          {(field) => (
            <FormField label="Communication" htmlFor="ratingCommunication" required>
              <StarPicker
                id="ratingCommunication"
                label="communication"
                value={field.state.value}
                onChange={field.handleChange}
              />
            </FormField>
          )}
        </form.Field>

        <form.Field name="ratingValueForMoney">
          {(field) => (
            <FormField label="Value for money" htmlFor="ratingValueForMoney" required>
              <StarPicker
                id="ratingValueForMoney"
                label="value for money"
                value={field.state.value}
                onChange={field.handleChange}
              />
            </FormField>
          )}
        </form.Field>
      </div>

      <form.Field name="projectId">
        {(field) => (
          <FormField
            label="Related project"
            htmlFor="projectId"
            description="Optional — required only when generating a testimonial link"
          >
            <Combobox
              items={projectItems}
              itemToStringLabel={(item) => item?.title ?? ""}
              value={
                projectItems.find((item) => item.id === field.state.value) ??
                null
              }
              onValueChange={(item) => field.handleChange(item?.id || null)}
            >
              <ComboboxInput placeholder="Search projects..." id="projectId" />
              <ComboboxContent>
                <ComboboxEmpty>No projects found.</ComboboxEmpty>
                <ComboboxList>
                  {(project: { id: string; title: string }) => (
                    <ComboboxItem key={project.id} value={project}>
                      {project.title}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </FormField>
        )}
      </form.Field>

      {formError && <FormError message={formError} />}

      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <div className="flex flex-col gap-2 md:flex-row">
            <SubmitButton
              type="submit"
              isSubmitting={isSubmitting}
              className="self-start"
            >
              {testimonialId ? "Save changes" : "Create testimonial"}
            </SubmitButton>
            {!testimonialId && (
              <SubmitButton
                type="button"
                className="self-start"
                isSubmitting={isGeneratingLink}
                submittingLabel="Generating..."
                onClick={() => generateTestimonialLink()}
              >
                Generate Testimonial Link
              </SubmitButton>
            )}
          </div>
        )}
      </form.Subscribe>
    </form>
  )
}

export { TestimonialForm }
