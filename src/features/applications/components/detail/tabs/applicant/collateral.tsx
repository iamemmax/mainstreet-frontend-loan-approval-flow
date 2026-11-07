"use client"

import { Images, ImageOff } from "lucide-react"
import { useState } from "react"
import { MoneyText } from "@/components/shared/money-text"
import { ToneBadge } from "@/components/shared/status-badge"
import { formatPercent } from "@/lib/format/money"
import { cn } from "@/lib/utils"
import type { Application } from "../../../../types"
import { DocumentThumb } from "../../../preview/document-thumb"
import { DocumentViewer } from "../../../preview/document-viewer"
import { collateralViewerItems } from "../../../preview/viewer-items"
import { Section } from "../../ui"

type CollateralItem = Application["collateral"][number]

/** The borrower's name, drawn on a collateral document that can't be shown. */
function borrowerName(app: Application): string {
  return app.applicant.kind === "business"
    ? app.applicant.businessName
    : `${app.applicant.firstName} ${app.applicant.lastName}`
}

/** What an item would fetch in a forced sale; the estimate stands in when no forced-sale value was given. */
function saleValue(item: CollateralItem): number {
  return item.forcedSaleValue ?? item.estimatedValue
}

/** Every pledged asset as its own card with its photo and values, then how well they cover the loan together. */
export function Collateral({ app }: { app: Application }) {
  const items = app.collateral
  const totalSaleValue = items.reduce((total, item) => total + saleValue(item), 0)
  const cover = totalSaleValue / app.amountRequested
  const covered = cover >= 1

  if (items.length === 0) {
    return (
      <Section title="Collateral" description="No collateral pledged">
        <p className="text-sm text-muted-foreground">
          SME loans are usually secured. Ask the relationship officer to record any collateral.
        </p>
      </Section>
    )
  }

  return (
    <Section
      title="Collateral"
      description={`${items.length === 1 ? "1 item" : `${items.length} items`} · forced-sale value covers ${formatPercent(cover, 0)} of the loan`}
      action={
        <ToneBadge tone={covered ? "success" : "warning"}>{covered ? "Fully covered" : "Partly covered"}</ToneBadge>
      }
    >
      <div className="space-y-4">
        <ul className="grid gap-4 @2xl:grid-cols-2">
          {items.map((item, i) => (
            <CollateralCard key={i} item={item} number={i + 1} name={borrowerName(app)} />
          ))}
        </ul>
        <div className="space-y-2 rounded-xl border border-border/80 p-4">
          <div className="flex justify-between text-[13px]">
            <span className="text-muted-foreground">Cover against the loan</span>
            <span className="tabular font-semibold">{formatPercent(cover, 0)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full", covered ? "bg-success" : "bg-warning")}
              style={{ width: `${Math.min(cover, 1) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              Forced-sale value <MoneyText value={totalSaleValue} className="font-medium text-foreground" />
            </span>
            <span>
              Loan <MoneyText value={app.amountRequested} className="font-medium text-foreground" />
            </span>
          </div>
        </div>
      </div>
    </Section>
  )
}

/** "Prime Pharma Ltd · Borrower" or "Ada Obi · Third party"; a dash when no owner was recorded. */
function ownerLine(owner: CollateralItem["owner"]): string {
  if (!owner) return "—"
  return `${owner.name} · ${owner.role === "borrower" ? "Borrower" : "Third party"}`
}

function CollateralCard({ item, number, name }: { item: CollateralItem; number: number; name: string }) {
  const [viewing, setViewing] = useState<number | null>(null)
  const items = collateralViewerItems(item, name)
  const figures: [string, number | null][] = [
    ["Estimated value", item.estimatedValue],
    ["Forced-sale value", item.forcedSaleValue],
  ]
  return (
    <li className="overflow-hidden rounded-xl border border-border/80">
      {items.length > 0 ? (
        <button
          type="button"
          onClick={() => setViewing(0)}
          aria-label={`Open the photos and documents for ${item.type}`}
          className="relative block w-full"
        >
          <DocumentThumb item={items[0]} showBadge={false} className="aspect-[16/10] w-full" />
          <span className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-full bg-card/90 px-2 py-0.5 text-xs font-medium shadow">
            <Images className="size-3.5" aria-hidden />
            {items.length === 1 ? "1 file" : `${items.length} files`}
          </span>
        </button>
      ) : (
        <div className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-1.5 bg-muted text-muted-foreground">
          <ImageOff className="size-5" aria-hidden />
          <span className="text-xs">No photos or documents</span>
        </div>
      )}
      <div className="space-y-3 p-4">
        <div>
          <div className="text-xs text-muted-foreground">Item {number}</div>
          <div className="font-semibold">{item.type}</div>
          <p className="text-sm text-muted-foreground">{item.description}</p>
          <p className="mt-1 text-sm">
            <span className="text-muted-foreground">Owner:</span> {ownerLine(item.owner)}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-3 border-t pt-3">
          {figures.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="tabular text-sm font-semibold">
                {value === null ? "Not given" : <MoneyText value={value} />}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <DocumentViewer items={items} index={viewing} onIndexChange={setViewing} />
    </li>
  )
}
