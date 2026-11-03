"use client"

import type { UseFormReturn } from "react-hook-form"
import { Info } from "lucide-react"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { DECISION_REASONS } from "@/features/workflow/engine/reasons"
import type { DecisionAction, DecisionInput } from "@/features/workflow/types"
import { cn } from "@/lib/utils"
import { actionHint, type CommitteeRule } from "./copy"

const HINT_TONE: Record<DecisionAction, string> = {
  approve: "bg-success/[0.07] text-success",
  reject: "bg-destructive/[0.06] text-destructive",
  return: "bg-warning/10 text-warning",
  escalate: "bg-primary/[0.06] text-primary",
  request_info: "bg-warning/10 text-warning",
}

interface DetailsStepProps {
  form: UseFormReturn<DecisionInput>
  action: DecisionAction
  committee?: CommitteeRule | null
}

/** Step 1: what this decision does, why, and a comment for the audit trail. */
export function DetailsStep({ form, action, committee }: DetailsStepProps) {
  const comment = form.watch("comment")

  return (
    <>
      <p
        className={cn("flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-[13px] leading-relaxed", HINT_TONE[action])}
      >
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        {actionHint(action, committee)}
      </p>
      <FormField
        control={form.control}
        name="reasonCode"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Reason</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {DECISION_REASONS[action].map((r) => (
                  <SelectItem key={r.code} value={r.code}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="comment"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-baseline justify-between">
              <FormLabel>Comment</FormLabel>
              <span className="tabular text-xs text-muted-foreground">{comment.trim().length}/2000</span>
            </div>
            <FormControl>
              <Textarea rows={4} placeholder="Explain the decision. This is visible in the audit trail." {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  )
}
