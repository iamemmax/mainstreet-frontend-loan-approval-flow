/* eslint-disable @next/next/no-img-element -- identity photos are signed, short-lived URLs; next/image can't optimise them */
"use client"

import { CircleAlert, CircleCheck, Clock, ImageOff, Search, TriangleAlert, type LucideIcon } from "lucide-react"
import { useState } from "react"
import { formatDate } from "@/lib/format/date"
import { cn } from "@/lib/utils"
import type { Application } from "../../types"
import { DocumentViewer, type ViewerItem } from "../preview/document-viewer"

/** Below this similarity the selfie and BVN photo are treated as different people. */
export const FACE_MATCH_THRESHOLD = 60

type Tone = "success" | "warning" | "danger"

interface IdentityStatus {
  tone: Tone
  icon: LucideIcon
  text: string
}

/** One sentence on where the face check stands, for the banner. Null means nothing to flag. */
export function identityIssue(app: Application): IdentityStatus | null {
  const { selfieUrl, bvnPhotoUrl, faceMatch } = app.identity
  if (!selfieUrl) return { tone: "danger", icon: TriangleAlert, text: "No selfie was captured for this application" }
  if (!bvnPhotoUrl) return { tone: "warning", icon: CircleAlert, text: "No photo returned from the BVN record" }
  if (faceMatch === null) return { tone: "warning", icon: Clock, text: "Face match runs with the BVN check" }
  if (faceMatch < FACE_MATCH_THRESHOLD)
    return { tone: "danger", icon: TriangleAlert, text: `Selfie doesn't match the BVN photo · ${faceMatch}% match` }
  return null
}

const BANNER: Record<Tone, string> = {
  success: "bg-success/[0.08] text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/[0.07] text-destructive",
}

function Photo({ url, label, onOpen }: { url: string | null; label: string; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!url}
      aria-label={url ? `View ${label.toLowerCase()}` : `${label} not available`}
      className="group relative aspect-square overflow-hidden rounded-xl border border-border/80 bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default"
    >
      {url ? (
        <img
          src={url}
          alt=""
          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <span className="flex size-full flex-col items-center justify-center gap-1.5 text-muted-foreground">
          <ImageOff className="size-5" aria-hidden />
          <span className="text-xs">Not available</span>
        </span>
      )}
      <span className="absolute top-2 left-2 rounded-md bg-card/95 px-1.5 py-0.5 text-[11px] font-semibold shadow-xs">
        {label}
      </span>
      {url && (
        <span className="absolute inset-0 flex items-center justify-center bg-foreground/0 transition-colors group-hover:bg-foreground/10">
          <span className="flex size-8 scale-90 items-center justify-center rounded-full bg-card opacity-0 shadow-md transition-all group-hover:scale-100 group-hover:opacity-100">
            <Search className="size-4" aria-hidden />
          </span>
        </span>
      )}
    </button>
  )
}

/**
 * The selfie beside the BVN photo, with the face-match result. A problem shows as a
 * banner above the photos; the line below says what's on file.
 */
export function IdentityPhotos({ app, name }: { app: Application; name: string }) {
  const [viewing, setViewing] = useState<number | null>(null)
  const { selfieUrl, bvnPhotoUrl, selfieCapturedAt, faceMatch } = app.identity
  const issue = identityIssue(app)
  const who = app.applicant.kind === "business" ? "Promoter" : "Applicant"
  const items: ViewerItem[] = [
    {
      url: selfieUrl,
      title: "Selfie",
      subtitle: `${who} · captured during application${selfieCapturedAt ? ` · ${formatDate(selfieCapturedAt, "d MMM yyyy")}` : ""}`,
    },
    { url: bvnPhotoUrl, title: "BVN photo", subtitle: `${who} · from the BVN record` },
  ]
    .filter((i): i is { url: string; title: string; subtitle: string } => !!i.url)
    .map((i) => ({
      ...i,
      id: i.title,
      type: "id_card",
      name,
      group: "Identity",
      fileName: i.url.split("/").pop()!,
      kind: "image",
      badge: "PHOTO",
    }))
  const open = (title: string) => setViewing(items.findIndex((i) => i.title === title))
  const matched = faceMatch !== null && faceMatch >= FACE_MATCH_THRESHOLD

  return (
    <div className="space-y-3">
      {issue && (
        <p
          role="status"
          className={cn("flex items-start gap-2 rounded-xl px-3 py-2.5 text-[13px] font-medium", BANNER[issue.tone])}
        >
          <issue.icon className="mt-px size-4 shrink-0" aria-hidden />
          {issue.text}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2.5">
        <Photo url={selfieUrl} label="Selfie" onOpen={() => open("Selfie")} />
        <Photo url={bvnPhotoUrl} label="BVN photo" onOpen={() => open("BVN photo")} />
      </div>
      <p className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2.5 text-[13px] font-medium">
        {selfieUrl && bvnPhotoUrl ? (
          <CircleCheck
            className={cn("size-4 shrink-0", matched ? "text-success" : "text-muted-foreground")}
            aria-hidden
          />
        ) : (
          <CircleAlert className="size-4 shrink-0 text-warning" aria-hidden />
        )}
        <span className="flex-1">
          {selfieUrl && bvnPhotoUrl
            ? "Selfie and BVN photo on file"
            : selfieUrl
              ? "BVN photo missing"
              : "Selfie missing"}
        </span>
        {matched && (
          <span className="tabular rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
            {faceMatch}% match
          </span>
        )}
      </p>
      <DocumentViewer items={items} index={viewing} onIndexChange={setViewing} />
    </div>
  )
}
