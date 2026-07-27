"use client"
import { TestimonialForm } from "@/components/admin/testimonial-form"
import { projectService } from "@/services/project.service"
import { useRouter, useSearchParams } from "next/navigation"
import React, { Suspense, useEffect } from "react"
import GetData from "./data"

const TestimonialsCreate = async () => {
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = React.useState(true)
  const router = useRouter()
  const id = searchParams.get("id")

  let projectOptions: { id: string; title: string }[] = []

  useEffect(() => {
    if (!id && !isLoading) {
      router.push("/testimonials")
    }
  }, [id, isLoading, router])

  useEffect(() => {
    const fetchData = async () => {
      projectOptions = await GetData().then((data) => data)

      console.log(projectOptions)
    }


    setIsLoading(false)
  }, [])

  return (
    <div>
      <div>Testimonial Form for ID: {id}</div>
      <Suspense fallback={<div>Loading...</div>}>
        <TestimonialForm
          testimonialId={id ?? undefined}
          projectOptions={projectOptions ?? []}
          onSuccess={() => {
            router.push("/testimonials")
          }}
        />
      </Suspense>
    </div>
  )
}

export default TestimonialsCreate
