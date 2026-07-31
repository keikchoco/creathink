"use client"

import * as React from "react"

const VIEWPORT_SIZE = 256
const OUTPUT_SIZE = 512
const MIN_ZOOM = 1
const MAX_ZOOM = 3

interface PhotoCropperProps {
  file: File
}

export interface PhotoCropperHandle {
  getCroppedFile(): Promise<File>
}

interface Offset {
  x: number
  y: number
}

function clampOffset(
  offset: Offset,
  naturalWidth: number,
  naturalHeight: number,
  zoom: number
): Offset {
  const coverScale = VIEWPORT_SIZE / Math.min(naturalWidth, naturalHeight)
  const scale = coverScale * zoom
  const maxX = Math.max(0, (naturalWidth * scale - VIEWPORT_SIZE) / 2)
  const maxY = Math.max(0, (naturalHeight * scale - VIEWPORT_SIZE) / 2)
  return {
    x: Math.min(maxX, Math.max(-maxX, offset.x)),
    y: Math.min(maxY, Math.max(-maxY, offset.y)),
  }
}

const PhotoCropper = React.forwardRef<PhotoCropperHandle, PhotoCropperProps>(
  function PhotoCropper({ file }, ref) {
    const imageRef = React.useRef<HTMLImageElement | null>(null)
    const [imageSrc, setImageSrc] = React.useState<string | null>(null)
    const [naturalSize, setNaturalSize] = React.useState<{
      width: number
      height: number
    } | null>(null)
    const [zoom, setZoom] = React.useState(1)
    const [offset, setOffset] = React.useState<Offset>({ x: 0, y: 0 })
    const [previousFile, setPreviousFile] = React.useState(file)
    const dragStartRef = React.useRef<{ pointer: Offset; offset: Offset } | null>(null)

    React.useEffect(() => {
      let cancelled = false
      const reader = new FileReader()
      reader.onload = () => {
        const src = reader.result as string
        const probe = new window.Image()
        probe.onload = () => {
          if (!cancelled) {
            setImageSrc(src)
            setNaturalSize({ width: probe.naturalWidth, height: probe.naturalHeight })
          }
        }
        probe.src = src
      }
      reader.readAsDataURL(file)
      return () => {
        cancelled = true
      }
    }, [file])

    if (previousFile !== file) {
      setPreviousFile(file)
      setImageSrc(null)
      setNaturalSize(null)
      setZoom(1)
      setOffset({ x: 0, y: 0 })
    }

    function handlePointerDown(event: React.PointerEvent) {
      event.currentTarget.setPointerCapture(event.pointerId)
      dragStartRef.current = {
        pointer: { x: event.clientX, y: event.clientY },
        offset,
      }
    }

    function handlePointerMove(event: React.PointerEvent) {
      const start = dragStartRef.current
      if (!start || !naturalSize) return
      const next = {
        x: start.offset.x + (event.clientX - start.pointer.x),
        y: start.offset.y + (event.clientY - start.pointer.y),
      }
      setOffset(clampOffset(next, naturalSize.width, naturalSize.height, zoom))
    }

    function handlePointerUp() {
      dragStartRef.current = null
    }

    function handleZoomChange(event: React.ChangeEvent<HTMLInputElement>) {
      const nextZoom = Number(event.target.value)
      setZoom(nextZoom)
      if (naturalSize) {
        setOffset((previous) =>
          clampOffset(previous, naturalSize.width, naturalSize.height, nextZoom)
        )
      }
    }

    React.useImperativeHandle(ref, () => ({
      async getCroppedFile() {
        const image = imageRef.current
        if (!image || !naturalSize) {
          throw new Error("Photo is not ready yet. Please try again.")
        }

        const coverScale = VIEWPORT_SIZE / Math.min(naturalSize.width, naturalSize.height)
        const scale = coverScale * zoom
        const cropSize = VIEWPORT_SIZE / scale
        const centerX = naturalSize.width / 2 - offset.x / scale
        const centerY = naturalSize.height / 2 - offset.y / scale

        const canvas = document.createElement("canvas")
        canvas.width = OUTPUT_SIZE
        canvas.height = OUTPUT_SIZE
        const context = canvas.getContext("2d")
        if (!context) {
          throw new Error("Unable to process the photo in this browser.")
        }

        context.drawImage(
          image,
          centerX - cropSize / 2,
          centerY - cropSize / 2,
          cropSize,
          cropSize,
          0,
          0,
          OUTPUT_SIZE,
          OUTPUT_SIZE
        )

        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", 0.92)
        )
        if (!blob) {
          throw new Error("Unable to process the photo. Please try another image.")
        }

        return new File([blob], "photo.jpg", { type: "image/jpeg" })
      },
    }))

    const coverScale = naturalSize
      ? VIEWPORT_SIZE / Math.min(naturalSize.width, naturalSize.height)
      : 1
    const scale = coverScale * zoom
    const displayWidth = naturalSize ? naturalSize.width * scale : 0
    const displayHeight = naturalSize ? naturalSize.height * scale : 0

    return (
      <div className="flex flex-col gap-3">
        <div
          className="relative touch-none overflow-hidden rounded-xl border bg-muted"
          style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          role="img"
          aria-label="Drag to reposition your photo"
        >
          {imageSrc && naturalSize && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={imageRef}
              src={imageSrc}
              alt=""
              draggable={false}
              className="absolute max-w-none cursor-move select-none"
              style={{
                width: displayWidth,
                height: displayHeight,
                left: VIEWPORT_SIZE / 2 - displayWidth / 2 + offset.x,
                top: VIEWPORT_SIZE / 2 - displayHeight / 2 + offset.y,
              }}
            />
          )}
          <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-foreground/10" />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="size-full rounded-full border border-dashed border-background/60" />
          </div>
        </div>

        <label
          className="flex items-center gap-3 text-xs text-muted-foreground"
          style={{ width: VIEWPORT_SIZE }}
        >
          Zoom
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={handleZoomChange}
            className="flex-1 accent-primary"
            aria-label="Zoom photo"
          />
        </label>

        <p className="text-xs text-muted-foreground" style={{ maxWidth: VIEWPORT_SIZE }}>
          Drag the photo to reposition it and use the slider to zoom. The square area
          is what will be uploaded.
        </p>
      </div>
    )
  }
)

export { PhotoCropper }
