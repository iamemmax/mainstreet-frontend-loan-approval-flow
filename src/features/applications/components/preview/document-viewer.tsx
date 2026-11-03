/* eslint-disable @next/next/no-img-element -- document links are signed, short-lived URLs; next/image can't optimise them */
"use client"

import { ChevronLeft, ChevronRight, Download, FileWarning, X } from "lucide-react"
import { useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { DocumentArt } from "./document-art"
import { DocumentThumb } from "./document-thumb"
import { PdfPages } from "./pdf-pages"
import type { ViewerItem } from "./viewer-items"

export type { ViewerItem }

interface DocumentViewerProps {
  items: ViewerItem[]
  index: number | null
  onIndexChange: (index: number | null) => void
}

const ICON_BUTTON =
  "flex size-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"

/** What the stage shows: the PDF itself, the image itself, or a note that this file can't be previewed. */
function Stage({ item }: { item: ViewerItem }) {
  if (item.url && item.kind === "pdf") {
    // Drawn in the page with pdf.js, so it works the same in every browser and never leaves the viewer.
    return (
      <PdfPages
        key={item.id}
        url={item.url}
        fallback={
          <div className="flex flex-col items-center gap-4 text-center">
            <DocumentArt
              type={item.type}
              name={item.name}
              className="h-44 w-auto overflow-hidden rounded-xl opacity-60"
            />
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2 font-semibold">
                <FileWarning className="size-4" aria-hidden /> This PDF couldn&apos;t be opened
              </div>
              <p className="text-sm text-white/60">
                It may be damaged or protected. Download it to try on your computer.
              </p>
            </div>
          </div>
        }
      />
    )
  }
  if (item.url && item.kind === "image") {
    return (
      <img
        key={item.id}
        src={item.url}
        alt={item.title}
        className="max-h-full max-w-full rounded-xl object-contain shadow-2xl duration-300 animate-in fade-in zoom-in-95"
      />
    )
  }
  return (
    <div key={item.id} className="flex flex-col items-center gap-5 text-center duration-300 animate-in fade-in">
      <DocumentArt
        type={item.type}
        name={item.name}
        className="h-56 w-auto overflow-hidden rounded-xl opacity-60 shadow-2xl"
      />
      <div className="space-y-1">
        <div className="flex items-center justify-center gap-2 font-semibold">
          <FileWarning className="size-4" aria-hidden />{" "}
          {item.url ? "This file type can't be previewed" : "File not available to preview"}
        </div>
        <p className="text-sm text-white/60">
          {item.url
            ? "Download it to open it on your computer."
            : "It was recorded at intake but hasn't been stored for viewing yet."}
        </p>
      </div>
    </div>
  )
}

/** Full-screen viewer: one document large, arrows and keys to move, thumbnails grouped by whose it is. */
export function DocumentViewer({ items, index, onIndexChange }: DocumentViewerProps) {
  const open = index !== null
  const current = index !== null ? items[index] : null
  const go = (delta: number) => index !== null && onIndexChange((index + delta + items.length) % items.length)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1)
      if (e.key === "ArrowLeft") go(-1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  const groups = [...new Set(items.map((i) => i.group))]

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onIndexChange(null)}>
      <DialogContent
        showCloseButton={false}
        className="flex h-svh w-screen max-w-none flex-col gap-0 rounded-none border-0 bg-sidebar/95 p-0 text-white backdrop-blur-sm sm:max-w-none"
      >
        {current && (
          <>
            <div className="flex shrink-0 items-start justify-between gap-4 px-6 pt-5">
              <div className="min-w-0">
                <DialogTitle className="flex items-center gap-2 text-[15px] font-semibold text-white">
                  {current.title}
                  <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white/70">
                    {current.badge}
                  </span>
                </DialogTitle>
                <DialogDescription className="truncate text-[13px] text-white/60">{current.subtitle}</DialogDescription>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="tabular mr-1 text-[13px] text-white/60">
                  {index! + 1} / {items.length}
                </span>
                {current.url && (
                  <a
                    href={current.url}
                    download={current.fileName}
                    aria-label={`Download ${current.fileName}`}
                    title="Download"
                    className={ICON_BUTTON}
                  >
                    <Download className="size-4" aria-hidden />
                  </a>
                )}
                <button type="button" onClick={() => onIndexChange(null)} aria-label="Close" className={ICON_BUTTON}>
                  <X className="size-4" aria-hidden />
                </button>
              </div>
            </div>

            <div className="relative flex min-h-0 flex-1 items-center justify-center px-20 py-5">
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label="Previous document"
                  className={cn(ICON_BUTTON, "absolute left-5 size-11")}
                >
                  <ChevronLeft className="size-5" aria-hidden />
                </button>
              )}
              <Stage item={current} />
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label="Next document"
                  className={cn(ICON_BUTTON, "absolute right-5 size-11")}
                >
                  <ChevronRight className="size-5" aria-hidden />
                </button>
              )}
            </div>

            <div className="flex shrink-0 gap-8 overflow-x-auto border-t border-white/10 px-6 py-4">
              {groups.map((g) => (
                <div key={g} className="shrink-0 space-y-2">
                  <div className="text-[11px] font-semibold tracking-[0.08em] text-white/50 uppercase">{g}</div>
                  <div className="flex gap-2">
                    {items.map((it, i) =>
                      it.group === g ? (
                        <button
                          key={it.id}
                          type="button"
                          onClick={() => onIndexChange(i)}
                          aria-label={it.title}
                          aria-current={i === index}
                          className={cn(
                            "overflow-hidden rounded-lg ring-2 transition-all",
                            i === index ? "ring-brand-accent" : "opacity-60 ring-transparent hover:opacity-100",
                          )}
                        >
                          <DocumentThumb item={it} className="h-12 w-16" />
                        </button>
                      ) : null,
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
