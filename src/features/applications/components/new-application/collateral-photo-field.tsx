"use client"

import { ImagePlus, Trash2 } from "lucide-react"
import { useId, useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const ACCEPT = ["image/jpeg", "image/png", "image/webp"]
const MAX_BYTES = 2 * 1024 * 1024

/** Reads a picked image as a data URL so it can be shown before the application is saved. */
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/** A photo of one collateral item: pick, preview, or remove it. */
export function CollateralPhotoField({
  photoUrl,
  onChange,
  className,
}: {
  photoUrl: string | null
  onChange: (photoUrl: string | null) => void
  className?: string
}) {
  const id = useId()
  const [error, setError] = useState<string | null>(null)

  const pick = async (file: File | undefined) => {
    if (!file) return
    if (!ACCEPT.includes(file.type)) return setError("JPG, PNG or WebP only")
    if (file.size > MAX_BYTES) return setError("Up to 2 MB")
    setError(null)
    onChange(await readAsDataUrl(file))
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>Photo (optional)</Label>
      <div className="flex items-center gap-3">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URLs and local samples, not optimisable
          <img src={photoUrl} alt="Collateral photo" className="h-16 w-24 rounded-md border object-cover" />
        ) : (
          <span className="flex h-16 w-24 items-center justify-center rounded-md border border-dashed text-muted-foreground">
            <ImagePlus className="size-5" aria-hidden />
          </span>
        )}
        <Button type="button" variant="outline" size="sm" asChild>
          <label htmlFor={id} className="cursor-pointer">
            {photoUrl ? "Replace photo" : "Add photo"}
          </label>
        </Button>
        {photoUrl && (
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove photo" onClick={() => onChange(null)}>
            <Trash2 aria-hidden />
          </Button>
        )}
        <input
          id={id}
          type="file"
          accept={ACCEPT.join(",")}
          className="sr-only"
          onChange={(e) => {
            void pick(e.target.files?.[0])
            e.target.value = ""
          }}
        />
      </div>
      {error && <p className="text-[13px] text-destructive">{error}</p>}
    </div>
  )
}
