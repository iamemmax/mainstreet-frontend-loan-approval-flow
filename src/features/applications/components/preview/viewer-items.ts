import { formatDate } from "@/lib/format/date"
import { DOCUMENT_TYPE_LABELS } from "../../schemas/application"
import type { Application } from "../../types"
import { fileBadge, fileKind, formatFileSize, type FileKind } from "../../utils/documents"

export interface ViewerItem {
  id: string
  type: Application["documents"][number]["type"]
  title: string
  subtitle: string
  /** Name drawn on the fallback preview, e.g. the applicant on an ID card. */
  name: string
  group: string
  url: string | null
  fileName: string
  kind: FileKind
  badge: string
}

/** The application's documents in viewer order: the applicant's first, then the guarantors' forms. */
export function documentViewerItems(app: Application, name: string): ViewerItem[] {
  return [...app.documents]
    .sort((a, b) => Number(a.type === "guarantor_form") - Number(b.type === "guarantor_form"))
    .map((d) => {
      const guarantor = d.type === "guarantor_form"
      return {
        id: d.id,
        type: d.type,
        title: DOCUMENT_TYPE_LABELS[d.type],
        subtitle: `${guarantor ? "Guarantor" : "Applicant"} · ${d.fileName} · ${formatFileSize(d.sizeBytes)} · uploaded ${formatDate(d.uploadedAt, "d MMM yyyy")}`,
        name,
        group: guarantor ? "Guarantors" : "Applicant",
        url: d.url,
        fileName: d.fileName,
        kind: fileKind(d),
        badge: fileBadge(d.fileName),
      }
    })
}
