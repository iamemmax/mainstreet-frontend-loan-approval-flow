/* eslint-disable @next/next/no-img-element -- document links are signed, short-lived URLs; next/image can't optimise them */
import { cn } from "@/lib/utils"
import { DocumentArt } from "./document-art"
import type { ViewerItem } from "./viewer-items"

const BADGE: Record<ViewerItem["kind"], string> = {
  pdf: "bg-destructive text-white",
  image: "bg-info text-white",
  other: "bg-muted-foreground text-white",
}

/** A document tile: the real image when it is one, otherwise a drawing of the document type, plus a file-type badge. */
export function DocumentThumb({
  item,
  className,
  showBadge = true,
}: {
  item: ViewerItem
  className?: string
  showBadge?: boolean
}) {
  return (
    <span className={cn("relative block overflow-hidden", className)}>
      {item.kind === "image" && item.url ? (
        <img src={item.url} alt="" className="size-full bg-muted object-cover" loading="lazy" />
      ) : (
        <DocumentArt type={item.type} name={item.name} className="size-full" />
      )}
      {showBadge && (
        <span
          className={cn(
            "absolute top-1 right-1 rounded px-1 py-px text-[9px] leading-tight font-bold tracking-wide",
            BADGE[item.kind],
          )}
        >
          {item.badge}
        </span>
      )}
    </span>
  )
}
