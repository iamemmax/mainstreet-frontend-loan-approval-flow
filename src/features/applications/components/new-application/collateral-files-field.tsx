"use client"

import { X } from "lucide-react"
import { useState } from "react"
import { FileDropZone } from "@/components/shared/file-drop-zone"
import { cn } from "@/lib/utils"
import type { Collateral } from "../../types"
import { DocumentThumb } from "../preview/document-thumb"
import { DocumentViewer } from "../preview/document-viewer"
import { collateralViewerItems } from "../preview/viewer-items"

const ACCEPT = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
const MAX_BYTES = 10 * 1024 * 1024
/** Most photos and documents one collateral item can have. */
export const MAX_COLLATERAL_FILES = 6

/** Reads a picked file as a data URL so it can be previewed before the application is saved. */
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/** Why a file can't be taken, or null if it's fine. */
function fileProblem(file: File): string | null {
  if (!ACCEPT.includes(file.type)) return `${file.name}: JPG, PNG, WebP or PDF only`
  if (file.size > MAX_BYTES) return `${file.name}: files must be 10 MB or smaller`
  return null
}

interface CollateralFilesFieldProps {
  item: Collateral
  onChange: (files: Collateral["files"]) => void
  /** Drawn on a document that can't be shown, e.g. the borrower's name. */
  name: string
  error?: string
  className?: string
}

/** Photos and documents for one collateral item: drop or pick several at once, open any full screen, remove any. */
export function CollateralFilesField({ item, onChange, name, error, className }: CollateralFilesFieldProps) {
  const [problems, setProblems] = useState<string[]>([])
  const [viewing, setViewing] = useState<number | null>(null)
  const items = collateralViewerItems(item, name)
  const slotsLeft = MAX_COLLATERAL_FILES - item.files.length

  const addFiles = async (files: File[]) => {
    const rejected: string[] = []
    const accepted: File[] = []
    for (const file of files) {
      const problem = fileProblem(file)
      if (problem) rejected.push(problem)
      else if (accepted.length < slotsLeft) accepted.push(file)
      else rejected.push(`${file.name}: at most ${MAX_COLLATERAL_FILES} files per item`)
    }
    setProblems(rejected)
    if (!accepted.length) return
    const read = await Promise.all(
      accepted.map(async (file) => ({ url: await readAsDataUrl(file), fileName: file.name })),
    )
    onChange([...item.files, ...read])
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="text-sm font-medium">Photos and documents</div>
      {items.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {items.map((file, i) => (
            <li key={file.id} className="relative aspect-square overflow-hidden rounded-md border">
              <button
                type="button"
                aria-label={`Open ${file.fileName}`}
                onClick={() => setViewing(i)}
                className="size-full"
              >
                <DocumentThumb item={file} className="size-full" />
              </button>
              <button
                type="button"
                aria-label={`Remove ${file.fileName}`}
                onClick={() => onChange(item.files.filter((_, j) => j !== i))}
                className="absolute bottom-1 left-1 flex size-6 items-center justify-center rounded-full bg-card/90 text-foreground shadow"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      {slotsLeft > 0 && (
        <FileDropZone
          accept=".jpg,.jpeg,.png,.webp,.pdf"
          label="Drag and drop photos or documents here, or click to choose"
          hint={`JPG, PNG, WebP or PDF · up to 10 MB each · ${slotsLeft} of ${MAX_COLLATERAL_FILES} left`}
          onFiles={(files) => void addFiles(files)}
        />
      )}
      {problems.map((problem) => (
        <p key={problem} className="text-sm text-destructive">
          {problem}
        </p>
      ))}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <DocumentViewer items={items} index={viewing} onIndexChange={setViewing} />
    </div>
  )
}
