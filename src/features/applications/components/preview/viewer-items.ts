import { formatDate } from "@/lib/format/date"
import { DOCUMENT_TYPE_LABELS } from "../../schemas/application"
import type { Application, Collateral } from "../../types"
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

/** Whose document it is, for the viewer's subtitle: "Ada Obi · Third party". */
function ownerLine(doc: Application["documents"][number]): string {
  if (!doc.owner) return "Borrower"
  return `${doc.owner.name} · ${doc.owner.role === "other" ? "Third party" : "Borrower"}`
}

/** A statement of account, shown in its own section rather than with the other documents. */
export function isStatement(doc: Application["documents"][number]): boolean {
  return doc.type === "bank_statement"
}

/** The application's documents in viewer order, statements left out: the borrower's first, then everyone else's. */
export function documentViewerItems(app: Application, name: string): ViewerItem[] {
  return app.documents
    .filter((doc) => !isStatement(doc))
    .sort((a, b) => Number(a.owner?.role === "other") - Number(b.owner?.role === "other"))
    .map((d) => {
      const someoneElse = d.owner?.role === "other"
      return {
        id: d.id,
        type: d.type,
        title: d.description ?? DOCUMENT_TYPE_LABELS[d.type],
        subtitle: `${ownerLine(d)} · ${d.fileName} · ${formatFileSize(d.sizeBytes)} · uploaded ${formatDate(d.uploadedAt, "d MMM yyyy")}`,
        name,
        group: someoneElse ? "Others" : "Borrower",
        url: d.url,
        fileName: d.fileName,
        kind: fileKind(d),
        badge: fileBadge(d.fileName),
      }
    })
}

/** The statements of account, one per bank, for their own section and viewer. */
export function statementViewerItems(app: Application, name: string): ViewerItem[] {
  return app.documents.filter(isStatement).map((d) => ({
    id: d.id,
    type: d.type,
    title: d.bank ? `${d.bank} statement of account` : (d.description ?? "Statement of account"),
    subtitle: `${d.fileName} · ${formatFileSize(d.sizeBytes)} · uploaded ${formatDate(d.uploadedAt, "d MMM yyyy")}`,
    name,
    group: "Statements",
    url: d.url,
    fileName: d.fileName,
    kind: fileKind(d),
    badge: fileBadge(d.fileName),
  }))
}

/** One collateral item's photos and documents, for the viewer. */
export function collateralViewerItems(item: Collateral, name: string): ViewerItem[] {
  const owner = item.owner ? ` · ${item.owner.name}` : ""
  return item.files.map((file, i) => ({
    id: `${item.type}-${i}`,
    type: "collateral",
    title: item.type || "Collateral",
    subtitle: `${item.description || "Collateral"}${owner} · ${file.fileName}`,
    name,
    group: "Collateral",
    url: file.url,
    fileName: file.fileName,
    kind: fileKind(file),
    badge: fileBadge(file.fileName),
  }))
}
