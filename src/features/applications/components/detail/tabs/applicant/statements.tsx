"use client"

import { Eye, Landmark } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import type { Application } from "../../../../types"
import { DocumentViewer } from "../../../preview/document-viewer"
import { statementViewerItems } from "../../../preview/viewer-items"
import { Section } from "../../ui"

/** The statements of account, one per bank, kept apart from the other documents. Hidden when there are none. */
export function Statements({ app, name }: { app: Application; name: string }) {
  const [viewing, setViewing] = useState<number | null>(null)
  const items = statementViewerItems(app, name)
  if (items.length === 0) return null

  return (
    <Section title="Statements of account" description={items.length === 1 ? "1 bank" : `${items.length} banks`} flush>
      <ul className="divide-y">
        {items.map((item, i) => (
          <li key={item.id} className="flex items-center gap-4 px-6 py-3.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/[0.08] text-primary">
              <Landmark className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">{item.title}</div>
              <div className="truncate text-xs text-muted-foreground">{item.subtitle}</div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 rounded-lg bg-primary/[0.07] text-primary hover:bg-primary/[0.12] hover:text-primary"
              onClick={() => setViewing(i)}
            >
              <Eye aria-hidden /> View
            </Button>
          </li>
        ))}
      </ul>
      <DocumentViewer items={items} index={viewing} onIndexChange={setViewing} />
    </Section>
  )
}
