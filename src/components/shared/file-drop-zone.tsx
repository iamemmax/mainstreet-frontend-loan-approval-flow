"use client"

import { Upload } from "lucide-react"
import { useId, useState } from "react"
import { cn } from "@/lib/utils"

interface FileDropZoneProps {
  /** File extensions the picker offers, e.g. ".pdf,.jpg". Check the files themselves in `onFiles`. */
  accept: string
  /** What to drop, e.g. "Drag and drop statements here, or click to choose". */
  label: string
  /** Allowed types and size, shown under the label. */
  hint: string
  onFiles: (files: File[]) => void
  disabled?: boolean
}

/** A box files can be dropped on or clicked to pick several at once. */
export function FileDropZone({ accept, label, hint, onFiles, disabled }: FileDropZoneProps) {
  const id = useId()
  const [dragging, setDragging] = useState(false)
  return (
    <label
      htmlFor={id}
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        if (!disabled) onFiles(Array.from(e.dataTransfer.files))
      }}
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-muted/40",
        dragging && "border-primary bg-primary/5",
      )}
    >
      <Upload className="size-6 text-muted-foreground" aria-hidden />
      <span className="text-sm font-medium">{label}</span>
      <span className="text-xs text-muted-foreground">{hint}</span>
      <input
        id={id}
        type="file"
        multiple
        accept={accept}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []))
          e.target.value = ""
        }}
      />
    </label>
  )
}
