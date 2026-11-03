"use client"

import { Loader2, Minus, Plus, Scan } from "lucide-react"
import type { PDFDocumentProxy } from "pdfjs-dist"
import { useEffect, useRef, useState } from "react"

const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const
/** Widest a page is drawn at 100%, so text stays a comfortable reading size on big screens. */
const MAX_PAGE_WIDTH = 880

type LoadState = { status: "loading" } | { status: "ready"; doc: PDFDocumentProxy } | { status: "error" }

/** Loads pdf.js only when a PDF is opened; its worker parses the file off the main thread. */
async function openPdf(url: string) {
  const pdfjs = await import("pdfjs-dist")
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString()
  return pdfjs.getDocument(url).promise
}

function PdfPage({ doc, number, width }: { doc: PDFDocumentProxy; number: number; width: number }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [height, setHeight] = useState(width * 1.414)

  useEffect(() => {
    let cancelled = false
    let task: { cancel: () => void } | null = null
    void doc.getPage(number).then((page) => {
      if (cancelled || !canvas.current) return
      const base = page.getViewport({ scale: 1 })
      const scale = width / base.width
      const ratio = window.devicePixelRatio || 1
      const viewport = page.getViewport({ scale: scale * ratio })
      const el = canvas.current
      el.width = viewport.width
      el.height = viewport.height
      setHeight(viewport.height / ratio)
      const render = page.render({ canvasContext: el.getContext("2d")!, viewport })
      task = render
      render.promise.catch(() => {})
    })
    return () => {
      cancelled = true
      task?.cancel()
    }
  }, [doc, number, width])

  return (
    <canvas
      ref={canvas}
      aria-label={`Page ${number}`}
      className="block rounded-md bg-white shadow-xl"
      style={{ width, height }}
    />
  )
}

/**
 * Every page of a PDF drawn inside the viewer, scrolling top to bottom, with zoom.
 * `fallback` shows if the file can't be read.
 */
export function PdfPages({ url, fallback }: { url: string; fallback: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<LoadState>({ status: "loading" })
  const [boxWidth, setBoxWidth] = useState(0)
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    let alive = true
    let loaded: PDFDocumentProxy | null = null
    setState({ status: "loading" })
    openPdf(url).then(
      (doc) => {
        loaded = doc
        if (alive) setState({ status: "ready", doc })
        else void doc.destroy()
      },
      () => alive && setState({ status: "error" }),
    )
    return () => {
      alive = false
      void loaded?.destroy()
    }
  }, [url])

  useEffect(() => {
    if (!box.current) return
    const observer = new ResizeObserver(([entry]) => setBoxWidth(entry.contentRect.width))
    observer.observe(box.current)
    return () => observer.disconnect()
  }, [])

  if (state.status === "error") return <>{fallback}</>

  const pageWidth = Math.max(240, Math.min(boxWidth - 32, MAX_PAGE_WIDTH)) * zoom
  const step = (dir: 1 | -1) =>
    setZoom((z) => ZOOMS[Math.min(ZOOMS.length - 1, Math.max(0, ZOOMS.indexOf(z as (typeof ZOOMS)[number]) + dir))])

  return (
    <div className="relative flex size-full max-w-6xl flex-col">
      <div ref={box} className="min-h-0 flex-1 overflow-auto rounded-xl bg-black/20 [scrollbar-width:thin]">
        {state.status === "loading" ? (
          <div className="flex size-full items-center justify-center gap-2 text-sm text-white/70">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Opening document…
          </div>
        ) : (
          <div className="flex w-max min-w-full flex-col items-center gap-4 p-4">
            {Array.from({ length: state.doc.numPages }, (_, i) => (
              <PdfPage key={i} doc={state.doc} number={i + 1} width={pageWidth} />
            ))}
          </div>
        )}
      </div>

      {state.status === "ready" && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-sidebar/90 p-1 text-white shadow-lg ring-1 ring-white/10 backdrop-blur">
          <span className="tabular px-3 text-xs text-white/70">
            {state.doc.numPages} page{state.doc.numPages === 1 ? "" : "s"}
          </span>
          <span aria-hidden className="h-4 w-px bg-white/15" />
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={zoom === ZOOMS[0]}
            aria-label="Zoom out"
            className="flex size-8 items-center justify-center rounded-full hover:bg-white/10 disabled:opacity-40"
          >
            <Minus className="size-4" aria-hidden />
          </button>
          <span className="tabular w-12 text-center text-xs font-medium">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            onClick={() => step(1)}
            disabled={zoom === ZOOMS.at(-1)}
            aria-label="Zoom in"
            className="flex size-8 items-center justify-center rounded-full hover:bg-white/10 disabled:opacity-40"
          >
            <Plus className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            aria-label="Fit to width"
            title="Fit to width"
            className="flex size-8 items-center justify-center rounded-full hover:bg-white/10"
          >
            <Scan className="size-4" aria-hidden />
          </button>
        </div>
      )}
    </div>
  )
}
