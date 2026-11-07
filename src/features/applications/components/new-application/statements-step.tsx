"use client"

import { FileText, Landmark, Loader2, Trash2 } from "lucide-react"
import { useState } from "react"
import { useFormContext } from "react-hook-form"
import { ErrorState } from "@/components/shared/empty-state"
import { FileDropZone } from "@/components/shared/file-drop-zone"
import { MoneyText } from "@/components/shared/money-text"
import { Button } from "@/components/ui/button"
import { koboToNaira, nairaToKobo } from "@/lib/format/money"
import { useAnalyseStatements } from "../../hooks/use-applications"
import { MAX_STATEMENTS } from "../../schemas/business"
import type { StatementAnalysis, StatementUpload } from "../../types"
import { formatFileSize } from "../../utils/documents"
import { FormCard } from "./fields"
import type { FormValues } from "./schema"

const MAX_BYTES = 10 * 1_048_576

/** The business financials that statement analysis fills in. */
const FINANCIAL_FIELDS = ["monthlyRevenue", "monthlyExpenses", "annualTurnover", "primaryBank"] as const

/** A statement on the form, with the bank analysis read from it (null until it has). */
export type UploadedStatement = StatementUpload & { bank: string | null }

/** Problems with the statements step, keyed like the other steps' errors. */
export function statementsErrors(statements: UploadedStatement[], analysed: boolean) {
  const errors: Record<string, string> = {}
  if (!statements.length) errors["statements"] = "Upload at least one statement of account"
  else if (!analysed) errors["analysis"] = "Wait for the statements to be read, or fix the problem shown"
  return errors
}

/** Why a file can't be taken as a statement, or null if it's fine. */
function fileProblem(file: File): string | null {
  if (!/\.pdf$/i.test(file.name)) return `${file.name}: statements must be PDFs`
  if (file.size > MAX_BYTES) return `${file.name}: files must be 10 MB or smaller`
  return null
}

interface StatementsStepProps {
  statements: UploadedStatement[]
  onStatements: (statements: UploadedStatement[]) => void
  /** The last analysis, with each bank's flows. Null until it's run, and after any change to the statements. */
  analysis: StatementAnalysis | null
  onAnalysis: (analysis: StatementAnalysis | null) => void
  errors: Record<string, string>
  showErrors: boolean
}

/**
 * Step 3 for SME: up to six statements of account, one per bank. Each upload is read straight away for its
 * bank and flows, which fill in the business's monthly figures for the affordability preview.
 */
export function StatementsStep({
  statements,
  onStatements,
  analysis,
  onAnalysis,
  errors,
  showErrors,
}: StatementsStepProps) {
  const form = useFormContext<FormValues>()
  const analyse = useAnalyseStatements()
  const [problems, setProblems] = useState<string[]>([])
  const slotsLeft = MAX_STATEMENTS - statements.length
  const analysed = !!form.watch("monthlyRevenue")

  /** Reads the statements and fills in the bank of each one and the business's monthly figures. */
  const read = (next: UploadedStatement[]) => {
    if (!next.length) return
    analyse.mutate(
      {
        amountRequested: nairaToKobo(Number(form.getValues("amount") || 0)),
        tenorMonths: Number(form.getValues("tenor") || 1),
        statements: next.map(({ fileName, sizeBytes }) => ({ fileName, sizeBytes })),
      },
      {
        onSuccess: (result) => {
          onStatements(next.map((statement, i) => ({ ...statement, bank: result.banks[i]?.bank ?? null })))
          onAnalysis(result)
          form.setValue("monthlyRevenue", String(koboToNaira(result.monthlyRevenue)), { shouldValidate: true })
          form.setValue("monthlyExpenses", String(koboToNaira(result.monthlyExpenses)), { shouldValidate: true })
          form.setValue("annualTurnover", String(koboToNaira(result.annualTurnover)), { shouldValidate: true })
          form.setValue("primaryBank", result.primaryBank, { shouldValidate: true })
        },
      },
    )
  }

  /** Any change makes the last reading out of date, so the statements are read again. */
  const change = (next: UploadedStatement[]) => {
    onStatements(next)
    onAnalysis(null)
    for (const field of FINANCIAL_FIELDS) form.setValue(field, "")
    analyse.reset()
    read(next)
  }

  const addFiles = (files: File[]) => {
    const rejected: string[] = []
    const accepted: UploadedStatement[] = []
    for (const file of files) {
      const problem = fileProblem(file)
      if (problem) rejected.push(problem)
      else if (accepted.length < slotsLeft) accepted.push({ fileName: file.name, sizeBytes: file.size, bank: null })
      else rejected.push(`${file.name}: at most ${MAX_STATEMENTS} statements, one per bank`)
    }
    setProblems(rejected)
    if (accepted.length) change([...statements, ...accepted])
  }

  return (
    <FormCard
      title="Statements of account"
      description={`Upload the business's statements for the last 6 months: up to ${MAX_STATEMENTS}, one per bank. Each one is read for its bank and the money in and out.`}
      bodyClassName="space-y-4"
    >
      {slotsLeft > 0 && (
        <FileDropZone
          accept=".pdf"
          label="Drag and drop statements here, or click to choose"
          hint={`PDF · up to 10 MB each · ${slotsLeft} of ${MAX_STATEMENTS} left`}
          onFiles={addFiles}
          disabled={analyse.isPending}
        />
      )}
      {problems.map((problem) => (
        <p key={problem} className="text-sm text-destructive">
          {problem}
        </p>
      ))}
      {showErrors && errors["statements"] && <p className="text-sm text-destructive">{errors["statements"]}</p>}

      {statements.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {statements.map((statement, i) => (
            <li key={`${statement.fileName}-${i}`} className="flex items-center gap-3 px-4 py-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <FileText className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{statement.fileName}</div>
                <div className="text-xs text-muted-foreground">{formatFileSize(statement.sizeBytes)}</div>
              </div>
              <IssuingBank bank={statement.bank} reading={analyse.isPending} />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${statement.fileName}`}
                disabled={analyse.isPending}
                onClick={() => change(statements.filter((_, j) => j !== i))}
              >
                <Trash2 aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {analyse.error && (
        <ErrorState
          error={analyse.error}
          onRetry={() => read(statements)}
          title="Couldn't read the statements"
          size="sm"
        />
      )}
      {analysed && <AnalysisResult analysis={analysis} values={form.getValues()} />}
    </FormCard>
  )
}

/** The bank read from a statement, or a spinner while it's being read. */
function IssuingBank({ bank, reading }: { bank: string | null; reading: boolean }) {
  if (bank) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
        <Landmark className="size-3.5 text-muted-foreground" aria-hidden />
        {bank}
      </span>
    )
  }
  if (reading) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" aria-hidden /> Reading…
      </span>
    )
  }
  return null
}

/** The figures read from the statements: each bank's flows when just read, and the totals the loan is judged on. */
function AnalysisResult({ analysis, values }: { analysis: StatementAnalysis | null; values: FormValues }) {
  const totals = [
    { label: "Average monthly revenue", value: <MoneyText value={nairaToKobo(Number(values.monthlyRevenue))} /> },
    { label: "Average monthly expenses", value: <MoneyText value={nairaToKobo(Number(values.monthlyExpenses))} /> },
    { label: "Annual turnover", value: <MoneyText value={nairaToKobo(Number(values.annualTurnover))} /> },
    { label: "Primary bank", value: values.primaryBank },
  ]
  return (
    <div className="space-y-3 rounded-xl border border-success/30 bg-success/[0.04] p-4">
      <p className="text-sm font-semibold text-success">Statements read</p>
      {analysis && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="pb-1.5 font-medium">Bank</th>
              <th className="pb-1.5 text-right font-medium">In a month</th>
              <th className="pb-1.5 text-right font-medium">Out a month</th>
            </tr>
          </thead>
          <tbody>
            {analysis.banks.map((bank) => (
              <tr key={bank.fileName} className="border-t border-border/60">
                <td className="py-1.5">{bank.bank}</td>
                <td className="tabular py-1.5 text-right">
                  <MoneyText value={bank.monthlyInflow} />
                </td>
                <td className="tabular py-1.5 text-right">
                  <MoneyText value={bank.monthlyOutflow} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <dl className="grid gap-3 border-t border-border/60 pt-3 sm:grid-cols-2">
        {totals.map((total) => (
          <div key={total.label}>
            <dt className="text-xs text-muted-foreground">{total.label}</dt>
            <dd className="tabular font-semibold">{total.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
