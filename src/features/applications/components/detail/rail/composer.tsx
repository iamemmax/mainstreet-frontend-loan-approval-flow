"use client"

import { Loader2 } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useSendMessage } from "../../../hooks/use-applications"

const MAX = 2000

/** The box for a new comment. Comments are posted with the button, not Enter, so they can run to several lines. */
export function Composer({ applicationId, onSent }: { applicationId: string; onSent: () => void }) {
  const [body, setBody] = useState("")
  const send = useSendMessage(applicationId)
  const text = body.trim()

  return (
    <form
      className="space-y-2 border-t bg-card px-4 py-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (!text || send.isPending) return
        send.mutate(text, {
          onSuccess: () => {
            setBody("")
            onSent()
          },
        })
      }}
    >
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, MAX))}
        rows={2}
        aria-label="Add a comment"
        placeholder="Add a comment…"
        className="field-sizing-content max-h-32 min-h-16 w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10"
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={!text || send.isPending}>
          {send.isPending && <Loader2 className="animate-spin" aria-hidden />}
          Comment
        </Button>
      </div>
    </form>
  )
}
