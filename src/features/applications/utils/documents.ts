import type { ApplicationDocument } from "../types"

export type FileKind = "pdf" | "image" | "other"

const IMAGE = new Set(["jpg", "jpeg", "png", "webp", "gif", "svg", "heic"])

const extOf = (path: string) => path.split(/[?#]/)[0].split(".").pop()?.toLowerCase() ?? ""

/** How the viewer can show a file: read from its link if there is one, else its name. */
export function fileKind(doc: Pick<ApplicationDocument, "fileName" | "url">): FileKind {
  const ext = extOf(doc.url ?? doc.fileName)
  if (ext === "pdf") return "pdf"
  return IMAGE.has(ext) ? "image" : "other"
}

/** "PDF", "JPG"… for the small badge on a document tile. */
export function fileBadge(fileName: string) {
  return extOf(fileName).toUpperCase() || "FILE"
}

export function formatFileSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}
