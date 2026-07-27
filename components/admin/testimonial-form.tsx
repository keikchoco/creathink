"use client"

import * as React from "react"
import { useForm } from "@tanstack/react-form"
import { toast } from "sonner"
import { StarIcon } from "lucide-react"

import {
  createTestimonialAction,
  updateTestimonialAction,
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
  ComboboxLabel,
} from "@/components/ui/combobox"
import { FormField } from "@/components/forms/form-field"
import { FormError } from "@/components/forms/form-error"
import { SubmitButton } from "@/components/forms/submit-button"
import { MediaPicker } from "@/components/admin/media-picker"
import { cn } from "@/lib/utils"
import { useState } from "react"

const emptyTestimonial: InferredTestimonialInput = {
  clientName: "",
  position: "",
  company: "",
  image: "",
  review: "",
  rating: 5,
  projectId: null,
  order: 0,
  userFilled: false,
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
  const [isGeneratingLink, setIsGeneratingLink] = useState(false)

  const form = useForm({
    defaultValues: defaultValues ?? emptyTestimonial,
    onSubmit: async ({ value }) => {
      setFormError(null)

      if (isGeneratingLink && !value.projectId) {
        setFormError(
          "A related project is required when generating a testimonial link."
        )
        setIsGeneratingLink(false)
        return
      }

      if (isGeneratingLink) {
        const response = await createTestimonialAction({
          ...value,
          status: "draft",
          userFilled: true,
        })

        if (!response.success) {
          setFormError(response.error.message)
          setIsGeneratingLink(false)
          return
        }

        toast.success("Testimonial link generated with id: " + response.data.id)

        if(navigator.clipboard) {
          navigator.clipboard.writeText(
            `${window.location.origin}/testimonials/create?id=${response.data.id}`
          )
          toast.success("Testimonial link copied to clipboard")
        }
        setIsGeneratingLink(false)
        onSuccess?.()
        return
      }

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
    setIsGeneratingLink(true)

    form.handleSubmit()
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
            <FormField
              label="Client name"
              htmlFor="clientName"
              required={isGeneratingLink ? false : true}
            >
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
            <FormField
              label="Position"
              htmlFor="position"
              required={isGeneratingLink ? false : true}
            >
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
              required={isGeneratingLink ? false : true}
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
          <FormField
            label="Review"
            htmlFor="review"
            required={isGeneratingLink ? false : true}
          >
            <Textarea
              id="review"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              rows={4}
            />
          </FormField>
        )}
      </form.Field>

      <form.Field name="rating">
        {(field) => (
          <FormField
            label="Rating"
            htmlFor="rating"
            required={isGeneratingLink ? false : true}
          >
            <div className="flex items-center gap-1" id="rating">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-label={`Rate ${value} out of 5 stars`}
                  aria-pressed={field.state.value >= value}
                  onClick={() => field.handleChange(value)}
                  className="p-0.5"
                >
                  <StarIcon
                    className={cn(
                      "size-5 transition-colors",
                      field.state.value >= value
                        ? "fill-primary text-primary"
                        : "fill-none text-muted-foreground/40"
                    )}
                  />
                </button>
              ))}
            </div>
          </FormField>
        )}
      </form.Field>

      <form.Field name="projectId">
        {(field) => (
          <FormField
            label="Related project"
            htmlFor="projectId"
            description="Optional"
            required={isGeneratingLink ? true : false}
          >
            <Combobox
              items={[{ id: "", title: "None" }, ...projectOptions]}
              value={field.state.value ?? ""}
              onValueChange={(value) => field.handleChange(value || null)}
            >
              <ComboboxInput placeholder="Search projects..." id="projectId" />
              <ComboboxContent>
                <ComboboxEmpty>No projects found.</ComboboxEmpty>
                <ComboboxList>
                  {(project) => (
                    <ComboboxItem key={project.id} value={project.id}>
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
                className="self-start"
                onClick={(e) => {
                  e.preventDefault()
                  generateTestimonialLink()
                }}
                disabled={isGeneratingLink}
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
