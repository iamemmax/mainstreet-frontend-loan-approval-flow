import type { ReactNode } from "react"
import { PageHeader } from "@/components/shared/page-header"

/** Shared frame for administration screens. */
export function AdminPage({
  title,
  description,
  actions,
  children,
}: {
  title: string
  description: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Administration" title={title} description={description} actions={actions} />
      {children}
    </div>
  )
}
