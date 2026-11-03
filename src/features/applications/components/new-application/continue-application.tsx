"use client"

import Link from "next/link"
import { EmptyState, ErrorState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useApplication } from "../../hooks/use-applications"
import { useIsOnDesk } from "../../hooks/use-is-on-desk"
import type { Application } from "../../types"
import { NewApplicationForm } from "./new-application-form"

/** Opens a saved draft in the intake form so its officer can finish and submit it. */
export function ContinueApplication({ id }: { id: string }) {
  const { data: app, isPending, error, refetch } = useApplication(id)

  if (error) {
    return (
      <Card>
        <ErrorState error={error} onRetry={() => refetch()} title="Couldn't open this draft" />
      </Card>
    )
  }
  if (isPending) return <Skeleton className="h-[32rem] w-full rounded-2xl" />
  return <DraftForm app={app} />
}

/** The form, or why this application can't be edited here. */
function DraftForm({ app }: { app: Application }) {
  const onDesk = useIsOnDesk(app)
  if (app.status === "draft" && onDesk) return <NewApplicationForm draft={app} />

  const submitted = app.status !== "draft"
  return (
    <Card>
      <EmptyState
        title={submitted ? "This application has already been submitted" : "This draft belongs to another officer"}
        description={
          submitted
            ? "It's no longer a draft, so it can't be edited here."
            : "Only the relationship officer who started it can finish it."
        }
        action={
          <Button variant="outline" asChild>
            <Link href={`/applications/${app.id}`}>Open the application</Link>
          </Button>
        }
      />
    </Card>
  )
}
