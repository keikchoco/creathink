"use client"

import * as React from "react"
import { useForm } from "@tanstack/react-form"
import { StarIcon, CheckCircle2Icon } from "lucide-react"

import { submitClientTestimonialAction } from "@/actions/testimonials"
import { PhotoCropper, type PhotoCropperHandle } from "@/components/public/photo-cropper"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FormField } from "@/components/forms/form-field"
import { FormError } from "@/components/forms/form-error"
import { SubmitButton } from "@/components/forms/submit-button"
import { cn } from "@/lib/utils"

const PHOTO_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]
const PHOTO_MAX_SIZE_BYTES = 5 * 1024 * 1024
const REVIEW_MAX_LENGTH = 120

interface StarPickerProps {
  id: string
  label: string
  value: number
  onChange: (value: number) => void
}

function StarPicker({ id, label, value, onChange }: StarPickerProps) {
  return (
    <div className="flex items-center gap-1" id={id}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          aria-label={`Rate ${label} ${star} out of 5 stars`}
          aria-pressed={value >= star}
          onClick={() => onChange(star)}
          className="p-0.5"
        >
          <StarIcon
            className={cn(
              "size-5 transition-colors",
              value >= star
                ? "fill-primary text-primary"
                : "fill-none text-muted-foreground/40"
            )}
          />
        </button>
      ))}
    </div>
  )
}

interface ClientTestimonialFormProps {
  token: string
  projectTitle?: string
}

function ClientTestimonialForm({ token, projectTitle }: ClientTestimonialFormProps) {
  const [formError, setFormError] = React.useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = React.useState(false)
  const [rawPhoto, setRawPhoto] = React.useState<File | null>(null)
  const [croppedPhoto, setCroppedPhoto] = React.useState<File | null>(null)
  const [croppedPreview, setCroppedPreview] = React.useState<string | null>(null)
  const [photoError, setPhotoError] = React.useState<string | null>(null)
  const [isEditorOpen, setIsEditorOpen] = React.useState(false)
  const [isCropping, setIsCropping] = React.useState(false)
  const cropperRef = React.useRef<PhotoCropperHandle | null>(null)
  const photoInputRef = React.useRef<HTMLInputElement | null>(null)

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    setPhotoError(null)
    const file = event.target.files?.[0] ?? null

    if (!file) return

    if (!PHOTO_ALLOWED_TYPES.includes(file.type)) {
      setPhotoError("Unsupported photo type. Allowed: JPEG, PNG, WebP.")
      event.target.value = ""
      return
    }

    if (file.size > PHOTO_MAX_SIZE_BYTES) {
      setPhotoError("Photo is too large. Maximum size is 5MB.")
      event.target.value = ""
      return
    }

    setRawPhoto(file)
    setIsEditorOpen(true)
  }

  function updateCroppedPreview(file: File | null) {
    setCroppedPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous)
      return file ? URL.createObjectURL(file) : null
    })
  }

  async function handleCropApply() {
    if (!cropperRef.current) return
    setIsCropping(true)
    try {
      const cropped = await cropperRef.current.getCroppedFile()
      setCroppedPhoto(cropped)
      updateCroppedPreview(cropped)
      setIsEditorOpen(false)
    } catch (error) {
      setPhotoError(
        error instanceof Error
          ? error.message
          : "Unable to process your photo. Please try again."
      )
      setIsEditorOpen(false)
    } finally {
      setIsCropping(false)
    }
  }

  function handleEditorOpenChange(open: boolean) {
    setIsEditorOpen(open)
    if (!open && !croppedPhoto) {
      // Cancelled before ever applying a crop — discard the selection.
      setRawPhoto(null)
      if (photoInputRef.current) photoInputRef.current.value = ""
    }
  }

  function handlePhotoRemove() {
    setRawPhoto(null)
    setCroppedPhoto(null)
    updateCroppedPreview(null)
    setPhotoError(null)
    if (photoInputRef.current) photoInputRef.current.value = ""
  }

  const form = useForm({
    defaultValues: {
      clientName: "",
      position: "",
      company: "",
      review: "",
      ratingQuality: 5,
      ratingCommunication: 5,
      ratingValueForMoney: 5,
      website: "",
    },
    onSubmit: async ({ value }) => {
      setFormError(null)

      const formData = new FormData()
      formData.set("clientName", value.clientName)
      formData.set("position", value.position)
      formData.set("company", value.company)
      formData.set("review", value.review)
      formData.set("ratingQuality", String(value.ratingQuality))
      formData.set("ratingCommunication", String(value.ratingCommunication))
      formData.set("ratingValueForMoney", String(value.ratingValueForMoney))
      formData.set("website", value.website)
      if (croppedPhoto) formData.set("photo", croppedPhoto)

      const response = await submitClientTestimonialAction(token, formData)

      if (!response.success) {
        setFormError(response.error.message)
        return
      }

      setIsSubmitted(true)
    },
  })

  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-16 text-center">
        <CheckCircle2Icon className="size-8 text-primary" />
        <p className="font-heading text-lg font-medium">Thank you for your testimonial!</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Your review has been submitted and will appear on our website once it&apos;s approved.
        </p>
      </div>
    )
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        form.handleSubmit()
      }}
    >
      {projectTitle && (
        <p className="text-sm text-muted-foreground">
          Sharing your experience about <span className="font-medium text-foreground">{projectTitle}</span>
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <form.Field name="clientName">
          {(field) => (
            <FormField label="Your name" htmlFor="clientName" required>
              <Input
                id="clientName"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                autoComplete="name"
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
                autoComplete="organization-title"
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
                autoComplete="organization"
              />
            </FormField>
          )}
        </form.Field>
      </div>

      <FormField
        label="Your photo"
        htmlFor="photo"
        description="Optional — JPEG, PNG or WebP, up to 5MB"
      >
        <div className="flex items-center gap-3">
          {croppedPreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={croppedPreview}
              alt="Preview of your photo"
              className="size-14 shrink-0 rounded-full object-cover"
            />
          )}
          <Input
            id="photo"
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePhotoChange}
            className={croppedPhoto ? "hidden" : undefined}
          />
          {croppedPhoto && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditorOpen(true)}
              >
                Edit
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={handlePhotoRemove}>
                Remove
              </Button>
            </>
          )}
        </div>
        {photoError && <FormError message={photoError} />}
      </FormField>

      <Dialog open={isEditorOpen} onOpenChange={handleEditorOpenChange}>
        <DialogContent className="w-fit sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust your photo</DialogTitle>
            <DialogDescription>
              Drag to reposition and zoom until your photo fits the square.
            </DialogDescription>
          </DialogHeader>
          {rawPhoto && <PhotoCropper ref={cropperRef} file={rawPhoto} />}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleEditorOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleCropApply} loading={isCropping}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <form.Field name="review">
        {(field) => (
          <FormField label="Your review" htmlFor="review" required>
            <Textarea
              id="review"
              value={field.state.value}
              onChange={(event) =>
                field.handleChange(event.target.value.slice(0, REVIEW_MAX_LENGTH))
              }
              rows={5}
              maxLength={REVIEW_MAX_LENGTH}
              placeholder="Tell us about your experience working with us..."
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

      <form.Field name="website">
        {(field) => (
          <input
            type="text"
            name="website"
            value={field.state.value}
            onChange={(event) => field.handleChange(event.target.value)}
            className="hidden"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
          />
        )}
      </form.Field>

      {formError && <FormError message={formError} />}

      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <SubmitButton type="submit" isSubmitting={isSubmitting} className="self-start">
            Submit testimonial
          </SubmitButton>
        )}
      </form.Subscribe>
    </form>
  )
}

export { ClientTestimonialForm }
