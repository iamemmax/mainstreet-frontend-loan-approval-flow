import { SearchX } from "lucide-react"
import Link from "next/link"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <EmptyState
        icon={<SearchX aria-hidden />}
        title="Page not found"
        description="The page you're looking for doesn't exist or has moved."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/">Go to home</Link>
          </Button>
        }
      />
    </div>
  )
}
