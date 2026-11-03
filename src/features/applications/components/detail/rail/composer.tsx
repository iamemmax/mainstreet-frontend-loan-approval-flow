"use client"

import { Loader2, SendHorizontal } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useSendMessage } from "../../../hooks/use-applications"

const MAX = 2000

/** Enter sends, Shift+Enter adds a line. */
export function Composer({ applicationId, onSent }: { applicationId: string; onSent: () => void }) {
  const [body, setBody] = useState("")
  const send = useSendMessage(applicationId)
  const text = body.trim()

  const submit = () => {
    if (!text || send.isPending) return
    send.mutate(text, {
      onSuccess: () => {
        setBody("")
        onSent()
      },
    })
  }

  return (
    <form
      className="border-t bg-card px-4 py-3"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <div className="flex items-end gap-2 rounded-xl border bg-background p-1.5 shadow-xs transition-colors focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, MAX))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              submit()
            }
          }}
          rows={1}
          aria-label="Message the team"
          placeholder="Message the team…"
          className="field-sizing-content max-h-32 min-h-8 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
        />
        <Button
          type="submit"
          size="icon"
          className="size-8 shrink-0 rounded-lg"
          disabled={!text || send.isPending}
          aria-label="Send message"
        >
          {send.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <SendHorizontal aria-hidden />}
        </Button>
      </div>
      <p className="mt-1.5 px-1 text-[11px] text-muted-foreground">Enter to send · Shift + Enter for a new line</p>
    </form>
  )
}
