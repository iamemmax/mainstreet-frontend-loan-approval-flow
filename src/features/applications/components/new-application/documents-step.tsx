"use client"

import { FileText, Trash2 } from "lucide-react"
import { useState } from "react"
import { Controller, useFieldArray, useFormContext } from "react-hook-form"
import { FileDropZone } from "@/components/shared/file-drop-zone"
import { Button } from "@/components/ui/button"
import { formatFileSize } from "../../utils/documents"
import { FormCard, TextField } from "./fields"
import type { DocumentDraft } from "./list-schemas"
import { OwnerFields } from "./owner-fields"
import type { FormValues } from "./schema"
import { borrowerName } from "./to-input"

const ACCEPT = ".pdf,.jpg,.jpeg,.png"
const MAX_BYTES = 10 * 1_048_576

/** Why a file can't be taken, or null if it's fine. */
function fileProblem(file: File): string | null {
  if (!/\.(pdf|jpe?g|png)$/i.test(file.name)) return `${file.name}: upload a PDF, JPG or PNG`
  if (file.size > MAX_BYTES) return `${file.name}: files must be 10 MB or smaller`
  return null
}

/** A new upload, waiting for the officer to say what it is and whose it is. */
function newDocument(file: File): DocumentDraft {
  return { type: "other", fileName: file.name, sizeBytes: file.size, description: "", owner: null, bank: null }
}

/** Step 6: any documents, dropped or picked, each described and tied to the borrower or someone named. */
export function DocumentsStep() {
  const form = useFormContext<FormValues>()
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "documents" })
  const [problems, setProblems] = useState<string[]>([])
  const listError = form.formState.errors.documents?.message ?? form.formState.errors.documents?.root?.message
  const borrower = borrowerName(form.getValues())

  const addFiles = (files: File[]) => {
    const accepted: DocumentDraft[] = []
    const rejected: string[] = []
    for (const file of files) {
      const problem = fileProblem(file)
      if (problem) rejected.push(problem)
      else accepted.push(newDocument(file))
    }
    setProblems(rejected)
    if (accepted.length) append(accepted)
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
      {listError && <p className="text-sm text-destructive">{listError}</p>}

      {fields.length > 0 && (
        <ul className="space-y-3">
          {fields.map((field, i) => (
            <li key={field.id} className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <FileText className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{field.fileName}</div>
                  <div className="text-xs text-muted-foreground">{formatFileSize(field.sizeBytes)}</div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${field.fileName}`}
                  onClick={() => remove(i)}
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  name={`documents.${i}.description`}
                  label="What is it?"
                  placeholder="e.g. Payslips for July to September"
                />
                <Controller
                  control={form.control}
                  name={`documents.${i}.owner`}
                  render={({ field: owner, fieldState }) => (
                    <OwnerFields
                      label="Whose document?"
                      owner={owner.value}
                      borrowerName={borrower}
                      onChange={owner.onChange}
                      error={fieldState.error?.message}
                    />
                  )}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </FormCard>
  )
}
