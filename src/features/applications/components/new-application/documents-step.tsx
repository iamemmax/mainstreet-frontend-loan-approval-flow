"use client"

import { FileText, Trash2 } from "lucide-react"
import { useState } from "react"
import { FileDropZone } from "@/components/shared/file-drop-zone"
import { Button } from "@/components/ui/button"
import type { ApplicationDocument } from "../../types"
import { formatFileSize } from "../../utils/documents"
import { FormCard } from "./fields"
import { OwnerFields, ownerProblem } from "./owner-fields"
import { PlainField } from "./plain-field"

export type DocumentDraft = Pick<
  ApplicationDocument,
  "type" | "fileName" | "sizeBytes" | "description" | "owner" | "bank"
>

const ACCEPT = ".pdf,.jpg,.jpeg,.png"
const MAX_BYTES = 10 * 1_048_576

/** Field-level problems with the documents step, keyed like "documents.0.owner". */
export function documentsErrors(documents: DocumentDraft[]) {
  const errors: Record<string, string> = {}
  if (!documents.length) errors["documents"] = "Upload at least one document"
  documents.forEach((doc, i) => {
    if ((doc.description ?? "").trim().length < 3) errors[`documents.${i}.description`] = "Say what the document is"
    const owner = ownerProblem(doc.owner)
    if (owner) errors[`documents.${i}.owner`] = owner
  })
  return errors
}

/** Why a file can't be taken, or null if it's fine. */
function fileProblem(file: File): string | null {
  if (!/\.(pdf|jpe?g|png)$/i.test(file.name)) return `${file.name}: upload a PDF, JPG or PNG`
  if (file.size > MAX_BYTES) return `${file.name}: files must be 10 MB or smaller`
  return null
}

interface DocumentsStepProps {
  documents: DocumentDraft[]
  onChange: (documents: DocumentDraft[]) => void
  /** The borrower's name, for the "the borrower's" choice. */
  borrowerName: string
  errors: Record<string, string>
  showErrors: boolean
}

/** Step 6: any documents, dropped or picked, each described and tied to the borrower or someone named. */
export function DocumentsStep({ documents, onChange, borrowerName, errors, showErrors }: DocumentsStepProps) {
  const [problems, setProblems] = useState<string[]>([])
  const err = (key: string) => (showErrors ? errors[key] : undefined)
  const setDocument = (i: number, patch: Partial<DocumentDraft>) =>
    onChange(documents.map((doc, j) => (j === i ? { ...doc, ...patch } : doc)))

  const addFiles = (files: File[]) => {
    const accepted: DocumentDraft[] = []
    const rejected: string[] = []
    for (const file of files) {
      const problem = fileProblem(file)
      if (problem) rejected.push(problem)
      else
        accepted.push({
          type: "other",
          fileName: file.name,
          sizeBytes: file.size,
          description: "",
          owner: null,
          bank: null,
        })
    }
    setProblems(rejected)
    if (accepted.length) onChange([...documents, ...accepted])
  }

  return (
    <FormCard
      title="Documents"
      description="Upload any documents: PDF, JPG or PNG up to 10 MB each. Say what each one is and whose it is: the borrower's, or someone else's by name."
      bodyClassName="space-y-4"
    >
      <FileDropZone
        accept={ACCEPT}
        label="Drag and drop files here, or click to choose"
        hint="PDF, JPG or PNG · up to 10 MB each"
        onFiles={addFiles}
      />
      {problems.map((problem) => (
        <p key={problem} className="text-sm text-destructive">
          {problem}
        </p>
      ))}
      {err("documents") && <p className="text-sm text-destructive">{err("documents")}</p>}

      {documents.length > 0 && (
        <ul className="space-y-3">
          {documents.map((doc, i) => (
            <li key={`${doc.fileName}-${i}`} className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <FileText className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{doc.fileName}</div>
                  <div className="text-xs text-muted-foreground">{formatFileSize(doc.sizeBytes)}</div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${doc.fileName}`}
                  onClick={() => onChange(documents.filter((_, j) => j !== i))}
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <PlainField
                  label="What is it?"
                  placeholder="e.g. Payslips for July to September"
                  value={doc.description ?? ""}
                  onChange={(description) => setDocument(i, { description })}
                  error={err(`documents.${i}.description`)}
                />
                <OwnerFields
                  label="Whose document?"
                  owner={doc.owner}
                  borrowerName={borrowerName}
                  onChange={(owner) => setDocument(i, { owner })}
                  error={err(`documents.${i}.owner`)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </FormCard>
  )
}
