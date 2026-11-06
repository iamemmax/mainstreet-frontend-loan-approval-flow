"use client"

import { ImageOff } from "lucide-react"
import { MoneyText } from "@/components/shared/money-text"
import { ToneBadge } from "@/components/shared/status-badge"
import { formatPercent } from "@/lib/format/money"
import { cn } from "@/lib/utils"
import type { Application } from "../../../../types"
import { Section } from "../../ui"

type CollateralItem = Application["collateral"][number]

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
            <CollateralCard key={i} item={item} number={i + 1} />
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

function CollateralCard({ item, number }: { item: CollateralItem; number: number }) {
  const figures: [string, number | null][] = [
    ["Estimated value", item.estimatedValue],
    ["Forced-sale value", item.forcedSaleValue],
  ]
  return (
    <li className="overflow-hidden rounded-xl border border-border/80">
      {item.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- local samples and data URLs; next/image can't optimise them
        <img
          src={item.photoUrl}
          alt={`${item.type}: ${item.description}`}
          className="aspect-[16/10] w-full object-cover"
        />
      ) : (
        <div className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-1.5 bg-muted text-muted-foreground">
          <ImageOff className="size-5" aria-hidden />
          <span className="text-xs">No photo</span>
        </div>
      )}
      <div className="space-y-3 p-4">
        <div>
          <div className="text-xs text-muted-foreground">Item {number}</div>
          <div className="font-semibold">{item.type}</div>
          <p className="text-sm text-muted-foreground">{item.description}</p>
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
    </li>
  )
}
