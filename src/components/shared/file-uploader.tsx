"use client"

import { CircleAlert, CircleCheck, FileText, Loader2, RefreshCw, Trash2, Upload } from "lucide-react"
import { useCallback, useEffect, useId, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

export type UploadStatus = "uploading" | "uploaded" | "failed" | "rejected"

export interface UploadItem {
  id: string
  file: File
  status: UploadStatus
  progress: number
  error?: string
  previewUrl?: string
}

/** Uploads one file, reporting progress 0–100. Rejects with an Error on failure. */
export type UploadFn = (file: File, onProgress: (pct: number) => void) => Promise<void>

interface FileUploaderProps {
  /** MIME types, e.g. ["application/pdf", "image/jpeg"]. */
  accept: string[]
  maxSizeBytes: number
  maxFiles?: number
  upload: UploadFn
  onChange?: (items: UploadItem[]) => void
  label?: string
  hint?: string
  disabled?: boolean
}

const EXT: Record<string, string> = {
  "application/pdf": "PDF",
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "image/webp": "WEBP",
}

function formatBytes(b: number) {
  return b >= 1_048_576 ? `${(b / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`
}

/** Simulated upload used while the app runs on mock data. */
export const mockUpload: UploadFn = (file, onProgress) =>
  new Promise((resolve, reject) => {
    let pct = 0
    const id = setInterval(() => {
      pct = Math.min(100, pct + 12 + Math.random() * 18)
      onProgress(Math.round(pct))
      if (pct >= 100) {
        clearInterval(id)
        if (/fail/i.test(file.name)) reject(new Error("Upload failed — the server rejected the file"))
        else resolve()
      }
    }, 180)
  })

export function FileUploader({
  accept,
  maxSizeBytes,
  maxFiles = 10,
  upload,
  onChange,
  label = "Upload files",
  hint,
  disabled,
}: FileUploaderProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<UploadItem[]>([])
  const [dragging, setDragging] = useState(false)
  const itemsRef = useRef(items)
  itemsRef.current = items

  useEffect(() => onChange?.(items), [items, onChange])
  useEffect(() => () => itemsRef.current.forEach((i) => i.previewUrl && URL.revokeObjectURL(i.previewUrl)), [])

  const patch = (id: string, p: Partial<UploadItem>) =>
    setItems((list) => list.map((i) => (i.id === id ? { ...i, ...p } : i)))

  const start = useCallback(
    (item: UploadItem) => {
      patch(item.id, { status: "uploading", progress: 0, error: undefined })
      upload(item.file, (progress) => patch(item.id, { progress }))
        .then(() => patch(item.id, { status: "uploaded", progress: 100 }))
        .catch((e: unknown) =>
          patch(item.id, { status: "failed", error: e instanceof Error ? e.message : "Upload failed" }),
        )
    },
    [upload],
  )

  const addFiles = (files: FileList | File[]) => {
    const room = maxFiles - items.filter((i) => i.status !== "rejected").length
    const next: UploadItem[] = Array.from(files).map((file, idx) => {
      const id = `${file.name}-${file.size}-${Date.now()}-${idx}`
      let error: string | undefined
      if (!accept.includes(file.type)) error = `${accept.map((a) => EXT[a] ?? a).join(", ")} only`
      else if (file.size > maxSizeBytes) error = `Larger than ${formatBytes(maxSizeBytes)}`
      else if (idx >= room) error = `Maximum of ${maxFiles} files`
      return {
        id,
        file,
        status: error ? "rejected" : "uploading",
        progress: 0,
        error,
        previewUrl: !error && file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      }
    })
    setItems((list) => [...list, ...next])
    next.filter((i) => i.status !== "rejected").forEach(start)
  }

  const remove = (id: string) =>
    setItems((list) => {
      const item = list.find((i) => i.id === id)
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl)
      return list.filter((i) => i.id !== id)
    })

  return (
    <div className="space-y-3">
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (!disabled) addFiles(e.dataTransfer.files)
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-8 text-center transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
          dragging ? "border-primary bg-primary/5" : "hover:bg-muted/40",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <span className="flex size-9 items-center justify-center rounded-md border bg-background text-muted-foreground">
          <Upload className="size-4" aria-hidden />
        </span>
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">
          {hint ??
            `Drag and drop or click to browse · ${accept.map((a) => EXT[a] ?? a).join(", ")} · up to ${formatBytes(maxSizeBytes)}`}
        </span>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple={maxFiles > 1}
          accept={accept.join(",")}
          disabled={disabled}
          className="sr-only"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files)
            e.target.value = ""
          }}
        />
      </label>

      {items.length > 0 && (
        <ul className="divide-y rounded-lg border" aria-live="polite">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 p-3">
              <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/50">
                {item.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
                  <img src={item.previewUrl} alt="" className="size-full object-cover" />
                ) : (
                  <FileText className="size-4 text-muted-foreground" aria-hidden />
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{item.file.name}</span>
                  <span className="tabular shrink-0 text-xs text-muted-foreground">{formatBytes(item.file.size)}</span>
                </div>
                {item.status === "uploading" && (
                  <Progress value={item.progress} className="h-1" aria-label={`Uploading ${item.file.name}`} />
                )}
                {item.status === "uploaded" && (
                  <span className="flex items-center gap-1 text-xs text-success">
                    <CircleCheck className="size-3" aria-hidden /> Uploaded
                  </span>
                )}
                {(item.status === "failed" || item.status === "rejected") && (
                  <span className="flex items-center gap-1 text-xs text-destructive">
                    <CircleAlert className="size-3" aria-hidden /> {item.error}
                  </span>
                )}
              </div>
              {item.status === "uploading" && (
                <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
              )}
              {item.status === "failed" && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Retry ${item.file.name}`}
                  onClick={() => start(item)}
                >
                  <RefreshCw aria-hidden />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${item.file.name}`}
                onClick={() => remove(item.id)}
                disabled={item.status === "uploading"}
              >
                <Trash2 aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
